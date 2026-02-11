import Database from 'better-sqlite3';
import path from 'path';

// Connect to the same DB as the worker
const dbPath = path.join(process.cwd(), 'firehose.db');
const db = new Database(dbPath);

// Enable WAL for concurrent access from App (Read/Write) and Worker (Read/Write)
// SQLite handles locking automatically in WAL mode
db.pragma('journal_mode = WAL');

// Types
export interface TenantConfig {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    lastSeen: number;
}

export interface FirehoseEvent {
    id: number;
    tenantId: string;
    deviceId: string;
    timestamp: number;
    eventType: string;
    computeType: string;
    details: any;
}

// Functions

export function registerTenant(id: string, name: string, apiKey: string) {
    const stmt = db.prepare(`
        INSERT INTO tenants (id, name, api_key, is_active, last_seen)
        VALUES (@id, @name, @api_key, 1, @now)
        ON CONFLICT(id) DO UPDATE SET
            name = @name,
            api_key = CASE WHEN @api_key IS NOT NULL AND @api_key != '' THEN @api_key ELSE api_key END,
            is_active = 1,
            last_seen = @now
    `);

    stmt.run({
        id,
        name,
        api_key: apiKey,
        now: Date.now()
    });
}

export function getTenant(id: string): TenantConfig | undefined {
    const row = db.prepare("SELECT * FROM tenants WHERE id = ?").get(id) as any;
    if (!row) return undefined;

    return {
        id: row.id,
        name: row.name,
        apiKey: row.api_key,
        isActive: Boolean(row.is_active),
        lastSeen: row.last_seen
    };
}

export function getEvents(tenantId: string, minTimestamp: number): FirehoseEvent[] {
    const rows = db.prepare(`
        SELECT * FROM events 
        WHERE tenant_id = ? AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT 500
    `).all(tenantId, minTimestamp) as any[];

    return rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        deviceId: row.device_id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        computeType: row.compute_type,
        details: JSON.parse(row.details)
    }));
}

export function getDeviceEvents(tenantId: string, deviceId: string, minTimestamp: number): FirehoseEvent[] {
    const rows = db.prepare(`
        SELECT * FROM events 
        WHERE tenant_id = ? AND device_id = ? AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT 500
    `).all(tenantId, deviceId, minTimestamp) as any[];

    return rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        deviceId: row.device_id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        computeType: row.compute_type,
        details: JSON.parse(row.details)
    }));
}
