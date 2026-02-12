
// This script runs independently to process Firehose events
import { spawn } from 'child_process';
import { getCiscoDB, upsertDevice, incrementStat } from '../src/lib/ciscolive_db';

// Specific API Key for CiscoLive Page
const FIREHOSE_API_KEY = "B3DB01B8C4B64856BE66CB862FF84F57";

function startFirehose() {
    console.log("Starting Firehose Stream with SHELL PIPELINE...");

    // Construct the exact command that verified working manually
    // Note: We use -s but also -v to capture debug info to stderr which we process below
    const cmd = `/usr/bin/curl -v -N -s "https://partners.dnaspaces.io/api/partners/v1/firehose/events" -H "X-API-Key: ${FIREHOSE_API_KEY}" | grep --line-buffered -i "IOT_TELEMETRY"`;

    console.log(`Running: ${cmd}`);

    // Spawn Shell to handle the pipe natively: /bin/sh -c "..."
    const pipeline = spawn('/bin/sh', ['-c', cmd]);

    console.log(`Pipeline PID: ${pipeline.pid}`);

    // Error handling
    pipeline.on('error', (err) => console.error('PIPELINE SPAWN ERROR:', err));

    pipeline.stderr.on('data', (data) => {
        // This captures stderr from both curl (if -v) and grep
        const msg = data.toString();
        if (msg.includes('*') || msg.includes('Error') || msg.includes('fail')) {
            console.log(`PIPELINE DEBUG: ${msg.trim()}`);
        }
    });

    // Process Pipeline Output (stdout of grep)
    let buffer = '';
    pipeline.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
            if (!line.trim()) return;

            try {
                let jsonStr = line;
                // Firehose often sends "data: {...}" but grep output might just be the line
                if (line.startsWith('data: ')) {
                    jsonStr = line.replace('data: ', '');
                }

                if (jsonStr.trim().startsWith('{')) {
                    const event = JSON.parse(jsonStr);
                    processEvent(event);
                }
            } catch (e) {
                // console.error("JSON PARSE ERROR:", e);
            }
        });
    });

    // Restart logic
    pipeline.on('close', (code) => {
        console.log(`Pipeline exited with code ${code}. Restarting in 5s...`);
        setTimeout(startFirehose, 5000);
    });
}

function processEvent(event: any) {
    if (!event) return;

    // We filter for IOT_TELEMETRY now via grep.

    let telemetry = event.iotTelemetry;
    if (event.eventType === 'IOT_TELEMETRY') {
        const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
        telemetry = details?.iotTelemetry || event.iotTelemetry;
    } else if (event.eventType === 'IOT_UWB_TAG') {
        telemetry = event.iotTelemetry;
    }

    if (!telemetry) return;

    const mac = telemetry.deviceMacAddress || telemetry.deviceMac;
    if (!mac) return;

    console.log(`[Event] Processing ${mac} (${event.eventType})`);

    // 1. Update Device Metadata
    const update: any = {
        mac,
        lastSeen: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
        status: 'Active'
    };

    if (telemetry.batteryLevel !== undefined) update.battery = telemetry.batteryLevel;

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
