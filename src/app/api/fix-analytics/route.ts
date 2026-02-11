import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbPath = path.join(process.cwd(), 'analytics.db');
        const db = new Database(dbPath);

        // Get all events where sso_user is 'Unknown' and details is not null
        const rows = db.prepare("SELECT id, details FROM events WHERE sso_user = 'Unknown' AND details IS NOT NULL").all() as { id: number, details: string }[];

        let updatedCount = 0;
        const updateStmt = db.prepare("UPDATE events SET sso_user = ? WHERE id = ?");

        for (const row of rows) {
            try {
                const details = JSON.parse(row.details);
                // Check key fields
                const user = details.userName || details.ssoUser || details.email || details.sub || details.username;

                if (user) {
                    updateStmt.run(user, row.id);
                    updatedCount++;
                }
            } catch (e) {
                console.error(`Failed to parse details for event ${row.id}`, e);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Fixed ${updatedCount} records out of ${rows.length} checked.`,
            updatedCount,
            totalChecked: rows.length
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
