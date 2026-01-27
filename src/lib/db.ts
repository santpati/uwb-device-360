import Database from 'better-sqlite3';
import path from 'path';

// Use a file path relative to the project root. 
// In Next.js, process.cwd() is the root.
const dbPath = path.join(process.cwd(), 'analytics.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for concurrency

// Initialize Database Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        sso_user TEXT,
        tenant_id TEXT,
        details TEXT
    )
`);

interface AnalyticsEvent {
    eventType: 'session_start' | 'debug_device' | 'start_stream';
    ssoUser?: string;
    tenantId?: string;
    details?: object;
}

export function logEvent(event: AnalyticsEvent) {
    const stmt = db.prepare(`
        INSERT INTO events (timestamp, event_type, sso_user, tenant_id, details)
        VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
        new Date().toISOString(),
        event.eventType,
        event.ssoUser || null,
        event.tenantId || null,
        event.details ? JSON.stringify(event.details) : null
    );
}

export function getAnalyticsStats() {
    const totalUsers = db.prepare(`SELECT COUNT(DISTINCT sso_user) as count FROM events WHERE sso_user IS NOT NULL`).get() as { count: number };
    const totalTenants = db.prepare(`SELECT COUNT(DISTINCT tenant_id) as count FROM events WHERE tenant_id IS NOT NULL`).get() as { count: number };
    const successfulSessions = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'session_start'`).get() as { count: number };
    const totalDebugs = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'debug_device'`).get() as { count: number };
    const totalStreams = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'start_stream'`).get() as { count: number };

    // Get time-series data for the last 7 days (grouped by day)
    const trends = db.prepare(`
        SELECT 
            strftime('%Y-%m-%d', timestamp) as date,
            event_type,
            COUNT(*) as count
        FROM events 
        WHERE timestamp >= date('now', '-7 days')
        GROUP BY 1, 2
        ORDER BY 1 ASC
    `).all();

    return {
        totalUniqueUsers: totalUsers.count,
        totalTenants: totalTenants.count,
        totalSuccessfulSessions: successfulSessions.count,
        totalDebugs: totalDebugs.count,
        totalStreams: totalStreams.count,
        trends
    };
}

export function getRecentEvents() {
    return db.prepare(`
        SELECT id, timestamp, event_type, sso_user, tenant_id, details 
        FROM events 
        ORDER BY timestamp DESC 
        LIMIT 50
    `).all();
}
