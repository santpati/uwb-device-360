
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

// Direct db helper because Next.js API routes are isolated
const dbPath = path.join(process.cwd(), 'analytics.db');
const db = new Database(dbPath);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventType, ssoUser, tenantId, details } = body;

        if (!eventType) {
            return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
        }

        const stmt = db.prepare(`
            INSERT INTO events (timestamp, event_type, sso_user, tenant_id, details)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(
            new Date().toISOString(),
            eventType,
            ssoUser || null,
            tenantId || null,
            details ? JSON.stringify(details) : null
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Track error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
