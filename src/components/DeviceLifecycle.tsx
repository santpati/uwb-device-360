
"use client";

import React, { useEffect, useState } from 'react';
import { fetchProxy } from '@/lib/api';
import { History, Circle, ArrowRight } from 'lucide-react';

interface LifecycleEvent {
    create_time: number;
    type?: string;
    requestType?: string; // API likely returns requestType or eventType
    operationtype?: string; // User requested field
    status?: string;
    statusmsg?: string; // User requested field
    description?: string;
    id?: string;
}

interface DeviceLifecycleProps {
    macAddress: string;
    sysToken: string;
    userAccessToken?: string;
}

export default function DeviceLifecycle({ macAddress, sysToken, userAccessToken }: DeviceLifecycleProps) {
    const [events, setEvents] = useState<LifecycleEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            if (!macAddress || !sysToken) return;
            setLoading(true);
            setError(null);
            try {
                // URL encode the MAC address for the 'value' param
                // cURL: value=fc%3A58%3A9a%3A1e%3A3a%3A5e
                // We should use encodeURIComponent but colon might need special handling if API is strict? 
                // Usually encodeURIComponent works.
                const encodedMac = encodeURIComponent(macAddress);

                const res = await fetchProxy<any>({
                    targetUrl: `https://dnaspaces.io/api/edm/v1/device/ap/request-history?page=1&pageSize=100&sortBy=create_time&sortType=ASCENDING&key=devicekey&condition=EQUALS&value=${encodedMac}`,
                    sysToken: sysToken,
                    userAccessToken: userAccessToken
                });



                if (Array.isArray(res)) {
                    setEvents(res);
                } else if (res && res.requests && Array.isArray(res.requests)) {
                    setEvents(res.requests);
                } else if (res && res.content && Array.isArray(res.content)) {
                    setEvents(res.content);
                } else if (res && res.events && Array.isArray(res.events)) {
                    // Sometimes APIs use 'events' or other keys
                    setEvents(res.events);
                } else if (res && res.history && Array.isArray(res.history)) {
                    setEvents(res.history);
                } else {
                    console.warn("Unexpected lifecycle response format:", res);
                    setEvents([]);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load history');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [macAddress, sysToken, userAccessToken]);

    if (!macAddress) return null;

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-zinc-400 font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Device Lifecycle
                </h3>
                <span className="text-[10px] text-zinc-600 font-mono">Last 100 Events</span>
            </div>

            {loading ? (
                <div className="h-24 flex items-center justify-center text-zinc-600 text-sm animate-pulse">
                    Loading history...
                </div>
            ) : error ? (
                <div className="h-24 flex items-center justify-center text-red-400/50 text-xs">
                    {error}
                </div>
            ) : events.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-zinc-700 italic border-2 border-dashed border-zinc-800/50 rounded-xl">
                    No history found
                </div>
            ) : (
                <div className="relative">
                    {/* Horizontal Scroll Container */}
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        {events.map((evt, idx) => (
                            <div key={idx} className="flex-none w-48 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3 flex flex-col gap-2 group hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                                    <span>{evt.create_time ? new Date(evt.create_time).toLocaleDateString() : '-'}</span>
                                    <span>{evt.create_time ? new Date(evt.create_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-full text-indigo-400">
                                        <History className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-200 truncate" title={evt.operationtype || evt.requestType || evt.type || 'Event'}>
                                        {evt.operationtype || evt.requestType || evt.type || 'Event'}
                                    </span>
                                </div>

                                {(evt.statusmsg || evt.status || evt.description) && (
                                    <div className="text-[10px] text-zinc-500 truncate" title={evt.description || evt.statusmsg || evt.status}>
                                        {evt.statusmsg || evt.status || evt.description}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Fade Overlays */}
                    <div className="absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-zinc-900/90 to-transparent pointer-events-none" />
                    <div className="absolute top-0 left-0 bottom-4 w-4 bg-gradient-to-r from-zinc-900/90 to-transparent pointer-events-none" />
                </div>
            )}
        </div>
    );
}
