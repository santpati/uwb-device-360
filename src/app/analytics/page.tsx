"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Globe, Play, Search, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

interface AnalyticsStats {
    totalUniqueUsers: number;
    totalTenants: number;
    totalSuccessfulSessions: number;
    totalDebugs: number;
    totalStreams: number;
}

interface TrendData {
    date: string;
    event_type: string;
    count: number;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics/stats')
            .then(res => res.json())
            .then(data => {
                if (data.stats) {
                    setStats(data.stats);
                    setTrends(data.trends || []);
                }
            })
            .catch(err => console.error("Failed to load analytics", err))
            .finally(() => setIsLoading(false));
    }, []);

    // Process trends for chart
    // Group by Date, then have keys for each event type
    const chartData = trends.reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.date === curr.date);
        if (existing) {
            existing[curr.event_type] = curr.count;
            return acc;
        }
        return [...acc, { date: curr.date, [curr.event_type]: curr.count }];
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 font-mono">
                Loading Analytics...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                    <div>
                        <Link href="/" className="text-zinc-500 hover:text-white flex items-center gap-2 mb-2 text-sm transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Debugger
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
                        <p className="text-zinc-400 mt-1">Real-time insights on dashboard utilization</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-500 font-mono">
                        Last Updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard
                        title="Unique Users"
                        value={stats?.totalUniqueUsers || 0}
                        icon={<Users className="w-5 h-5 text-indigo-400" />}
                        color="indigo"
                    />
                    <KPICard
                        title="Active Tenants"
                        value={stats?.totalTenants || 0}
                        icon={<Globe className="w-5 h-5 text-emerald-400" />}
                        color="emerald"
                    />
                    <KPICard
                        title="Total Sessions"
                        value={stats?.totalSuccessfulSessions || 0}
                        icon={<Activity className="w-5 h-5 text-blue-400" />}
                        color="blue"
                    />
                    <KPICard
                        title="Debugs Performed"
                        value={stats?.totalDebugs || 0}
                        icon={<Search className="w-5 h-5 text-purple-400" />}
                        color="purple"
                    />
                    <KPICard
                        title="Streams Started"
                        value={stats?.totalStreams || 0}
                        icon={<Play className="w-5 h-5 text-orange-400" />}
                        color="orange"
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 min-h-[400px]">
                        <h3 className="text-zinc-300 font-medium mb-6 uppercase tracking-wider text-xs">Activity Trends (Last 7 Days)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })} />
                                <YAxis stroke="#52525b" fontSize={10} />
                                <Tooltip
                                    cursor={{ fill: '#27272a' }}
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                    itemStyle={{ fontSize: '12px' }}
                                    labelStyle={{ color: '#a1a1aa', fontSize: '10px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Bar dataKey="debug_device" name="Debugs" fill="#a855f7" stackId="a" />
                                <Bar dataKey="start_stream" name="Streams" fill="#10b981" stackId="a" />
                                <Bar dataKey="session_start" name="Sessions" fill="#3b82f6" stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 min-h-[400px]">
                        <h3 className="text-zinc-300 font-medium mb-6 uppercase tracking-wider text-xs">Usage Composition</h3>
                        <div className="flex h-full items-center justify-center text-zinc-600 italic">
                            More detailed breakdown coming soon...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) {
    return (
        <div className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group hover:border-${color}-500/30 transition-colors`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity bg-${color}-500 blur-2xl w-24 h-24 rounded-full -mr-10 -mt-10`}></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{title}</span>
                <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                    {icon}
                </div>
            </div>
            <div className="text-3xl font-mono font-bold text-white relative z-10">
                {value.toLocaleString()}
            </div>
        </div>
    );
}
