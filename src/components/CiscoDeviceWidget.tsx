import { useState } from 'react';
import { ArrowUp, ArrowDown, Battery, Save, Activity, Wifi, Radio } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CiscoDeviceWidgetProps {
    device: any;
    stats: any[]; // Array of { hour: string, type: 'BLE'|'UWB', count: number }
    onMoveUp: () => void;
    onMoveDown: () => void;
    onSaveNotes: (mac: string, notes: string) => void;
}

export default function CiscoDeviceWidget({ device, stats, onMoveUp, onMoveDown, onSaveNotes }: CiscoDeviceWidgetProps) {
    const [notes, setNotes] = useState(device.notes || "");
    const [isSaving, setIsSaving] = useState(false);

    // Process stats for chart (Last 24h)
    // We need to group by hour
    const processedStats = new Array(24).fill(0).map((_, i) => {
        const d = new Date();
        d.setHours(d.getHours() - (23 - i), 0, 0, 0);
        const hourIso = d.toISOString();
        const hourLabel = d.getHours() + ':00'; // Local time grouping roughly

        // Find stats for this hour (roughly match ISO string prefix)
        // Actually, let's just use exact string matching from DB if timezone aligns, 
        // OR parse dates. Parsing is safer.
        const uwb = stats.find(s => new Date(s.hour).getHours() === d.getHours() && s.type === 'UWB')?.count || 0;
        const ble = stats.find(s => new Date(s.hour).getHours() === d.getHours() && s.type === 'BLE')?.count || 0;

        return {
            name: hourLabel,
            UWB: uwb,
            BLE: ble
        };
    });

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveNotes(device.mac, notes);
        setTimeout(() => setIsSaving(false), 500);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 shadow-lg">

            {/* Left Panel: Identity & Controls */}
            <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-white font-mono text-lg font-bold">{device.mac}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{device.model || 'Unknown Model'}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{device.vendor || 'Cisco'}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <button onClick={onMoveUp} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                            <ArrowUp size={16} />
                        </button>
                        <button onClick={onMoveDown} className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors">
                            <ArrowDown size={16} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase">Firmware</span>
                        <span className="text-zinc-300">{device.firmware || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase">Battery</span>
                        <div className="flex items-center gap-2">
                            <Battery size={14} className={device.battery < 20 ? 'text-red-500' : 'text-green-500'} />
                            <span className="text-zinc-300">{device.battery !== null ? `${device.battery}%` : 'N/A'}</span>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <span className="block text-zinc-500 text-xs uppercase">Last Seen</span>
                        <span className="text-zinc-300">{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <span className="block text-zinc-500 text-xs uppercase mb-1">Notes</span>
                    <div className="flex gap-2">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none resize-none h-20"
                            placeholder="Enter device notes..."
                        />
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="mt-2 text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                    >
                        <Save size={12} />
                        {isSaving ? 'Saving...' : 'Save Notes'}
                    </button>
                </div>
            </div>

            {/* Right Panel: Chart */}
            <div className="flex-1 min-h-[250px] bg-zinc-950/50 rounded-lg border border-zinc-800/50 p-4">
                <h4 className="text-zinc-400 text-xs uppercase font-medium mb-4 flex items-center gap-2">
                    <Activity size={14} /> 24h Signal Activity (UWB vs BLE)
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={processedStats}>
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tick={{ fill: '#52525b' }} interval={3} />
                        <YAxis stroke="#52525b" fontSize={10} tick={{ fill: '#52525b' }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                        <Bar name="UWB (TDoA)" dataKey="UWB" fill="#10b981" radius={[2, 2, 0, 0]} stackId="a" />
                        <Bar name="BLE (RSSI)" dataKey="BLE" fill="#6366f1" radius={[2, 2, 0, 0]} stackId="a" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
