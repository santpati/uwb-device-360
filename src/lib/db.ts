import Database from 'better-sqlite3';
import path from 'path';

// Use a file path relative to the project root. 
// In Next.js, process.cwd() is the root.
const dbPath = path.join(process.cwd(), 'analytics.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for concurrency

function initDB() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        sso_user TEXT,
        tenant_id TEXT,
        details TEXT
    );
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        feedback TEXT NOT NULL,
        name TEXT,
        email TEXT,
        sso_user TEXT,
        image_path TEXT,
        tenant_id TEXT
    );
    `);

    // Prepare statements for performance
    try {
        db.prepare("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)").run();
        db.prepare("CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp)").run();
    } catch (e) {
        console.log("Index creation failed or likely already exists:", e);
    }

    console.log("Database initialized successfully");
}

// Initialize on import
initDB();

export interface AnalyticsEvent {
    eventType: string;
    ssoUser?: string;
    tenantId?: string;
    details?: any;
}

export function saveEvent(event: AnalyticsEvent) {
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
    // 1. Total Unique Users
    const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT sso_user) as count FROM events WHERE sso_user IS NOT NULL').get() as { count: number };

    // 2. Total Tenants
    const tenants = db.prepare('SELECT COUNT(DISTINCT tenant_id) as count FROM events WHERE tenant_id IS NOT NULL').get() as { count: number };

    // 3. Total Successful Sessions
    const sessions = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_type = 'session_start'").get() as { count: number };

    // 4. Total Debugs
    const debugs = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_type = 'debug_device'").get() as { count: number };

    // 5. Total Streams
    const streams = db.prepare("SELECT COUNT(*) as count FROM events WHERE event_type = 'start_stream'").get() as { count: number };

    // 6. Activity Trends (Last 7 Days)
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

    // 7. Cumulative Debug Trends (Last 90 Days)
    const debugTrends = db.prepare(`
        WITH daily_counts AS (
            SELECT 
                strftime('%Y-%m-%d', timestamp) as date,
                COUNT(*) as daily_count
            FROM events 
            WHERE event_type = 'debug_device'
            GROUP BY 1
        ),
        cumulative AS (
            SELECT 
                date,
                SUM(daily_count) OVER (ORDER BY date) as count
            FROM daily_counts
        )
        SELECT * FROM cumulative
        WHERE date >= date('now', '-90 days')
        ORDER BY date ASC
    `).all();

    // 8. Recent Audit Log (Last 50)
    const auditLog = db.prepare(`
        SELECT id, timestamp, event_type, sso_user, tenant_id, details
        FROM events
        ORDER BY timestamp DESC
        LIMIT 50
    `).all();

    return {
        stats: {
            totalUniqueUsers: uniqueUsers.count,
            totalTenants: tenants.count,
            totalSuccessfulSessions: sessions.count,
            totalDebugs: debugs.count,
            totalStreams: streams.count
        },
        trends,
        debugTrends,
        auditLog
    };
}

export interface FeedbackData {
    feedback: string;
    name?: string;
    email?: string;
    ssoUser?: string;
    imagePath?: string;
    tenantId?: string;
}

export function saveFeedback(data: FeedbackData) {
    const stmt = db.prepare(`
        INSERT INTO feedback (feedback, name, email, sso_user, image_path, tenant_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        data.feedback,
        data.name || null,
        data.email || null,
        data.ssoUser || null,
        data.imagePath || null,
        data.tenantId || null
    );
}

export function getFeedbackList() {
    return db.prepare(`SELECT * FROM feedback ORDER BY timestamp DESC`).all();
}
