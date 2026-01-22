
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Required for streaming with node-fetch/https if needed, but fetch API works in edge too usually. 
// However, for long-lived connections, nodejs runtime is often safer in Next.js depending on deployment target. 
// Using nodejs runtime to support standard Node streams if necessary.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');
    const macAddress = searchParams.get('macAddress');

    if (!apiKey) {
        return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 });
    }

    // If no macAddress provided, we can't effectively filter as requested by the prompt (grep behavior).
    // But we could potentially allow full stream if intended, though it might be high volume.
    // The prompt specifically asks to "grep for the mac address".
    if (!macAddress) {
        return NextResponse.json({ error: 'Missing macAddress' }, { status: 400 });
    }

    const normalizedMac = macAddress.toLowerCase();

    try {
        const response = await fetch('https://partners.dnaspaces.io/api/partners/v1/firehose/events', {
            headers: {
                'X-API-Key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Firehose API error: ${response.status}`, details: errorText }, { status: response.status });
        }

        if (!response.body) {
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
        }

        // Create a TransformStream to filter the data
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        let buffer = '';

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body!.getReader();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split('\n');
                        // Keep the last part as it might be incomplete
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            // "Grep" equivalent: check if line contains the MAC address
                            if (line.toLowerCase().includes(normalizedMac)) {
                                controller.enqueue(encoder.encode(line + '\n'));
                            }
                        }
                    }
                } catch (err) {
                    console.error("Stream error:", err);
                    controller.error(err);
                } finally {
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/json', // Or text/event-stream if we wanted SSE, but NDJSON is fine for raw stream
                'Transform-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
