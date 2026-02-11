const Database = require('better-sqlite3');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '..', 'firehose.db');
const CHECK_INTERVAL_MS = 10000; // Check for new tenants every 10s
const CLEANUP_INTERVAL_MS = 3600 * 1000; // Cleanup old data every 1h
const DATA_RETENTION_MS = 24 * 3600 * 1000; // Keep data for 24h
const BATCH_INSERT_SIZE = 50;
const BATCH_FLUSH_INTERVAL = 200; // ms

// State
const processes = new Map(); // tenantId -> ChildProcess
let db;

// Initialize Database
function initDB() {
    console.log(`[Worker] Initializing DB at ${DB_PATH}`);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT,
            api_key TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            last_seen INTEGER
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT,
            device_id TEXT,
            timestamp INTEGER,
            event_type TEXT,
            compute_type TEXT,
            details TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        );

        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
        CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
    `);
    console.log('[Worker] DB Initialized');
}

// Stream Manager
function startStream(tenant) {
    if (processes.has(tenant.id)) return;

    console.log(`[Worker] Starting stream for tenant ${tenant.id} (${tenant.name})`);

    // Command: curl -vvv "..." -H "..." | grep --line-buffered -i "IOT_UWB_TAG"
    // We handle grep in JS to avoid shell complexity and piping issues in spawn

    const curl = spawn('curl', [
        '-N', // No buffer
        '-s', // Silent (we don't want progress bar)
        'https://partners.dnaspaces.io/api/partners/v1/firehose/events',
        '-H', `X-API-Key: ${tenant.api_key}`
    ]);

    processes.set(tenant.id, curl);

    let buffer = '';
    let pendingEvents = [];
    let flushTimer = null;

    const flushEvents = () => {
        if (pendingEvents.length === 0) return;
        const batch = [...pendingEvents];
        pendingEvents = [];

        try {
            const insert = db.prepare(`
                INSERT INTO events (tenant_id, device_id, timestamp, event_type, compute_type, details)
                VALUES (@tenant_id, @device_id, @timestamp, @event_type, @compute_type, @details)
            `);

            const insertMany = db.transaction((events) => {
                for (const ev of events) insert.run(ev);
            });

            insertMany(batch);
            // console.log(`[Worker] Inserted ${batch.length} events for ${tenant.id}`);
        } catch (e) {
            console.error(`[Worker] Failed to insert batch for ${tenant.id}`, e);
        }
    };

    curl.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep last incomplete line

        for (const line of lines) {
            if (!line.trim()) continue;
            // Filter logic: grep -i "IOT_UWB_TAG"
            if (!line.includes('IOT_UWB_TAG')) continue;

            try {
                const json = JSON.parse(line);
                processEvent(tenant.id, json, pendingEvents);
            } catch (e) {
                // Ignore parse errors (keepalives, garbage)
            }
        }

        // Debounced flush
        if (!flushTimer) {
            flushTimer = setTimeout(() => {
                flushEvents();
                flushTimer = null;
            }, BATCH_FLUSH_INTERVAL);
        } else if (pendingEvents.length >= BATCH_INSERT_SIZE) {
            clearTimeout(flushTimer);
            flushEvents();
            flushTimer = null;
        }
    });

    curl.stderr.on('data', (data) => {
        // Log errors but ignore verbose handshake info
        const msg = data.toString();
        if (msg.includes('Error') || msg.includes('fail')) {
            console.error(`[Worker] Curl Error (${tenant.id}): ${msg}`);
        }
    });

    curl.on('close', (code) => {
        console.log(`[Worker] Stream process exited for ${tenant.id} with code ${code}`);
        processes.delete(tenant.id);
        if (flushTimer) clearTimeout(flushTimer);
    });
}

function processEvent(tenantId, event, queue) {
    if (event.eventType !== 'IOT_TELEMETRY') return;

    const telemetry = event.iotTelemetry;
    if (!telemetry) return;

    const deviceInfo = telemetry.deviceInfo;
    const deviceId = deviceInfo?.deviceMacAddress || deviceInfo?.deviceId;

    if (!deviceId) return;

    const detectedPos = telemetry.detectedPosition;
    // const precisePos = telemetry.precisePosition; // Not used in original, but good to have
    const computedPositions = telemetry.allComputedPositions || [];

    // Logic: Prefer TDoA from allComputedPositions
    let finalPos = detectedPos;
    let computeType = detectedPos?.computeType || 'CT_RSSI';

    const tdoaPos = computedPositions.find(p => p.computeType === 'CT_TDOA');
    if (tdoaPos) {
        finalPos = tdoaPos;
        computeType = 'CT_TDOA';
    }

    const record = {
        tenant_id: tenantId,
        device_id: deviceId,
        timestamp: event.recordTimestamp || Date.now(),
        event_type: event.eventType,
        compute_type: computeType,
        details: JSON.stringify({
            iotTelemetry: {
                ...telemetry,
                detectedPosition: finalPos // Overwrite with our selected "best" position
            }
        })
    };

    queue.push(record);
}

// Manager Loop
function syncConfig() {
    try {
        const tenants = db.prepare("SELECT * FROM tenants WHERE is_active = 1").all();

        // Start missing
        for (const t of tenants) {
            if (!processes.has(t.id)) {
                startStream(t);
            }
        }

        // Stop active processes for inactive tenants (if we implement de-activation)
        // Not implemented yet based on requirements, but good for future.
    } catch (e) {
        console.error("[Worker] Sync failed", e);
    }
}

// Cleanup Loop
function cleanup() {
    try {
        const threshold = Date.now() - DATA_RETENTION_MS;
        const info = db.prepare("DELETE FROM events WHERE timestamp < ?").run(threshold);
        if (info.changes > 0) {
            console.log(`[Worker] Cleaned up ${info.changes} old events`);
            // Optimize
            // db.pragma('optimize'); // optional
        }
    } catch (e) {
        console.error("[Worker] Cleanup failed", e);
    }
}

// Main
try {
    initDB();
    setInterval(syncConfig, CHECK_INTERVAL_MS);
    setInterval(cleanup, CLEANUP_INTERVAL_MS);

    // Initial sync
    syncConfig();

    console.log('[Worker] Started');
} catch (e) {
    console.error('[Worker] Fatal error', e);
    process.exit(1);
}
