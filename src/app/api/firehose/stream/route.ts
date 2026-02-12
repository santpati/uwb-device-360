
import { NextRequest, NextResponse } from 'next/server';
import { getDeviceEvents } from '@/lib/firehose-db';

/**
 * Server-Sent Events (SSE) Stream for Firehose Data
 * 
 * Replaces client-side polling with a persistent HTTP connection.
 * Client opens connection once, Server pushes updates when DB changes.
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const macAddress = searchParams.get('macAddress');
    let since = parseInt(searchParams.get('since') || '0');

    if (!tenantId || !macAddress) {
        return NextResponse.json({ error: 'Missing tenantId or macAddress' }, { status: 400 });
    }

    // Clean inputs (Security/Sanity)
    const cleanMac = macAddress.trim().replace(/:/g, '').toLowerCase();
    const cleanTenant = tenantId.trim().replace(/['"]+/g, '');

    // Transform stream using ReadableStream
    // This keeps the connection open
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Helper to send SSE formatted message
            const sendEvent = (data: any) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Send initial connection confirmation
            sendEvent({ type: 'connected', timestamp: Date.now() });

            // Polling Interval (Internal to Server)
            // Checks DB every 1s for new data, pushes if found.
            const interval = setInterval(async () => {
                try {
                    // Fetch events since last check
                    const newEvents = await getDeviceEvents(cleanTenant, cleanMac, since);

                    if (newEvents && newEvents.length > 0) {
                        // Update cursor to latest timestamp
                        const maxTime = Math.max(...newEvents.map(e => e.timestamp));
                        since = maxTime;

                        // Push data to client
                        sendEvent({ type: 'update', events: newEvents });
                    } else {
                        // Optional: Send heartbeat to keep connection alive through proxies
                        sendEvent({ type: 'heartbeat', timestamp: Date.now() });
                    }
                } catch (error) {
                    console.error("SSE Error querying DB:", error);
                    sendEvent({ type: 'error', message: 'Internal DB Error' });
                }
            }, 1000);

            // Cleanup when client disconnects
            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
                console.log(`SSE Client Disconnected: ${cleanMac}`);
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
