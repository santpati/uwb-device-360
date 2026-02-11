import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), 'analytics.db');
        const db = new Database(dbPath);

        // Get 5 samples to inspect
        const samples = db.prepare("SELECT id, event_type, details FROM events WHERE sso_user = 'Unknown' AND details IS NOT NULL LIMIT 5").all();

        return NextResponse.json({
            samples: samples.map((s: any) => ({
                id: s.id,
                event: s.event_type,
                details: JSON.parse(s.details)
            }))
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
