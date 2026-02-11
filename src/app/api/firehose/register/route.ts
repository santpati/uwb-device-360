import { NextRequest, NextResponse } from 'next/server';
import { registerTenant, getTenant } from '@/lib/firehose-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tenantId, tenantName, apiKey } = body;

        if (!tenantId) {
            return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
        }

        // Logic: 
        // 1. If API Key is provided, register/update tenant with it.
        // 2. If API Key is NOT provided, check if we already have a key for this tenant.
        // 3. If no key exists at all, we can't start stream (but we can register tenant as inactive)

        const existing = getTenant(tenantId);

        if (!apiKey && (!existing || !existing.apiKey)) {
            // We can register, but we can't stream. 
            // Ideally we want to prevent this or warn.
            // But for now, we just proceed, worker won't find a key.
            console.warn(`[API] Registering tenant ${tenantId} without API Key`);
        }

        registerTenant(tenantId, tenantName || existing?.name || 'Unknown', apiKey || '');

        return NextResponse.json({ success: true, message: 'Tenant registered' });

    } catch (e: any) {
        console.error("Registration failed", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
