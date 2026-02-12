
// This script runs independently to process Firehose events
import { spawn } from 'child_process';
import { getCiscoDB, upsertDevice, incrementStat } from '../src/lib/ciscolive_db';
// Global fetch is available in Node 18+

const SYS_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6InNhbnRwYXRpQGNpc2NvLmNvbSIsInVzZXJJZCI6NDkwOTYsInRlbmFudElkIjoyMzI4NSwiY05hbWUiOiJDaXNjb0xpdmVFVSIsInJvbGUiOiIiLCJpYnkiOiJDT01NT05UTVMiLCJzdG8iOiIyMDI2LTAyLTEyVDA1OjA3OjIzWiIsInR5cGUiOiJzeXN0ZW1fdG9rZW4iLCJkZXRhaWxzIjpbeyJhcHBOYW1lIjoiRE5BU3BhY2VzIiwiYXBwUm9sZSI6IlJXIn0seyJhcHBOYW1lIjoiQ2FwdGl2ZVBvcnRhbCIsImFwcFJvbGUiOiJSVyJ9LHsiYXBwTmFtZSI6Ik1hcFNlcnZpY2UiLCJhcHBSb2xlIjoiUlcifSx7ImFwcE5hbWUiOiJMb2NhdGlvbkFuYWx5dGljcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiTG9jYXRpb24gQW5hbHl0aWNzIn0seyJhcHBOYW1lIjoiRWRnZURldmljZU1hbmFnZXIiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IklvVCBTZXJ2aWNlcyJ9LHsiYXBwTmFtZSI6IlJpZ2h0Tm93IiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJSaWdodCBOb3cifSx7ImFwcE5hbWUiOiJJbXBhY3RBbmFseXNpcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW1wYWN0IEFuYWx5c2lzIn0seyJhcHBOYW1lIjoiQnVzaW5lc3NJbnNpZ2h0cyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiQmVoYXZpb3IgTWV0cmljcyJ9LHsiYXBwTmFtZSI6IkNhbWVyYU1ldHJpY3MiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkNhbWVyYSBNZXRyaWNzIn0seyJhcHBOYW1lIjoiT3BlblJvYW1pbmciLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6Ik9wZW5Sb2FtaW5nIn0seyJhcHBOYW1lIjoiRW5nYWdlbWVudHMiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkVuZ2FnZW1lbnRzIn0seyJhcHBOYW1lIjoiTG9jYXRpb25QZXJzb25hcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiTG9jYXRpb24gUGVyc29uYXMifSx7ImFwcE5hbWUiOiJMb2NhdGlvbiIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiRGV0ZWN0IGFuZCBMb2NhdGUifSx7ImFwcE5hbWUiOiJJb3RFeHBsb3JlciIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW9UIEV4cGxvcmVyIn0seyJhcHBOYW1lIjoiU2lnbmFnZSIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiU3BhY2UgTWFuYWdlciJ9LHsiYXBwTmFtZSI6IldvcmtzcGFjZUV4cGVyaWVuY2UiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIEV4cGVyaWVuY2UifSx7ImFwcE5hbWUiOiJFbnZpcm9ubWVudGFsQW5hbHl0aWNzIiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJFbnZpcm9ubWVudGFsIEFuYWx5dGljcyJ9LHsiYXBwTmFtZSI6IlNwYWNlVXRpbGl6YXRpb24iLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIFV0aWxpemF0aW9uIn1dLCJpYXQiOjE3NzA4NzI4MDgsIm9yaWdpbmFsX2lhdCI6MTc3MDg3MTI0OCwiYXV0aHR5cGUiOiJTU08iLCJpc1N1cCI6ZmFsc2UsInNzb1VzZXIiOiIiLCJleHAiOjE3NzA4NzQ2MDh9.B1_ErRMQdu2ItfrFrcV3r-m8QrkiSKNF-t5sHdnZ3H9U8C122zrBXg9T4LUf1MCEmfpVwEXuTG5ZOA51gb-bsSXc9uuh1Q6oK-2znMKtHGa8x1CCw6nWKQxtOC-wrKPr0PckqqNR-kiWvfD4_9d1WIFzHbJjbT3RUcOcJzW9Qfo6nKBLOTImV4-LNv43cStJeiLiIlLHqKIRwc6dgjWRqTmFl-t0KcY03FnVxn4SjqeQOC-41RT5oOfq8daXtReijI3NAmfZy_srqtdwH30j-FrHqvrowA9eLgKGOPmuVhGnbB1pNTIJtYoRQt6rDn-EU1GxQNBOuWlnVQPF2lH4Og";
const FIREHOSE_API_KEY = "B3DB01B8C4B64856BE66CB862FF84F57";

async function fetchInitialDevices() {
    console.log("Skipping initial device fetch in worker (delegated to frontend sync)...");
    return;
    /*
    console.log("Fetching initial device list with new token...");
    try {
        // ... (commented out) ...
    } catch (e) {
        console.error("Error fetching initial devices:", e);
    }
    */
}

// ...

function startFirehose() {
    console.log("Starting Firehose Stream...");



    // Command: curl -vvv "..." -H "..."
    // We pipe directly to Node to avoid grep buffering/filtering issues
    // and to handle IOT_TELEMETRY vs IOT_UWB_TAG logic in code.
    const curl = spawn('curl', [
        '-N', // No buffer
        '-s', // Silent (we'll capture filtered output)
        'https://partners.dnaspaces.io/api/partners/v1/firehose/events',
        '-H', `X-API-Key:${FIREHOSE_API_KEY}`
    ]);

    // Buffer for partial lines
    let buffer = '';

    curl.stdout.on('data', (data: any) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep last incomplete line

        lines.forEach((line: string) => {
            if (!line.trim()) return;
            try {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.replace('data: ', '');
                    try {
                        const event = JSON.parse(jsonStr);
                        processEvent(event);
                    } catch (e) {
                        // console.error("Error parsing event JSON", e);
                    }
                } else if (line.startsWith(':')) {
                    // Keep-alive
                } else {
                    // Try parsing raw line just in case (some streams differ)
                    // But usually Firehose matches data: prefix
                }
            } catch (e) {
                // ignore
            }
        });
    });

    curl.stderr.on('data', (data) => {
        const msg = data.toString();
        // Ignore verbose info, log errors
        if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail')) {
            console.error(`CURL ERR: ${msg}`);
        }
    });

    curl.on('close', (code) => {
        console.log(`Firehose connection closed (code ${code}). Restarting in 5s...`);
        setTimeout(startFirehose, 5000);
    });
}

function processEvent(event: any) {
    // Debug log for event types
    // console.log(`Processing: ${event.eventType}`);

    if (event.eventType !== 'IOT_UWB_TAG' && event.eventType !== 'IOT_TELEMETRY') return;

    // Support BOTH event types
    let telemetry = event.iotTelemetry;

    // For IOT_TELEMETRY, structure might be different or nested in details
    if (event.eventType === 'IOT_TELEMETRY') {
        const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
        telemetry = details?.iotTelemetry || event.iotTelemetry;
    }

    if (!telemetry) return;

    const mac = telemetry.deviceMacAddress || telemetry.deviceMac;
    if (!mac) return;

    console.log(`[Firehose] Event for ${mac} (${event.eventType})`);

    // ... rest of function ...

    // 1. Update Device Info (Battery, Firmware)
    // We must provide ALL named parameters expected by upsertDevice if the query uses them.
    // However, upsertDevice in ciscolive_db.ts likely constructs the query dynamically or expects specific fields.
    // Let's pass null for missing fields if upsertDevice expects them.
    // Checking ciscolive_db.ts:
    // upsertDevice expects object with optional props, but the SQL might use @battery etc.
    // If the SQL uses @battery, better-sqlite3 requires it to be present in the object.

    const update: any = {
        mac,
        battery: telemetry.batteryLevel !== undefined ? telemetry.batteryLevel : null,
        // We aren't getting these from telemetry usually, but pass null/undefined to be safe if strict
        // But better yet, let's fix upsertDevice to handle missing keys or pass them here.
        // For now, let's just pass what we have, but ensure we don't crash.
        // If upsertDevice uses @battery, we MUST pass battery.
    };

    // Actually, looking at ciscolive_db.ts, I see it uses @battery, @model etc. directly.
    // So we MUST pass all of them.
    update.model = null; // Telemetry usually doesn't have model
    update.firmware = null;
    update.vendor = null;
    update.name = null;

    // Override if present
    if (telemetry.files && telemetry.files.length > 0) {
        // ...
    }

    update.lastSeen = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();

    upsertDevice(update);

    // 2. Update Stats (UWB vs BLE)
    // Logic aligned with SignalChart.tsx
    const detectedPos = telemetry.detectedPosition;
    const precisePos = telemetry.precisePosition;

    // Helper from SignalChart: "isStrictTDOA"
    // Checks for CT_TDOA and valid coordinates
    const isStrictTDOA = (pos: any) => {
        if (!pos) return false;
        // Accept both 'CT_TDOA' (from SignalChart) and 'TDoA' (typical API) just in case
        const isTdoa = pos.computeType === 'CT_TDOA' || pos.computeType === 'TDoA';
        const hasCoords = (pos.xPos !== 0 || pos.yPos !== 0);
        return isTdoa && hasCoords;
    };

    let type: 'UWB' | 'BLE' = 'BLE';
    if (isStrictTDOA(detectedPos) || isStrictTDOA(precisePos)) {
        type = 'UWB';
    } else {
        // Default to BLE if not strict UWB TDoA (covers BLE_RSSI, etc.)
        type = 'BLE';
    }

    incrementStat(mac, type, event.timestamp);
}

// Main
(async () => {
    await fetchInitialDevices();
    startFirehose();
})();
