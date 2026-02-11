import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), 'firehose.db');
        const db = new Database(dbPath);

        // Stats
        const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get() as any;
        const devices = db.prepare('SELECT device_id, COUNT(*) as c, MAX(timestamp) as last_seen FROM events GROUP BY device_id').all();
        const tenants = db.prepare('SELECT * FROM tenants').all();
        const recentEvents = db.prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT 5').all();

        return NextResponse.json({
            eventCount: eventCount.c,
            devices,
            tenants,
            recentEvents
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
