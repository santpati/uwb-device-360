
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'analytics.db');
const db = new Database(dbPath);

export async function GET(req: NextRequest) {
    try {
        const totalUsers = db.prepare(`SELECT COUNT(DISTINCT sso_user) as count FROM events WHERE sso_user IS NOT NULL`).get() as { count: number };
        const totalTenants = db.prepare(`SELECT COUNT(DISTINCT tenant_id) as count FROM events WHERE tenant_id IS NOT NULL`).get() as { count: number };
        const successfulSessions = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'session_start'`).get() as { count: number };
        const totalDebugs = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'debug_device'`).get() as { count: number };
        const totalStreams = db.prepare(`SELECT COUNT(*) as count FROM events WHERE event_type = 'start_stream'`).get() as { count: number };

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

        return NextResponse.json({
            stats: {
                totalUniqueUsers: totalUsers.count,
                totalTenants: totalTenants.count,
                totalSuccessfulSessions: successfulSessions.count,
                totalDebugs: totalDebugs.count,
                totalStreams: totalStreams.count
            },
            trends
        });
    } catch (e: any) {
        console.error('Stats error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
