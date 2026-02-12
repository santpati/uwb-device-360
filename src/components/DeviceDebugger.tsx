import { useState, useEffect } from "react";
import { Search, MapPin, Wifi, Box, History as HistoryIcon, Activity, Radio, CheckCircle2 } from "lucide-react";
import confetti from 'canvas-confetti';
import { fetchProxy } from "@/lib/api";
import SignalChart from "@/components/SignalChart";
import DeviceLifecycle from "@/components/DeviceLifecycle";
import BatteryLevel from "@/components/BatteryLevel";
import LocationMap from "@/components/LocationMap";

interface DeviceInfo {
    macAddress: string;
    name?: string;
    createTime?: string;
    lastSeenTime?: string;
    batteryStatus?: string | number;
    firmwareVersion?: string;
    claimed?: boolean;
    model?: string;
    make?: string;
    serialNumber?: string;
    productId?: string;
    vendor?: string;
}

interface LocationInfo {
    latitude: number;
    longitude: number;
    computeType?: string;
    lastLocatedTime?: number;
}

interface Tokens {
    sys: string;
    user: string;
    tenant: string;
    firehoseApiKey?: string;
    ssoUser?: string;
    exp?: number;
}

interface DeviceDebuggerProps {
    tokens: Tokens;
    initialMac?: string;
    onMacUpdate?: (mac: string) => void;
    isActive: boolean;
}

export default function DeviceDebugger({ tokens, initialMac = "", onMacUpdate, isActive }: DeviceDebuggerProps) {
    // State
    const [deviceMac, setDeviceMac] = useState(initialMac);
    const [signalsDetected, setSignalsDetected] = useState({ ble: false, uwb: false });
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showRecent, setShowRecent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [deviceData, setDeviceData] = useState<DeviceInfo | null>(null);
    const [locationData, setLocationData] = useState<LocationInfo | null>(null);
    const [claimedDevices, setClaimedDevices] = useState<any[]>([]);

    const handleSignalDetected = (type: 'BLE' | 'UWB') => {
        setSignalsDetected(prev => {
            if (type === 'UWB' && !prev.uwb) {
                // Trigger Confetti on First UWB Pulse
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#10b981', '#34d399', '#059669', '#ffffff'] // Green/White theme
                });
                return { ...prev, uwb: true };
            }
            if (type === 'BLE' && !prev.ble) {
                return { ...prev, ble: true };
            }
            return prev;
        });
    };

    const handleRealtimeEvent = (event: any) => {
        // 1. Update Location
        if (event.eventType === 'IOT_TELEMETRY') {
            const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
            const telemetry = details?.iotTelemetry || event.iotTelemetry;

            if (telemetry) {
                // Location
                const pos = telemetry.precisePosition || telemetry.detectedPosition;
                if (pos && (pos.xPos !== 0 || pos.yPos !== 0) && pos.latitude && pos.longitude) {
                    setLocationData({
                        latitude: pos.latitude,
                        longitude: pos.longitude,
                        computeType: pos.computeType,
                        lastLocatedTime: event.timestamp
                    });
                }

                // Battery (if available in stream)
                // Note: Firehose IOT_TELEMETRY sometimes has battery in additionalInfo or batteryLevel field
                // We'll check common paths.
                const battery = telemetry.batteryLevel || telemetry.additionalInfo?.batteryLevel;
                if (battery !== undefined) {
                    setDeviceData(prev => prev ? ({ ...prev, batteryStatus: battery }) : null);
                }
            }
        }
    };

    // Fetch Claimed Devices on Mount
    useEffect(() => {
        const fetchDevices = async () => {
            if (!tokens?.sys) return;

            try {
                const res = await fetchProxy<any>({
                    targetUrl: `https://dnaspaces.io/api/edm/v1/device/partner/claimedbeacons?page=1&pageSize=100&sortBy=create_time&sortType=DESCENDING`,
                    sysToken: tokens.sys,
                    userAccessToken: tokens.user || ""
                });

                if (res && res.devices) {
                    const TARGET_MODELS = ['QORVO-UWB', 'SPACES-CT-UB'];
                    const filtered = res.devices.filter((d: any) =>
                        TARGET_MODELS.some(m => d.model?.toUpperCase().includes(m)) ||
                        TARGET_MODELS.includes(d.model?.toUpperCase())
                    );
                    setClaimedDevices(filtered);
                }
            } catch (e) {
                console.error("Failed to load claimed devices", e);
            }
        };

        fetchDevices();
    }, [tokens]);

    // Load History
    useEffect(() => {
        const stored = localStorage.getItem("mac_history");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setRecentSearches(parsed);
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const saveToHistory = (mac: string) => {
        if (!mac) return;
        const normalized = mac.trim();
        setRecentSearches(prev => {
            const filtered = prev.filter(item => item.toLowerCase() !== normalized.toLowerCase());
            const newHistory = [normalized, ...filtered].slice(0, 5);
            localStorage.setItem("mac_history", JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const handleSearch = async () => {
        if (!tokens || !deviceMac) return;
        setIsLoading(true);
        // Don't clear immediately to avoid flickering if we are just refreshing
        // setDeviceData(null); 
        // setLocationData(null);

        if (onMacUpdate) onMacUpdate(deviceMac);
        const cleanMac = deviceMac.trim();
        const cleanMacNoColons = cleanMac.replace(/:/g, "");

        try {
            // 1. Fetch Claimed Device Info (Metadata)
            // Note: This only checks the most recent 100 devices. 
            // If the device is older, it might not be found here, but might still be found in beacon/floor.
            const claimedPromise = fetchProxy<any>({
                targetUrl: `https://dnaspaces.io/api/edm/v1/device/partner/claimedbeacons?page=1&pageSize=100&sortBy=create_time&sortType=DESCENDING`,
                sysToken: tokens.sys,
                userAccessToken: tokens.user
            });

            // 2. Fetch Beacon/Floor Info (Rich Status: Battery, Location)
            // Try BOTH formats (with and without colons) as APIs can be inconsistent
            const statusPromise1 = fetchProxy<any>({
                targetUrl: `https://dnaspaces.io/api/edm/v1/device/beacon/floor?page=1&pageSize=50&key=mac&condition=EQUALS&value=${encodeURIComponent(cleanMac)}`,
                sysToken: tokens.sys,
                userAccessToken: tokens.user
            });

            const statusPromise2 = fetchProxy<any>({
                targetUrl: `https://dnaspaces.io/api/edm/v1/device/beacon/floor?page=1&pageSize=50&key=mac&condition=EQUALS&value=${encodeURIComponent(cleanMacNoColons)}`,
                sysToken: tokens.sys,
                userAccessToken: tokens.user
            });

            const [claimedRes, statusRes1, statusRes2] = await Promise.all([claimedPromise, statusPromise1, statusPromise2]);

            let mergedDevice: DeviceInfo = { macAddress: cleanMac };
            let mergedLocation: LocationInfo | null = null;
            let statusRes = null;

            // Determine which status request succeeded
            if (statusRes1 && Array.isArray(statusRes1) && statusRes1.length > 0) {
                statusRes = statusRes1;
            } else if (statusRes2 && Array.isArray(statusRes2) && statusRes2.length > 0) {
                statusRes = statusRes2;
            }

            // Process Claimed Info
            if (claimedRes && claimedRes.devices) {
                const found = claimedRes.devices.find((d: any) =>
                    d.macAddress?.toLowerCase().includes(cleanMac.toLowerCase().replace(/:/g, "")) ||
                    d.mac?.toLowerCase().includes(cleanMac.toLowerCase().replace(/:/g, ""))
                );
                if (found) {
                    saveToHistory(found.macAddress || found.mac || cleanMac);
                    mergedDevice = {
                        ...mergedDevice,
                        macAddress: found.macAddress || found.mac,
                        name: found.name,
                        createTime: found.create_time,
                        lastSeenTime: found.lastseen,
                        batteryStatus: found.batteryLevel, // Fallback
                        firmwareVersion: found.firmware,
                        claimed: true,
                        model: found.model,
                        make: found.make,
                        serialNumber: found.serial_number,
                        vendor: found.vendor
                    };
                }
            }

            // Process Beacon/Floor Info (Overrides with fresher data)
            if (statusRes && Array.isArray(statusRes) && statusRes.length > 0) {
                // API returns array of matches
                const status = statusRes[0];
                if (status) {
                    // Update Device Info
                    mergedDevice.batteryStatus = status.batteryLevel ?? mergedDevice.batteryStatus;
                    mergedDevice.lastSeenTime = status.lastLocatedTime ?? status.lastSeen ?? mergedDevice.lastSeenTime;

                    if (status.deviceProfile) {
                        mergedDevice.model = status.deviceProfile.model || mergedDevice.model;
                        mergedDevice.vendor = status.deviceProfile.vendor || mergedDevice.vendor;
                    }

                    // Update Location Info
                    if (status.geoCoordinates) {
                        mergedLocation = {
                            latitude: status.geoCoordinates[0],
                            longitude: status.geoCoordinates[1],
                            computeType: status.computeType || 'Unknown',
                            lastLocatedTime: status.lastLocatedTime
                        };
                    } else if (status.location && status.location.x && status.location.y) {
                        // If we only have X/Y but not Lat/Long, we can't map it easily on Leaflet without a floorplan.
                        // But usually beacon/floor returns geoCoordinates if the floor is geo-aligned.
                    }
                }
            }

            // Only update state if we found *something*
            if (mergedDevice.model || mergedLocation || mergedDevice.createTime) {
                setDeviceData(mergedDevice as DeviceInfo);
                setLocationData(mergedLocation);
            } else {
                setDeviceData(null);
                setLocationData(null);

                const debugMsg = `
Device not found.

Debug Info:
- Claimed API: Success (Scanned ${claimedRes?.devices?.length || 0} recent devices)
- Floor API (Mac formatted): ${statusRes1?.length ? 'Match Found' : 'No Match'}
- Floor API (Raw): ${statusRes2?.length ? 'Match Found' : 'No Match'}

Tips:
- Ensure the device is claimed or active.
- Try checking the MAC address format.
                `;
                alert(debugMsg.trim());
            }

        } catch (e: any) {
            console.error(e);
            if (e.status === 401) alert("Session Expired");
            else alert("Error searching for device. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    // ... (Render)
    return (
        <div className="flex flex-col gap-6">
            {/* ... (Search Bar) ... */}
            <div className="flex flex-col items-center justify-center py-8 border-b border-zinc-900/50">
                <div className="relative w-full max-w-2xl group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-50" />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center p-2 shadow-2xl focus-within:border-indigo-500/50 transition-colors">
                        <Search className="w-5 h-5 text-zinc-500 ml-4" />
                        <input
                            type="text"
                            value={deviceMac}
                            onChange={(e) => setDeviceMac(e.target.value)}
                            onFocus={() => setShowRecent(true)}
                            onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                            placeholder="Search Device MAC (e.g. AA:BB:CC...)"
                            className="w-full bg-transparent border-none text-white p-4 focus:ring-0 placeholder:text-zinc-600 font-mono text-lg"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !deviceMac}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            {isLoading ? 'Scanning...' : 'Debug'}
                        </button>
                    </div>
                    {/* Search Dropdown (Recent + Claimed) */}
                    {(showRecent && (recentSearches.length > 0 || claimedDevices.length > 0)) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-20 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">

                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium bg-zinc-950/50 sticky top-0">Recent Searches</div>
                                    {recentSearches.map((mac) => (
                                        <button
                                            key={`recent-${mac}`}
                                            onMouseDown={(e) => { e.preventDefault(); setDeviceMac(mac); setShowRecent(false); }}
                                            className="w-full text-left px-4 py-3 text-zinc-300 font-mono hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors border-b border-zinc-800/50 flex items-center justify-between"
                                        >
                                            <span className="font-mono">{mac}</span>
                                            <HistoryIcon className="w-3 h-3 opacity-50" />
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Claimed Devices */}
                            {claimedDevices.length > 0 && (
                                <>
                                    <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium bg-zinc-950/50 sticky top-0 border-t border-zinc-800">Claimed Devices</div>
                                    {claimedDevices.map((device, idx) => (
                                        <button
                                            key={`claimed-${device.macAddress || device.mac}-${idx}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setDeviceMac(device.macAddress || device.mac);
                                                setShowRecent(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors border-b border-zinc-800/50 flex flex-col gap-1"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-mono text-sm">{device.macAddress || device.mac}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {device.model}
                                                </span>
                                            </div>
                                            {device.name && (
                                                <span className="text-xs text-zinc-500 truncate">{device.name}</span>
                                            )}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Device Info Card */}
                <div className="col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                    {/* ... (Header) ... */}
                    <h3 className="text-zinc-400 font-medium mb-6 uppercase tracking-wider text-xs flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Device Identity
                    </h3>

                    {deviceData ? (
                        <div className="space-y-4">
                            <div>
                                <span className="block text-zinc-500 text-sm">MAC Address</span>
                                <span className="font-mono text-xl text-white block mt-1">{deviceData.macAddress}</span>
                            </div>
                            {/* ... (Other fields) ... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-zinc-500 text-sm">Name</span>
                                    <span className="text-zinc-300 block mt-1 text-sm truncate">{deviceData.name || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 text-sm">Status</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${deviceData.claimed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {deviceData.claimed ? 'Claimed' : 'Unclaimed'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                                <div>
                                    <span className="block text-zinc-500 text-xs uppercase tracking-wider">Make / Model</span>
                                    <div className="mt-1">
                                        <span className="block text-white text-sm">{deviceData.make || '-'}</span>
                                        <span className="block text-zinc-500 text-xs">{deviceData.model}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 text-xs uppercase tracking-wider">Firmware</span>
                                    <span className="text-zinc-300 block mt-1 text-sm">{deviceData.firmwareVersion || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-zinc-500 text-xs uppercase tracking-wider">Battery</span>
                                    <div className="mt-1">
                                        <BatteryLevel level={deviceData.batteryStatus || 0} />
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-zinc-500 text-xs uppercase tracking-wider">Serial / Order ID</span>
                                    <span className="text-zinc-300 block mt-1 text-sm truncate">{deviceData.serialNumber || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 pt-4">
                                <span className="block text-zinc-500 text-xs uppercase tracking-wider">Timeline</span>
                                <div className="mt-2 text-xs space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-600">Created</span>
                                        <span className="text-zinc-400">{deviceData.createTime ? new Date(deviceData.createTime).toLocaleString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-600">Last Seen</span>
                                        <span className="text-zinc-400">{deviceData.lastSeenTime ? new Date(deviceData.lastSeenTime).toLocaleString() : '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-zinc-700 italic border-2 border-dashed border-zinc-800/50 rounded-xl">
                            No device data loaded
                        </div>
                    )}
                </div>

                {/* Right Column: Location & Signals */}
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                    {/* Location Card */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative flex-1 min-h-[300px]">
                        <h3 className="text-zinc-400 font-medium mb-4 uppercase tracking-wider text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Real-time Location
                        </h3>
                        {locationData ? (
                            <div className="flex flex-col md:flex-row gap-6 h-full">
                                <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden min-h-[250px] shadow-inner">
                                    <LocationMap
                                        latitude={locationData.latitude}
                                        longitude={locationData.longitude}
                                        deviceName={deviceData?.name || deviceData?.macAddress}
                                    />
                                    <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-md p-2 rounded-lg flex items-center justify-between text-[10px] text-zinc-300 border border-white/10 pointer-events-none">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-blue-400" />
                                            <span className="font-mono">{locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}</span>
                                        </div>
                                        <span className="text-zinc-500">{locationData.computeType || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[200px] flex items-center justify-center text-zinc-700 italic border-2 border-dashed border-zinc-800/50 rounded-xl">
                                Waiting for location stream...
                            </div>
                        )}
                    </div>

                    {/* Signal Status Component (existing) ... */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative">
                        {/* ... (Signal Status Indicators) ... */}
                        <h3 className="text-zinc-400 font-medium mb-6 uppercase tracking-wider text-xs flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Signal Status
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* ... (Sign of Life) ... */}
                            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${locationData ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                <div className={`p-2 rounded-xl ${locationData ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">Sign of Life</span>
                                    <div className="flex items-center gap-2">
                                        {locationData ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />}
                                        <span className={`text-sm font-medium ${locationData ? 'text-white' : 'text-zinc-600'}`}>{locationData ? 'Active' : 'Pending'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ... (BLE) ... */}
                            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${signalsDetected.ble ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                <div className={`p-2 rounded-xl ${signalsDetected.ble ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Wifi className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">BLE Signal</span>
                                    <div className="flex items-center gap-2">
                                        {signalsDetected.ble ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />}
                                        <span className={`text-sm font-medium ${signalsDetected.ble ? 'text-white' : 'text-zinc-600'}`}>{signalsDetected.ble ? 'Detected' : 'Searching'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ... (UWB) ... */}
                            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${signalsDetected.uwb ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800'}`}>
                                <div className={`p-2 rounded-xl ${signalsDetected.uwb ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                    <Radio className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="block text-xs uppercase tracking-wider text-zinc-500 mb-1">UWB Signal</span>
                                    <div className="flex items-center gap-2">
                                        {signalsDetected.uwb ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-zinc-700" />}
                                        <span className={`text-sm font-medium ${signalsDetected.uwb ? 'text-white' : 'text-zinc-600'}`}>{signalsDetected.uwb ? 'Detected' : 'Searching'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Device Lifecycle Widget */}
                {/* ... (remains same) ... */}
                <div className="col-span-1 lg:col-span-3">
                    {deviceData && tokens?.sys ? (
                        <DeviceLifecycle
                            macAddress={deviceData.macAddress}
                            sysToken={tokens.sys}
                            userAccessToken={tokens.user}
                        />
                    ) : null}
                </div>

                {/* Signal Strength Data & Chart */}
                {tokens?.firehoseApiKey ? (
                    <div className="col-span-1 lg:col-span-3">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-t-3xl p-4 border-b-0 flex justify-between items-center">
                            <span className="text-zinc-500 text-xs font-mono">
                                Firehose Key: <span className="text-zinc-300">{tokens.firehoseApiKey.substring(0, 8)}...</span>
                            </span>
                            {/* ... */}
                        </div>
                        {deviceData ? (
                            <SignalChart
                                macAddress={deviceData.macAddress}
                                apiKey={tokens.firehoseApiKey}
                                ssoUser={tokens.ssoUser}
                                onSignalDetected={handleSignalDetected}
                                onEvent={handleRealtimeEvent}
                            />
                        ) : (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-b-3xl p-6 border-t-0">
                                {/* ... Placeholder for chart ... */}
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-zinc-400 font-medium uppercase tracking-wider text-xs flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                        Signal Analysis (BLE & UWB)
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 uppercase">Input Required</span>
                                </div>
                                <div className="h-32 flex items-center justify-center text-zinc-800">
                                    <Wifi className="w-8 h-8 opacity-20" />
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}

            </div>
        </div>
    );
}
