import { NextRequest, NextResponse } from 'next/server';
import { getDeviceEvents, getEvents } from '@/lib/firehose-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const macAddress = searchParams.get('macAddress');
    const since = searchParams.get('since');

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    // Default: Last 10 seconds if no 'since' provided, to avoid huge payloads on initial load
    const minTimestamp = since ? parseInt(since) : Date.now() - 10000;

    try {
        let events;
        if (macAddress) {
            events = getDeviceEvents(tenantId, macAddress, minTimestamp);
        } else {
            events = getEvents(tenantId, minTimestamp);
        }

        return NextResponse.json({ events });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
