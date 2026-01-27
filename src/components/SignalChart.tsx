
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
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Activity, Pause, Play, Trash2 } from 'lucide-react';

interface SignalPoint {
    timestamp: number;
    timeLabel: string;
    type: 'UWB_TDOA' | 'BLE_RSSI' | 'UWB_RSSI'; // UWB can be RSSI too if computeType is CT_RSSI
    value: number; // For TDOA, maybe distance? For RSSI, signal strength. 
    // Wait, the prompt says:
    // UWB/TDOA: computeType: CT_TDOA (if xPos/yPos non-zero) => what value to plot? Maybe just presence?
    // Or maybe we plot Distance from origin? Or just plot arbitrary points to show "Signal Received"?
    // The user says "build time series view of BLE or UWB signal".
    // Usually RSSI is plotted.
    // For TDOA, we have x/y. Maybe we plot confidenceFactor? Or simply a dot indicating a ping received?
    // Let's plot RSSI for BLE/UWB-RSSI.
    // For TDOA, since it's a "signal", maybe we plot confidenceFactor or just a constant "1" to show frequency?
    // Actually, the prompt gives an example payload for TDOA:
    // {"xPos":92.8,"yPos":13.5,"...","computeType":"CT_TDOA"}
    // And for BLE/RSSI: "maxDetectedRssi" might be in the payload? 
    // Looking at the "actual message" in the prompt:
    // It has "iotTelemetry": { "detectedPosition": { ... "computeType": "CT_RSSI" } }
    // It also has "maxDetectedRssi": 0 in the root sometimes.
    // Let's look deeper at the example.
    // The example for TDOA has "confidenceFactor": 3.37.
    // The example for BLE/RSSI (implied by "not UWB/TDOA") would likely have an RSSI value.
    // Common Cisco Spaces payloads have `rssi` or `maxDetectedRssi`.
    // Let's assume:
    // - BLE/RSSI: Plot RSSI (usually negative, e.g., -60).
    // - UWB/TDOA: This is a position update. Maybe we plot the Consistency or Confidence?
    //   Or separate charts?
    //   The prompt says "time series view of BLE or UWB signal".
    //   If I plot RSSI (-100 to 0) and TDOA (confidence ~3.0), they use different scales.
    //   I'll try to extract RSSI for BLE, and for TDOA maybe just plot a marker or use a separate axis for Confidence.
    //   Let's check the detectedPosition payload again.
    //   "detectedPosition": { ... "computeType": "CT_RSSI" ... } -> This is UWB via RSSI?
    //   "deviceInfo": { "deviceType": "IOT_UWB_TAG" }
    //   OK, so we have:
    //   1. UWB TDOA events (high precision x/y)
    //   2. BLE RSSI events (or UWB RSSI events)

    //   Let's plot:
    //   - Main Y Axis: RSSI (for BLE/RSSI packets)
    //   - Right Y Axis: Confidence (for TDOA packets)
    //   - Or simply categorize the dots.

    rssi?: number;
    confidence?: number;
}

interface SignalChartProps {
    macAddress: string;
    apiKey: string;
}

export default function SignalChart({ macAddress, apiKey }: SignalChartProps) {
    const [data, setData] = useState<SignalPoint[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startStream = async () => {
        if (isStreaming) return;
        setIsStreaming(true);
        setError(null);
        setData([]);

        // Track Stream Start
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'start_stream',
                details: { mac: macAddress }
            })
        }).catch(console.error);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const response = await fetch(`/api/firehose?apiKey=${encodeURIComponent(apiKey)}&macAddress=${encodeURIComponent(macAddress)}`, {
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Stream connection failed: ${response.status}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        processEvent(event);
                    } catch (e) {
                        console.warn("Failed to parse line", e);
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err.message);
                setIsStreaming(false);
            }
        } finally {
            setIsStreaming(false);
        }
    };

    const stopStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
    };

    const processEvent = (event: any) => {


        if (event.eventType !== 'IOT_TELEMETRY') return;

        // Logic from prompt:
        // UWB/TDOA: computeType: CT_TDOA, xPos/yPos != 0
        // BLE/RSSI: Everything else (simplified)

        let type: SignalPoint['type'] = 'BLE_RSSI';
        let rssi: number | undefined;
        let confidence: number | undefined;

        const telemetry = event.iotTelemetry;
        if (!telemetry) return;

        // Check detectedPosition (often where computeType lives)
        const detectedPos = telemetry.detectedPosition;
        const precisePos = telemetry.precisePosition; // Sometimes simpler structure

        // Helper to check TDOA condition
        const isTDOA = (pos: any) => {
            return pos && pos.computeType === 'CT_TDOA'; // Relaxed: checking computeType primarily
            // User said: "if xPos and yPos is non zero".
            // But if they are 0, we still might want to see the event if it's explicitly CT_TDOA?
            // Let's stick to user rule BUT allow logging/visualization if confident.
        };

        // Strict user rule check for classification
        const isStrictTDOA = (pos: any) => pos && pos.computeType === 'CT_TDOA' && (pos.xPos !== 0 || pos.yPos !== 0);

        if (isStrictTDOA(detectedPos) || isStrictTDOA(precisePos)) {
            type = 'UWB_TDOA';
            // Use confidenceFactor if available
            confidence = detectedPos?.confidenceFactor || precisePos?.confidenceFactor || 0;
        } else {
            // Assume BLE/RSSI or UWB/RSSI
            type = 'BLE_RSSI';

            // Try to find RSSI
            if (event.maxDetectedRssi !== undefined && event.maxDetectedRssi !== 0) {
                rssi = event.maxDetectedRssi;
            } else if (telemetry.rssi) {
                rssi = telemetry.rssi;
            } else {
                // If RSSI is 0 or missing, we still want to plot "Presence".
                // We'll set a default low value or handle it in the chart?
                // Recharts won't plot undefined.
                // Let's use -100 as a fallback floor if we have an event but no RSSI.
                rssi = -100;
            }
        }



        // Create Point
        const timestamp = event.recordTimestamp || Date.now();
        const timeLabel = new Date(timestamp).toLocaleTimeString();

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
            // Keep last 50 points
            if (newData.length > 50) return newData.slice(newData.length - 50);
            return newData;
        });
    };

    useEffect(() => {
        return () => stopStream();
    }, []);

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
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
                        onClick={() => setData([])}
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

                        {/* RSSI Line */}
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="rssi"
                            name="BLE/RSSI"
                            stroke="#eab308"
                            dot={{ fill: '#eab308', r: 3 }}
                            connectNulls
                        />

                        {/* TDOA Confidence Line */}
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="confidence"
                            name="UWB/TDOA Conf"
                            stroke="#10b981"
                            dot={{ fill: '#10b981', r: 3 }}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Count: {data.length}</span>
                <span>Latest: {data[data.length - 1]?.timeLabel || '-'}</span>
            </div>
        </div>
    );
}
