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
    // We want to show the last 24 hours in CET
    const processedStats = new Array(24).fill(0).map((_, i) => {
        const d = new Date();
        d.setHours(d.getHours() - (23 - i), 0, 0, 0);

        // Label in CET
        const hourLabel = d.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Europe/Amsterdam' }) + ':00';

        // Find stats matching this hour (DB stores UTC ISO strings)
        // We compare timestamp values to avoid timezone confusion
        const targetTime = d.getTime();

        // Helper to check if stat belongs to this hour bucket
        const isSameHour = (statIso: string) => {
            const statDate = new Date(statIso);
            // Relaxed check: withing same hour window
            return Math.abs(statDate.getTime() - targetTime) < 30 * 60 * 1000;
        };

        // Ideally, we trust the ISO string from DB.
        // stat.hour is "2023-10-27T10:00:00.000Z"
        // d is "2023-10-27T10:00:00.000Z" (local obj but represents absolute time)

        const uwb = stats.find(s => Math.abs(new Date(s.hour).getTime() - d.getTime()) < 1000 && s.type === 'UWB')?.count || 0;
        const ble = stats.find(s => Math.abs(new Date(s.hour).getTime() - d.getTime()) < 1000 && s.type === 'BLE')?.count || 0;

        return {
            name: hourLabel,
            UWB: uwb,
            BLE: ble
        };
    });

    // ...

    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
        <div>
            <span className="block text-zinc-500 text-xs uppercase">Firmware</span>
            <span className="text-zinc-300">{device.firmware || 'N/A'}</span>
        </div>
        <div>
            <span className="block text-zinc-500 text-xs uppercase">Last Seen (CET)</span>
            <span className="text-zinc-300">
                {device.lastSeen
                    ? new Date(device.lastSeen).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })
                    : 'Never'}
            </span>
        </div>
    </div>

    {/* Total Stats Display */ }
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
            </div >

        {/* Right Panel: Chart */ }
        < div className = "flex-1 min-h-[350px] bg-zinc-950/50 rounded-lg border border-zinc-800/50 p-4" >
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
            </div >

        </div >
    );
}
