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

    // Calculate Totals
    const totalUWB = stats.filter(s => s.type === 'UWB').reduce((acc, curr) => acc + curr.count, 0);
    const totalBLE = stats.filter(s => s.type === 'BLE').reduce((acc, curr) => acc + curr.count, 0);

    const handleSave = async () => {
        setIsSaving(true);
        await onSaveNotes(device.mac, notes);
        setTimeout(() => setIsSaving(false), 500);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 shadow-lg">

            {/* Left Panel: Identity & Controls */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
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

                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase">Firmware</span>
                        <span className="text-zinc-300">{device.firmware || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-xs uppercase">Last Seen</span>
                        <span className="text-zinc-300">{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</span>
                    </div>
                </div>

                {/* Total Stats Display */}
                <div className="grid grid-cols-2 gap-4 mt-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                    <div>
                        <span className="block text-zinc-500 text-[10px] uppercase">Total UWB (24h)</span>
                        <div className="flex items-center gap-2 mt-1">
                            <Radio size={14} className="text-emerald-500" />
                            <span className="text-xl font-mono text-white">{totalUWB.toLocaleString()}</span>
                        </div>
                    </div>
                    <div>
                        <span className="block text-zinc-500 text-[10px] uppercase">Total BLE (24h)</span>
                        <div className="flex items-center gap-2 mt-1">
                            <Wifi size={14} className="text-indigo-500" />
                            <span className="text-xl font-mono text-white">{totalBLE.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-2 flex-1 flex flex-col">
                    <span className="block text-zinc-500 text-xs uppercase mb-1">Notes</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none resize-none flex-1 min-h-[80px]"
                        placeholder="Enter device notes..."
                    />
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="mt-2 text-xs flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded transition-colors disabled:opacity-50"
                    >
                        <Save size={12} />
                        {isSaving ? 'Saving...' : 'Save Notes'}
                    </button>
                </div>
            </div>

            {/* Right Panel: Chart */}
            <div className="flex-1 min-h-[350px] bg-zinc-950/50 rounded-lg border border-zinc-800/50 p-4">
                <h4 className="text-zinc-400 text-xs uppercase font-medium mb-4 flex items-center gap-2">
                    <Activity size={14} /> Signal Distribution (Events per Hour)
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={processedStats} barGap={0} barCategoryGap="20%">
                        <XAxis dataKey="name" stroke="#52525b" fontSize={10} tick={{ fill: '#52525b' }} />
                        <YAxis stroke="#52525b" fontSize={10} tick={{ fill: '#52525b' }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                            itemStyle={{ fontSize: '12px' }}
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Bar name="UWB (TDoA)" dataKey="UWB" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar name="BLE (RSSI)" dataKey="BLE" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
