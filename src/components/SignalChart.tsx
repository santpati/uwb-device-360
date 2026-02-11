
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
    const abortControllerRef = useRef<AbortController | null>(null);

    const [lastTimestamp, setLastTimestamp] = useState<number>(Date.now() - 10000); // Start looking 10s back
    const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for stable access to state inside recursive polling function
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
            if (!tenantId || isStreamingRef.current) return; // Use ref for latest streaming status

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
    }, []); // Empty dependency array means this runs once on mount

    const startStream = async () => {
        if (isStreamingRef.current) return; // Use ref for latest streaming status
        setIsStreaming(true);
        setError(null);
        setData([]);
        setEvents([]);
        setLastTimestamp(Date.now() - 10000);

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
        const tenantId = localStorage.getItem('tenant_id');
        if (tenantId) {
            fetch('/api/firehose/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, apiKey })
            }).catch(console.error);
        }

        // Start Polling Loop
        pollEvents();
    };

    // Redefine pollEvents to be stable and use Refs for state that changes
    const pollEvents = async () => {
        if (!isStreamingRef.current) return;

        try {
            const tenantId = localStorage.getItem('tenant_id');
            if (!tenantId) {
                console.error("No tenant ID found");
                return;
            }

            const since = lastTimestampRef.current;
            const cleanMac = macAddress.replace(/:/g, '').toLowerCase();
            const res = await fetch(`/api/firehose?tenantId=${tenantId}&macAddress=${cleanMac}&since=${since}`);
            if (!res.ok) throw new Error("Failed to fetch events");

            const json = await res.json();
            if (json.events && json.events.length > 0) {
                const maxTime = Math.max(...json.events.map((e: any) => e.timestamp));
                setLastTimestamp(maxTime); // This updates Ref via effect

                // Process events
                json.events.forEach((e: any) => processEvent(e));
            }

        } catch (e: any) {
            console.error("Polling error", e);
        } finally {
            // Schedule next poll if still streaming
            if (isStreamingRef.current) {
                pollingTimeoutRef.current = setTimeout(pollEvents, 1000);
            }
        }
    };

    const stopStream = () => {
        if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        setIsStreaming(false);
    };

    const processEvent = (event: any) => {
        if (event.eventType !== 'IOT_TELEMETRY') return;

        let type: SignalPoint['type'] = 'BLE_RSSI';
        let rssi: number | undefined;
        let confidence: number | undefined;
        let details: any = {};

        // Fix: API returns details object which contains iotTelemetry
        const telemetry = event.details?.iotTelemetry || event.iotTelemetry;
        if (!telemetry) return;

        const detectedPos = telemetry.detectedPosition;
        const precisePos = telemetry.precisePosition;

        const isStrictTDOA = (pos: any) => pos && pos.computeType === 'CT_TDOA' && (pos.xPos !== 0 || pos.yPos !== 0);

        if (isStrictTDOA(detectedPos) || isStrictTDOA(precisePos)) {
            type = 'UWB_TDOA';
            confidence = detectedPos?.confidenceFactor || precisePos?.confidenceFactor || 0;
            details = {
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
            details = { rssi, channel: telemetry.channel };
            if (onSignalDetected) onSignalDetected('BLE');
        }

        const timestamp = event.recordTimestamp || Date.now();
        const timeLabel = new Date(timestamp).toLocaleTimeString();

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
            details
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
            </div>
        </div>
    );
}
