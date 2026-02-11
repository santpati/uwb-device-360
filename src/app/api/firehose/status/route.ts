import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/firehose-db';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
        return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    try {
        const tenant = getTenant(tenantId);

        // Check if DB says active
        // Ideally we also check if the worker is actually running for this tenant.
        // But the DB `is_active` flag is the source of truth for the worker's *intent*.
        // The worker syncs every 10s. If DB says active, worker should be running it.

        // For a more robust check, we could check if processes are running, 
        // but that requires IPC with the worker which is complex for now.
        // A simple DB check is "good enough" for the UX: "The system thinks it's on".

        // Actually, let's just return the DB state.
        const isActive = tenant?.isActive || false;

        return NextResponse.json({
            active: isActive,
            name: tenant?.name || 'Unknown'
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
