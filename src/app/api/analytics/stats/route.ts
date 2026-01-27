
import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsStats, getRecentEvents } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { trends, ...stats } = getAnalyticsStats();
        const auditLog = getRecentEvents();

        return NextResponse.json({
            stats,
            trends,
            auditLog
        });
    } catch (e: any) {
        console.error('Stats error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
