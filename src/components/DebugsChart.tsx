"use client";

import { Activity } from "lucide-react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface DebugsChartProps {
    total: number;
    trends: { date: string; count: number }[];
}

export default function DebugsChart({ total, trends }: DebugsChartProps) {
    // Format dates for display
    const data = trends.map(t => ({
        ...t,
        dateLabel: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-8 items-center">
            {/* Left: Total Count */}
            <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-4 p-4 min-w-[200px]">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-4xl font-bold text-white tracking-tight">{total.toLocaleString()}</h2>
                    <p className="text-zinc-500 text-sm mt-1 font-medium">Debugs Performed</p>
                    <p className="text-xs text-zinc-600 mt-2">Successful devices debugged/troubleshooted</p>
                </div>
            </div>

            {/* Right: Chart */}
            <div className="flex-grow w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', fontSize: '12px' }}
                            itemStyle={{ color: '#818cf8' }}
                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                        />
                        <XAxis
                            dataKey="dateLabel"
                            stroke="#52525b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
