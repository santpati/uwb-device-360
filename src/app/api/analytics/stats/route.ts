
import { NextRequest, NextResponse } from 'next/server';
import { getAnalyticsStats } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { trends, ...stats } = getAnalyticsStats();

        return NextResponse.json({
            stats,
            trends
        });
    } catch (e: any) {
        console.error('Stats error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
