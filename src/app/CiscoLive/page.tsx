"use client";
import { useState, useEffect } from 'react';
import CiscoDeviceWidget from '@/components/CiscoDeviceWidget';

export default function CiscoLivePage() {
    const [devices, setDevices] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/ciscolive/data');
            const json = await res.json();
            if (json.devices) {
                setDevices(json.devices);
                setStats(json.stats);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === devices.length - 1) return;

        const newDevices = [...devices];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap
        [newDevices[index], newDevices[targetIndex]] = [newDevices[targetIndex], newDevices[index]];
        setDevices(newDevices);

        // Update Backend
        // We need to update indices for BOTH swapped items
        await fetch('/api/ciscolive/data', {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateLayout',
                mac: newDevices[index].mac, // The one now at 'index' (was at targetIndex)
                payload: index
            })
        });
        await fetch('/api/ciscolive/data', {
            method: 'POST',
            body: JSON.stringify({
                action: 'updateLayout',
                mac: newDevices[targetIndex].mac, // The one now at 'targetIndex'
                payload: targetIndex
            })
        });
    };

    const handleSaveNotes = async (mac: string, notes: string) => {
        await fetch('/api/ciscolive/data', {
            method: 'POST',
            body: JSON.stringify({ action: 'updateNotes', mac, payload: notes })
        });
        // Optimistic update done via simple re-fetch or could update local state
        // Re-fetch next poll will catch it, but let's update local to avoid jitter
        setDevices(prev => prev.map(d => d.mac === mac ? { ...d, notes } : d));
    };

    if (loading && devices.length === 0) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading CiscoLive Dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Cisco Live EMEA Debugger</h1>
                    <p className="text-zinc-500 text-sm mt-1 font-mono">Tenant 23285 | UWB Performance Monitor</p>
                </div>
                <div className="text-right">
                    <span className="text-xs uppercase text-zinc-600 block">Total Devices</span>
                    <span className="text-xl font-mono">{devices.length}</span>
                </div>
            </header>

            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
                {devices.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600">
                        No UWB devices found in database.
                        <br /><span className="text-xs">Ensure the backend worker is running to populate devices.</span>
                    </div>
                ) : (
                    devices.map((device, index) => (
                        <CiscoDeviceWidget
                            key={device.mac}
                            device={device}
                            stats={stats.filter(s => s.mac === device.mac)}
                            onMoveUp={() => handleMove(index, 'up')}
                            onMoveDown={() => handleMove(index, 'down')}
                            onSaveNotes={handleSaveNotes}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
