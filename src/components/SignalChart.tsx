
"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Activity, Pause, Play, Trash2, Download } from 'lucide-react';

interface SignalPoint {
    timestamp: number;
    timeLabel: string;
    type: 'UWB_TDOA' | 'BLE_RSSI' | 'UWB_RSSI';
    value: number;
    rssi?: number;
    confidence?: number;
}

interface EventLog {
    id: number;
    type: string;
    timestamp: string;
    details: any;
}

interface SignalChartProps {
    macAddress: string;
    apiKey: string;
    ssoUser?: string;
    onSignalDetected?: (type: 'BLE' | 'UWB') => void;
}

export default function SignalChart({ macAddress, apiKey, ssoUser, onSignalDetected }: SignalChartProps) {
    const [data, setData] = useState<SignalPoint[]>([]);
    const [events, setEvents] = useState<EventLog[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
    const abortControllerRef = useRef<AbortController | null>(null);

    // Start looking from 0 (beginning of time) to catch latest history on load, since API now returns latest 500 DESC
    const [lastTimestamp, setLastTimestamp] = useState<number>(0);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Refs for stable access to state inside event handlers
    const lastTimestampRef = useRef(lastTimestamp);
    const isStreamingRef = useRef(isStreaming);

    useEffect(() => {
        lastTimestampRef.current = lastTimestamp;
    }, [lastTimestamp]);

    useEffect(() => {
        isStreamingRef.current = isStreaming;
    }, [isStreaming]);

    // Auto-start check and cleanup
    useEffect(() => {
        const checkStatus = async () => {
            const tenantId = localStorage.getItem('tenant_id');
            if (!tenantId || isStreamingRef.current) return;

            try {
                const res = await fetch(`/api/firehose/status?tenantId=${tenantId}`);
                const data = await res.json();
                if (data.active) {
                    startStream();
                }
            } catch (e) {
                console.error("Auto-start check failed", e);
            }
        };

        checkStatus();
        return () => stopStream(); // Cleanup on unmount
    }, []);

    const startStream = async () => {
        if (isStreamingRef.current) return;

        // Manual updates to ensure immediate availability
        isStreamingRef.current = true;
        setIsStreaming(true);
        setError(null);
        setData([]);
        setEvents([]);
        setLastTimestamp(0);
        setDebugInfo('Initializing Event Stream...');

        // START_STREAM event tracking
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'start_stream',
                ssoUser,
                details: { mac: macAddress }
            })
        }).catch(console.error);

        // Initial Registration (Idempotent)
        const rawTenant = localStorage.getItem('tenant_id') || '';
        const tenantId = rawTenant.trim().replace(/['"]+/g, '');

        if (tenantId) {
            fetch('/api/firehose/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, apiKey })
            }).catch(console.error);
        }

        // Initialize SSE Connection
        initEventSource(tenantId);
    };

    const initEventSource = (tenantId: string) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const cleanMac = macAddress.trim().replace(/:/g, '').toLowerCase();
        // Since=0 initial load, then updates are handled by server pushing new data
        // Ideally pass lastTimestamp if re-connecting, but for now 0 is safer for full freshview
        const since = lastTimestampRef.current || 0;

        const url = `/api/firehose/stream?tenantId=${tenantId}&macAddress=${cleanMac}&since=${since}`;

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
            setDebugInfo(prev => `SSE Connected: ${url}\n${prev}`);
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'connected') {
                    setDebugInfo(prev => `Stream Active. Server Time: ${new Date(data.timestamp).toLocaleTimeString()}`);
                } else if (data.type === 'update') {
                    const newEvents = data.events || [];
                    if (newEvents.length > 0) {
                        const eventCount = newEvents.length;
                        const firstEventSnippet = JSON.stringify(newEvents[0], null, 2).slice(0, 50) + "...";
                        setDebugInfo(`Recv ${eventCount} events. Last: ${firstEventSnippet}`);

                        // Update Max Timestamp
                        const maxTime = Math.max(...newEvents.map((e: any) => e.timestamp));
                        setLastTimestamp(prev => Math.max(prev, maxTime));

                        // Process
                        newEvents.forEach((e: any) => processEvent(e));
                    }
                } else if (data.type === 'heartbeat') {
                    // Keep-alive, do nothing or update UI badge
                } else if (data.type === 'error') {
                    setError(data.message);
                }
            } catch (e) {
                console.error("SSE Parse Error", e);
            }
        };

        es.onerror = (err) => {
            console.error("SSE Error", err);
            // EventSource auto-reconnects, but we log it
            // If explicit close requested, we don't worry.
            if (isStreamingRef.current) {
                setDebugInfo("Stream disconnected. Auto-reconnecting...");
            }
        };
    };

    const stopStream = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsStreaming(false);
        isStreamingRef.current = false;
        setDebugInfo("Stream Stopped.");
    };

    const processEvent = (event: any) => {
        // Use the timestamp from the API event container
        const timestamp = event.timestamp || Date.now();
        const timeLabel = new Date(timestamp).toLocaleTimeString();

        if (event.eventType !== 'IOT_TELEMETRY') return;

        let details = event.details;

        // Defensive: Parse details if it's a string (though API should have done it)
        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch (e) {
                console.warn("Failed to parse details", e);
            }
        }

        // Logic: Support both direct and nested telemetry (API variability)
        const telemetry = details?.iotTelemetry || event.iotTelemetry;

        if (!telemetry) {
            // Log parsing failure to UI for debugging
            const errorLog: EventLog = {
                id: events.length + 1,
                type: 'ERROR',
                timestamp: new Date(timestamp).toISOString(),
                details: { error: 'Missing iotTelemetry', raw: event }
            };
            setEvents(prev => [errorLog, ...prev]);
            return;
        }

        let type: SignalPoint['type'] = 'BLE_RSSI';
        let rssi: number | undefined;
        let confidence: number | undefined;
        let chartDetails: any = {};

        const detectedPos = telemetry.detectedPosition;
        const precisePos = telemetry.precisePosition;

        const isStrictTDOA = (pos: any) => pos && pos.computeType === 'CT_TDOA' && (pos.xPos !== 0 || pos.yPos !== 0);

        if (isStrictTDOA(detectedPos) || isStrictTDOA(precisePos)) {
            type = 'UWB_TDOA';
            confidence = detectedPos?.confidenceFactor || precisePos?.confidenceFactor || 0;
            chartDetails = {
                confidence,
                x: detectedPos?.xPos || precisePos?.xPos,
                y: detectedPos?.yPos || precisePos?.yPos,
                z: detectedPos?.zPos || precisePos?.zPos
            };
            if (onSignalDetected) onSignalDetected('UWB');
        } else {
            type = 'BLE_RSSI';
            if (event.maxDetectedRssi !== undefined && event.maxDetectedRssi !== 0) {
                rssi = event.maxDetectedRssi;
            } else if (telemetry.rssi) {
                rssi = telemetry.rssi;
            } else {
                rssi = -100;
            }
            chartDetails = { rssi, channel: telemetry.channel };
            if (onSignalDetected) onSignalDetected('BLE');
        }

        // Update Chart Data
        const newPoint: SignalPoint = {
            timestamp,
            timeLabel,
            type,
            rssi,
            confidence,
            value: type === 'UWB_TDOA' ? (confidence || 0) : (rssi || 0)
        };

        setData(prev => {
            const newData = [...prev, newPoint];
            if (newData.length > 50) return newData.slice(newData.length - 50);
            return newData;
        });

        // Update Event Log
        const newLog: EventLog = {
            id: events.length + 1,
            type,
            timestamp: new Date(timestamp).toISOString(),
            details: chartDetails
        };

        // Prepend to keep latest on top
        setEvents(prev => [newLog, ...prev]);
    };

    const downloadLogs = () => {
        const jsonString = JSON.stringify(events, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `signal-audit-${macAddress}-${new Date().toISOString()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        return () => stopStream();
    }, []);

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-zinc-400 font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        Signal Analysis (Live Stream)
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px] normal-case tracking-normal">
                            {localStorage.getItem('tenant_id') || 'No Tenant'} :: {macAddress}
                        </span>
                    </h3>
                    <div className="flex items-center gap-2">
                        {!isStreaming ? (
                            <button
                                onClick={startStream}
                                disabled={!apiKey || !macAddress}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                <Play className="w-3 h-3" /> Start Stream
                            </button>
                        ) : (
                            <button
                                onClick={stopStream}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors"
                            >
                                <Pause className="w-3 h-3" /> Stop
                            </button>
                        )}
                        <button
                            onClick={() => { setData([]); setEvents([]); }}
                            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                            title="Clear Data"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 text-red-200 text-xs rounded-xl border border-red-900/50">
                        Error: {error}
                    </div>
                )}

                <div className="h-[300px] w-full bg-black/20 rounded-xl p-2 border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="timeLabel"
                                stroke="#52525b"
                                fontSize={10}
                                tick={{ fill: '#71717a' }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#eab308" // Yellow for RSSI
                                fontSize={10}
                                label={{ value: 'RSSI (dBm)', angle: -90, position: 'insideLeft', fill: '#eab308', fontSize: 10 }}
                                domain={[-100, -20]}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#10b981" // Green for Confidence/TDOA
                                fontSize={10}
                                label={{ value: 'Confidence', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 10 }}
                                domain={[0, 10]}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                itemStyle={{ fontSize: '12px' }}
                                labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                            />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            <Line yAxisId="left" type="monotone" dataKey="rssi" name="BLE/RSSI" stroke="#eab308" dot={{ fill: '#eab308', r: 3 }} connectNulls />
                            <Line yAxisId="right" type="monotone" dataKey="confidence" name="UWB/TDOA Conf" stroke="#10b981" dot={{ fill: '#10b981', r: 3 }} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Count: {data.length}</span>
                    <span>Latest: {data[data.length - 1]?.timeLabel || '-'}</span>
                </div>
            </div>

            {/* Audit Trail Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black/20">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                    <h4 className="text-zinc-400 font-medium uppercase tracking-wider text-[10px]">Live Audit Trail</h4>
                    <button
                        onClick={downloadLogs}
                        disabled={events.length === 0}
                        className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition-colors disabled:opacity-50"
                    >
                        <Download className="w-3 h-3" /> Download JSON
                    </button>
                </div>

                <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                    <table className="w-full text-left text-[10px] font-mono">
                        <thead className="bg-zinc-900/50 text-zinc-500 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 w-16">#</th>
                                <th className="px-4 py-2 w-24">Type</th>
                                <th className="px-4 py-2 w-32">Timestamp</th>
                                <th className="px-4 py-2">Key Params (JSON)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {events.map((evt, idx) => (
                                <tr key={`evt-${evt.id}-${idx}`} className="hover:bg-zinc-800/10 transition-colors">
                                    <td className="px-4 py-2 text-zinc-500">{events.length - idx}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-1.5 py-0.5 rounded ${evt.type === 'UWB_TDOA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            {evt.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-zinc-400">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                                    <td className="px-4 py-2 text-zinc-300 truncate max-w-xs" title={JSON.stringify(evt.details)}>
                                        {JSON.stringify(evt.details)}
                                    </td>
                                </tr>
                            ))}
                            {events.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-600 italic">
                                        {isStreaming ? 'Waiting for events...' : 'Stream not running. Start stream to see live events.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* DEBUG PANEL */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-[10px] font-mono text-zinc-400 overflow-x-auto mt-6">
                    <h4 className="text-orange-500 font-bold mb-2">DEBUG INFO</h4>
                    <pre className="whitespace-pre-wrap srollbar-thin scrollbar-thumb-zinc-700">{debugInfo}</pre>
                </div>

            </div>
        </div>
    );
}
