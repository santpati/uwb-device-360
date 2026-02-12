
// This script runs independently to process Firehose events
import { spawn } from 'child_process';
import { getCiscoDB, upsertDevice, incrementStat } from '../src/lib/ciscolive_db';
// Global fetch is available in Node 18+

// Specific API Key for CiscoLive Page
const FIREHOSE_API_KEY = "B3DB01B8C4B64856BE66CB862FF84F57";

// We don't need initial device fetch loop in worker anymore,
// as the frontend sends device info via /api/ciscolive/data POST syncDevices.

function startFirehose() {
    console.log("Starting Firehose Stream with GREP filter...");
    console.log(`Command: curl ... | grep -i "IOT_UWB_TAG"`);

    // 1. Spawn GREP first
    const grep = spawn('grep', ['--line-buffered', '-i', 'IOT_UWB_TAG'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // 2. Spawn CURL and pipe to GREP
    const curl = spawn('/usr/bin/curl', [
        '-v', // verbose to debug connection
        '-N', // no buffer
        'https://partners.dnaspaces.io/api/partners/v1/firehose/events',
        '-H', `X-API-Key: ${FIREHOSE_API_KEY}`
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    // Pipe CURL -> GREP
    curl.stdout.pipe(grep.stdin);

    // Error handling
    curl.on('error', (err) => console.error('CURL SPAWN ERROR:', err));
    grep.on('error', (err) => console.error('GREP SPAWN ERROR:', err));

    curl.stderr.on('data', (data) => {
        const msg = data.toString();
        // Log connection details for debug, but ignore standard progress
        if (msg.includes('*') || msg.includes('Error') || msg.includes('fail')) {
            console.log(`CURL DEBUG: ${msg.trim()}`);
        }
    });

    grep.stderr.on('data', (data) => {
        console.error(`GREP STDERR: ${data.toString()}`);
    });

    // Process GREP Output (Filtered Events)
    let buffer = '';
    grep.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
            if (!line.trim()) return;

            // Firehose usually sends "data: {...}"
            // Grep output will preserve this.

            try {
                let jsonStr = line;
                if (line.startsWith('data: ')) {
                    jsonStr = line.replace('data: ', '');
                }

                // Determine if it's JSON
                if (jsonStr.startsWith('{')) {
                    const event = JSON.parse(jsonStr);
                    processEvent(event);
                }
            } catch (e) {
                // console.error("JSON PARSE ERROR:", e);
            }
        });
    });

    // Restart logic
    curl.on('close', (code) => {
        console.log(`CURL exited with code ${code}. Restarting in 5s...`);
        // Kill grep if curl dies to clean up
        grep.kill();
        setTimeout(startFirehose, 5000);
    });
}

function processEvent(event: any) {
    if (!event) return;

    // We only care about IOT_UWB_TAG because grep filtered for it.
    // However, grep -i "IOT_UWB_TAG" might catch "deviceType":"IOT_UWB_TAG" inside an IOT_TELEMETRY event.
    // So we must handle IOT_TELEMETRY structure too.

    let telemetry = event.iotTelemetry;
    if (event.eventType === 'IOT_TELEMETRY') {
        // Should allow it if grep let it through
        const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
        telemetry = details?.iotTelemetry || event.iotTelemetry;
    } else if (event.eventType === 'IOT_UWB_TAG') {
        // Direct event
        telemetry = event.iotTelemetry;
    }

    if (!telemetry) return;

    const mac = telemetry.deviceMacAddress || telemetry.deviceMac;
    if (!mac) return;

    console.log(`[Event] Processing ${mac} (${event.eventType})`);

    // 1. Update Device Metadata (Last Seen, Battery, etc)
    const update: any = {
        mac,
        lastSeen: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
        status: 'Active'
    };

    if (telemetry.batteryLevel !== undefined) update.battery = telemetry.batteryLevel;

    // We strictly use upsertDevice to keep existing user data (name, layout) safe
    upsertDevice(update);


    // 2. Update Stats (UWB vs BLE)
    const detectedPos = telemetry.detectedPosition;
    const precisePos = telemetry.precisePosition;

    // Helper from SignalChart: "isStrictTDOA"
    const isStrictTDOA = (pos: any) => {
        if (!pos) return false;
        const isTdoa = pos.computeType === 'CT_TDOA' || pos.computeType === 'TDoA';
        const hasCoords = (pos.xPos !== 0 || pos.yPos !== 0);
        return isTdoa && hasCoords;
    };

    let type: 'UWB' | 'BLE' = 'BLE';

    // Check if EITHER detected or precise is valid TDoA UWB
    if (isStrictTDOA(detectedPos) || isStrictTDOA(precisePos)) {
        type = 'UWB';
    }

    incrementStat(mac, type, event.timestamp);
}

// Global Error Handlers
process.on('uncaughtException', (err) => console.error('UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', (reason) => console.error('UNHANDLED REJECTION:', reason));

// Start
startFirehose();
