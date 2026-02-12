
// This script runs independently to process Firehose events
import { spawn } from 'child_process';
import { getCiscoDB, upsertDevice, incrementStat } from '../src/lib/ciscolive_db';
import fetch from 'node-fetch'; // Need to install node-fetch or usage global fetch if node 18+

const SYS_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6InNhbnRwYXRpQGNpc2NvLmNvbSIsInVzZXJJZCI6NDkwOTYsInRlbmFudElkIjoyMzI4NSwiY05hbWUiOiJDaXNjb0xpdmVFVSIsInJvbGUiOiIiLCJpYnkiOiJDT01NT05UTVMiLCJzdG8iOiIyMDI2LTAyLTEyVDA0OjQxOjIzWiIsInR5cGUiOiJzeXN0ZW1fdG9rZW4iLCJkZXRhaWxzIjpbeyJhcHBOYW1lIjoiRE5BU3BhY2VzIiwiYXBwUm9sZSI6IlJXIn0seyJhcHBOYW1lIjoiQ2FwdGl2ZVBvcnRhbCIsImFwcFJvbGUiOiJSVyJ9LHsiYXBwTmFtZSI6Ik1hcFNlcnZpY2UiLCJhcHBSb2xlIjoiUlcifSx7ImFwcE5hbWUiOiJMb2NhdGlvbkFuYWx5dGljcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiTG9jYXRpb24gQW5hbHl0aWNzIn0seyJhcHBOYW1lIjoiRWRnZURldmljZU1hbmFnZXIiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IklvVCBTZXJ2aWNlcyJ9LHsiYXBwTmFtZSI6IlJpZ2h0Tm93IiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJSaWdodCBOb3cifSx7ImFwcE5hbWUiOiJJbXBhY3RBbmFseXNpcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW1wYWN0IEFuYWx5c2lzIn0seyJhcHBOYW1lIjoiQnVzaW5lc3NJbnNpZ2h0cyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiQmVoYXZpb3IgTWV0cmljcyJ9LHsiYXBwTmFtZSI6IkNhbWVyYU1ldHJpY3MiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkNhbWVyYSBNZXRyaWNzIn0seyJhcHBOYW1lIjoiT3BlblJvYW1pbmciLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6Ik9wZW5Sb2FtaW5nIn0seyJhcHBOYW1lIjoiRW5nYWdlbWVudHMiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkVuZ2FnZW1lbnRzIn0seyJhcHBOYW1lIjoiTG9jYXRpb24gUGVyc29uYXMifSx7ImFwcE5hbWUiOiJMb2NhdGlvbiIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiRGV0ZWN0IGFuZCBMb2NhdGUifSx7ImFwcE5hbWUiOiJJb3RFeHBsb3JlciIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW9UIEV4cGxvcmVyIn0seyJhcHBOYW1lIjoiU2lnbmFnZSIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiU3BhY2UgTWFuYWdlciJ9LHsiYXBwTmFtZSI6IldvcmtzcGFjZUV4cGVyaWVuY2UiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIEV4cGVyaWVuY2UifSx7ImFwcE5hbWUiOiJFbnZpcm9ubWVudGFsQW5hbHl0aWNzIiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJFbnZpcm9ubWVudGFsIEFuYWx5dGljcyJ9LHsiYXBwTmFtZSI6IlNwYWNlVXRpbGl6YXRpb24iLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIFV0aWxpemF0aW9uIn1dLCJpYXQiOjE3NzA4NzEyNDgsIm9yaWdpbmFsX2lhdCI6MTc3MDg3MTI0OCwiYXV0aHR5cGUiOiJTU08iLCJhdXRoT25seSI6ZmFsc2UsImlzU3VwIjpmYWxzZSwic3NvVXNlciI6IiIsInVsYSI6dHJ1ZSwiZXhwIjoxNzcwODczMDQ4fQ.d-YArX529C_TCZuLOVZsRRy1u2bQjuUkvVHZcbTu1RpDy7L1o7Iurz-FDnKCOba00PcyX44tQu3Eev7ZoSlmMJVScOT15UDMXq-62k4mucxiZPayIs7PjQ2RaeCJYGXLWq9Rp60kOT20gyTSsY0aMYF4leQvFV6DRpPWX2bwgBFO-zh2nIUK_ne9FdgzDv9o4DWVv_snjzAFjDLXFVSp-gMt7IVqc0W-6yjnfFs_juTssusB9uXdTgv52ha5NAvzp06SUBiUhD_N09TYbiv08MideLs-lBysh3xn_S0f3jrzQ4mrFZ3Nr3RXWhQmuZmvMI9Yapj4nMpRT4wqdBr9qQ";
const FIREHOSE_API_KEY = "EA39257AB6CF41FDBA265C97FCF9A95D";

async function fetchInitialDevices() {
    console.log("Fetching initial device list...");
    // Fetch from Claimed Devices API or similar to get base list
    try {
        const res = await fetch(`https://dnaspaces.io/api/edm/v1/device/partner/claimedbeacons?page=1&pageSize=1000&sortBy=create_time&sortType=DESCENDING`, {
            headers: {
                "Cookie": `sys-token=${SYS_TOKEN}`
            }
        });
        const json = await res.json();

        if (json.devices) {
            console.log(`Found ${json.devices.length} devices.`);
            const TARGET_MODELS = ['QORVO-UWB', 'SPACES-CT-UB'];
            const filtered = json.devices.filter((d: any) =>
                TARGET_MODELS.some(m => d.model?.toUpperCase().includes(m)) ||
                TARGET_MODELS.includes(d.model?.toUpperCase())
            );
            console.log(`Filtered to ${filtered.length} UWB devices.`);

            filtered.forEach((d: any) => {
                upsertDevice({
                    mac: d.macAddress || d.mac,
                    name: d.name,
                    model: d.model,
                    firmware: d.firmwareVersion || d.firmware,
                    vendor: d.vendor,
                    lastSeen: d.lastSeen || d.lastSeenTime
                });
            });
        }
    } catch (e) {
        console.error("Error fetching initial devices:", e);
    }
}

function startFirehose() {
    console.log("Starting Firehose Stream...");

    // Command: curl -vvv "..." | grep -i "IOT_UWB_TAG"
    const curl = spawn('curl', [
        '-N', // No buffer
        '-s', // Silent (we'll capture filtered output)
        'https://partners.dnaspaces.io/api/partners/v1/firehose/events',
        '-H', `X-API-Key:${FIREHOSE_API_KEY}`
    ]);

    const grep = spawn('grep', ['--line-buffered', '-i', 'IOT_UWB_TAG']);

    curl.stdout.pipe(grep.stdin);
    curl.stderr.on('data', (data) => console.error(`CURL ERR: ${data}`)); // To see connection issues

    grep.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
            if (!line) return;
            try {
                // Event format: "data: {...}"
                if (line.startsWith('data: ')) {
                    const jsonStr = line.replace('data: ', '');
                    const event = JSON.parse(jsonStr);
                    processEvent(event);
                }
            } catch (e) {
                // ignore parse errors for partial lines
            }
        });
    });

    grep.stderr.on('data', (data) => console.error(`GREP ERR: ${data}`));

    curl.on('close', (code) => {
        console.log(`Firehose connection closed (code ${code}). Restarting in 5s...`);
        setTimeout(startFirehose, 5000);
    });
}

function processEvent(event: any) {
    if (event.eventType !== 'IOT_UWB_TAG') return;

    const telemetry = event.iotTelemetry;
    if (!telemetry) return;

    const mac = telemetry.deviceMacAddress || telemetry.deviceMac;
    if (!mac) return;

    // 1. Update Device Info (Battery, Firmware)
    const update: any = { mac };
    if (telemetry.batteryLevel !== undefined) update.battery = telemetry.batteryLevel;
    if (telemetry.files && telemetry.files.length > 0) {
        // sometimes firmware info is in text files/status?
        // Actually usually in device info events, but let's grab what we can.
    }
    // Update last seen
    update.lastSeen = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();

    upsertDevice(update);

    // 2. Update Stats (UWB vs BLE)
    // "identify if the event is TDoA/UWB or event is RSSI/BLE"
    // Using computeType
    const pos = telemetry.precisePosition || telemetry.detectedPosition;
    if (pos) {
        const type = (pos.computeType === 'TDoA') ? 'UWB' : 'BLE';
        incrementStat(mac, type, event.timestamp);
    }
}

// Main
(async () => {
    await fetchInitialDevices();
    startFirehose();
})();
