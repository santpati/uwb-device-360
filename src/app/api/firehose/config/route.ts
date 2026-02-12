
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/firehose-db';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    try {
        const cleanTenant = tenantId.trim().replace(/['"]+/g, '');
        const config = getTenant(cleanTenant);

        if (config && config.apiKey) {
            return NextResponse.json({
                found: true,
                apiKey: config.apiKey,
                name: config.name
            });
        } else {
            return NextResponse.json({ found: false });
        }
    } catch (e) {
        console.error("Error fetching tenant config", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
