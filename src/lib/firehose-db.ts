import Database from 'better-sqlite3';
import path from 'path';

// Connect to the same DB as the worker
const dbPath = path.join(process.cwd(), 'firehose.db');

// Lazy load DB
let dbInstance: Database.Database | null = null;

function getDb() {
    if (!dbInstance) {
        dbInstance = new Database(dbPath);
        dbInstance.pragma('journal_mode = WAL');
    }
    return dbInstance;
}

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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();
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
    const db = getDb();

    // Normalize input
    const clean = deviceId.replace(/[^a-fA-F0-9]/g, '').toLowerCase();

    // Generate candidates
    const candidates = new Set<string>();
    candidates.add(deviceId); // As provided
    candidates.add(clean); // Clean hex

    // Add colon-separated format (aa:bb:cc...)
    if (clean.length === 12) {
        const colon = clean.match(/.{1,2}/g)?.join(':');
        if (colon) candidates.add(colon);
    }

    const candidateArray = Array.from(candidates);
    const placeholders = candidateArray.map(() => '?').join(',');

    const rows = db.prepare(`
        SELECT * FROM events 
        WHERE tenant_id = ? AND device_id IN (${placeholders}) AND timestamp > ?
        ORDER BY timestamp ASC
        LIMIT 500
    `).all(tenantId, ...candidateArray, minTimestamp) as any[];

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
