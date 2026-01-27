
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Required for streaming with node-fetch/https if needed, but fetch API works in edge too usually. 
// However, for long-lived connections, nodejs runtime is often safer in Next.js depending on deployment target. 
// Using nodejs runtime to support standard Node streams if necessary.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');
    const macAddress = searchParams.get('macAddress');
    const requestId = crypto.randomUUID(); // Track individual requests

    // Structured Logger
    const log = (msg: string, data?: any) => {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId,
            macAddress,
            message: msg,
            ...data
        }));
    };

    if (!apiKey) {
        log('Missing apiKey');
        return NextResponse.json({ error: 'Missing apiKey' }, { status: 400 });
    }

    if (!macAddress) {
        log('Missing macAddress');
        return NextResponse.json({ error: 'Missing macAddress' }, { status: 400 });
    }

    const normalizedMac = macAddress.toLowerCase();
    log('Starting Firehose connection');

    try {
        // Create an AbortController to manage the upstream connection
        const controller = new AbortController();
        const signal = controller.signal;

        // Hook into the client disconnect signal if available (Next.js 13+ / Web Standards)
        req.signal.addEventListener('abort', () => {
            log('Client disconnected, aborting upstream connection');
            controller.abort();
        });

        const response = await fetch('https://partners.dnaspaces.io/api/partners/v1/firehose/events', {
            headers: {
                'X-API-Key': apiKey,
            },
            signal: signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            log('Upstream API Error', { status: response.status, errorText });
            return NextResponse.json({ error: `Firehose API error: ${response.status}`, details: errorText }, { status: response.status });
        }

        if (!response.body) {
            log('No response body from upstream');
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
        }

        log('Upstream connection established');

        // Create a TransformStream to filter the data
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(streamController) {
                const reader = response.body!.getReader();
                let buffer = '';
                // Safety limit for buffer to prevent OOM
                const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            log('Upstream stream finished properly');
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        if (buffer.length > MAX_BUFFER_SIZE) {
                            log('Buffer exceeded limit, clearing to prevent OOM');
                            buffer = ''; // Drastic, but better than crashing
                        }

                        const lines = buffer.split('\n');
                        // Keep the last part as it might be incomplete
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.toLowerCase().includes(normalizedMac)) {
                                streamController.enqueue(encoder.encode(line + '\n'));
                            }
                        }
                    }
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        log('Stream aborted');
                    } else {
                        log('Stream processing error', { error: err.message });
                        streamController.error(err);
                    }
                } finally {
                    log('Closing stream controller');
                    streamController.close();
                    controller.abort(); // Ensure upstream is closed
                }
            },
            cancel() {
                log('Client cancelled stream');
                controller.abort();
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'application/json',
                'Transform-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        log('Internal Server Error', { error: error.message });
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
