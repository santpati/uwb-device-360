"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Globe, Play, Search, ArrowLeft, Paperclip } from "lucide-react";
import Link from 'next/link';
import DebugsChart from "@/components/DebugsChart";
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

interface DebugTrend {
    date: string;
    count: number;
}

interface AuditLogEntry {
    id: number;
    timestamp: string;
    event_type: string;
    sso_user: string;
    tenant_id: string;
    details: string;
}

interface FeedbackItem {
    id: number;
    timestamp: string;
    feedback: string;
    name?: string;
    email?: string;
    sso_user?: string;
    image_path?: string;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [trends, setTrends] = useState<TrendData[]>([]);
    const [debugTrends, setDebugTrends] = useState<DebugTrend[]>([]);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics/stats')
            .then(res => res.json())
            .then(data => {
                if (data.stats) {
                    setStats(data.stats);
                    setTrends(data.trends || []);
                    setDebugTrends(data.debugTrends || []);
                    setAuditLog(data.auditLog || []);
                    setFeedback(data.feedback || []);
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

                {/* Debugs Trend Widget */}
                {stats?.totalDebugs !== undefined && debugTrends.length > 0 && (
                    <DebugsChart
                        total={stats.totalDebugs}
                        trends={debugTrends}
                    />
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
                </div>

                {/* Audit Trail Table */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800">
                        <h3 className="text-zinc-300 font-medium uppercase tracking-wider text-xs">Audit Trail (Recent Sessions)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/50 text-zinc-500 font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Event ID</th>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Tenant</th>
                                    <th className="px-6 py-4">Event Type</th>
                                    <th className="px-6 py-4">Details / Devices Viewed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {auditLog.map((log) => {
                                    let detailsPretty = '-';
                                    try {
                                        if (log.details) {
                                            const d = JSON.parse(log.details);
                                            if (log.event_type === 'debug_device') {
                                                detailsPretty = `Device: ${d.mac} (${d.model || 'Unknown'})`;
                                            } else if (log.event_type === 'start_stream') {
                                                detailsPretty = `Stream: ${d.mac}`;
                                            } else {
                                                detailsPretty = JSON.stringify(d);
                                            }
                                        }
                                    } catch (e) {
                                        detailsPretty = log.details;
                                    }

                                    return (
                                        <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                                            <td className="px-6 py-4 font-mono text-zinc-500">#{log.id}</td>
                                            <td className="px-6 py-4 text-zinc-400 font-mono">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-white font-medium">{log.sso_user}</td>
                                            <td className="px-6 py-4 text-zinc-400 font-mono">{log.tenant_id}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${log.event_type === 'session_start' ? 'bg-blue-500/10 text-blue-400' :
                                                    log.event_type === 'debug_device' ? 'bg-purple-500/10 text-purple-400' :
                                                        'bg-orange-500/10 text-orange-400'
                                                    }`}>
                                                    {log.event_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-300 max-w-xs truncate">
                                                {detailsPretty}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {auditLog.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 italic">
                                            No events recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Feedback Table */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden mt-6">
                    <div className="p-6 border-b border-zinc-800">
                        <h3 className="text-zinc-300 font-medium uppercase tracking-wider text-xs">User Feedback / Wishes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-zinc-950/50 text-zinc-500 font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Feedback</th>
                                    <th className="px-6 py-4">Attachment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {feedback.map((item) => (
                                    <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="px-6 py-4 text-zinc-400 font-mono">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{item.name || item.sso_user || 'Anonymous'}</span>
                                                {item.email && <span className="text-zinc-500 text-[10px]">{item.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300 max-w-md whitespace-pre-wrap">
                                            {item.feedback}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.image_path ? (
                                                <a
                                                    href={item.image_path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                                                >
                                                    <Paperclip className="w-3 h-3" /> View Image
                                                </a>
                                            ) : (
                                                <span className="text-zinc-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {feedback.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">
                                            No feedback submitted yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
