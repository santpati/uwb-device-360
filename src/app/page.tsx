"use client";

import { useState, useEffect } from "react";
import TokenModal from "@/components/TokenModal";
import { Search, MapPin, Activity, Wifi, Box, History as HistoryIcon } from "lucide-react";
import { fetchProxy } from "@/lib/api";
import SignalChart from "@/components/SignalChart";
import DeviceLifecycle from "@/components/DeviceLifecycle";

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
  confidenceFactor?: number;
  computeType?: string;
  lastLocatedTime?: number;
}

export default function Home() {
  const [tokens, setTokens] = useState<{ sys: string; user: string; tenant: string; firehoseApiKey?: string; ssoUser?: string; exp?: number } | null>(null);
  const [deviceMac, setDeviceMac] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceData, setDeviceData] = useState<DeviceInfo | null>(null);
  const [locationData, setLocationData] = useState<LocationInfo | null>(null);
  const [showModal, setShowModal] = useState(true);
  const [claimedDevices, setClaimedDevices] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Token Expiration Countdown
  useEffect(() => {
    if (!tokens?.exp) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = tokens.exp! - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokens?.exp]);

  // Fetch Claimed Devices on Mount/Token Update
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

  const handleTokenSave = (sys: string, user: string, tenant: string, firehoseApiKey: string, ssoUser: string, exp: number) => {
    setTokens({ sys, user, tenant, firehoseApiKey, ssoUser, exp });
    setShowModal(false);
  };

  const handleSearch = async () => {
    if (!tokens || !deviceMac) return;
    setIsLoading(true);
    setDeviceData(null);
    setLocationData(null);

    try {
      const deviceInfoRes = await fetchProxy<any>({
        targetUrl: `https://dnaspaces.io/api/edm/v1/device/partner/claimedbeacons?page=1&pageSize=100&sortBy=create_time&sortType=DESCENDING`,
        sysToken: tokens.sys,
        userAccessToken: tokens.user
      });

      if (deviceInfoRes && deviceInfoRes.devices) {
        const found = deviceInfoRes.devices.find((d: any) => d.macAddress?.toLowerCase() === deviceMac.toLowerCase().replace(/:/g, "") || d.mac?.toLowerCase() === deviceMac.toLowerCase().replace(/:/g, ""));
        const found2 = deviceInfoRes.devices.find((d: any) => d.macAddress?.toLowerCase().includes(deviceMac.toLowerCase()) || d.mac?.toLowerCase().includes(deviceMac.toLowerCase()));

        if (found || found2) {
          const device = found || found2;
          const actualMac = device.mac || device.macAddress;
          saveToHistory(actualMac);
          setDeviceData({
            macAddress: actualMac,
            name: device.name,
            createTime: device.create_time,
            lastSeenTime: device.lastseen || device.lastReqTime,
            batteryStatus: device.batteryLevel || 'N/A',
            firmwareVersion: device.firmware || device.firmwareInfo?.firmwareVersion || device.claimedconfig?.firmware,
            claimed: !!device.claimedconfig,
            model: device.model,
            make: device.make,
            serialNumber: device.serial_number || device.order_id,
            vendor: device.vendor || device.manufacturer
          });
        }
      }

      const locationRes = await fetchProxy<any>({
        targetUrl: `https://dnaspaces.io/api/location/v2/devices?deviceType=UWB_TAG&format=geojson&page=1&tenantId=${tokens.tenant}`,
        sysToken: tokens.sys,
        userAccessToken: tokens.user
      });

      if (locationRes && locationRes.features) {
        const foundLoc = locationRes.features.find((f: any) =>
          f.properties?.deviceId?.toLowerCase().includes(deviceMac.toLowerCase().replace(/:/g, "")) ||
          f.properties?.macAddress?.toLowerCase().includes(deviceMac.toLowerCase())
        );
        if (foundLoc) {
          const apiCoords = foundLoc.properties?.geoCoordinates || foundLoc.properties?.coordinates;

          let lat = 0, long = 0;
          if (Array.isArray(apiCoords) && apiCoords.length >= 2) {
            lat = apiCoords[0];
            long = apiCoords[1];
          }

          setLocationData({
            latitude: lat,
            longitude: long,
            computeType: foundLoc.properties?.computeType,
            lastLocatedTime: foundLoc.properties?.lastLocatedAt ? new Date(foundLoc.properties.lastLocatedAt).getTime() : Date.now()
          });
        }
      }

    } catch (e: any) {
      console.error(e);
      if (e.status === 401 || e.status === 403) {
        setShowModal(true);
        alert("Session Expired. Please update your tokens.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      <TokenModal onSave={handleTokenSave} isOpen={showModal} />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">UWB Debugger <span className="text-zinc-500 font-normal text-sm ml-2">Extension</span></h1>
          </div>

          <div className="flex items-center gap-6">
            {tokens?.ssoUser && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-zinc-400">Hello, <span className="text-white font-medium">{tokens.ssoUser}</span></span>
                {timeLeft && (
                  <span className={`text-[10px] font-mono ${timeLeft === 'Expired' ? 'text-red-500' : 'text-emerald-500'}`}>
                    Expires in: {timeLeft}
                  </span>
                )}
              </div>
            )}
            <button onClick={() => setShowModal(true)} className="text-xs font-mono text-zinc-500 hover:text-white transition-colors">
              {tokens ? 'Configured' : 'No Token'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-12 flex flex-col items-center justify-center py-12 border-b border-zinc-900/50">
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

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Device Info Card */}
          <div className="col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <Box className="w-12 h-12 text-zinc-800" />
            </div>
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
                    <span className="text-zinc-300 block mt-1 text-sm">{deviceData.batteryStatus}</span>
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

          {/* Location Card */}
          <div className="col-span-1 lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative">
            <h3 className="text-zinc-400 font-medium mb-6 uppercase tracking-wider text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Real-time Location
            </h3>
            {locationData ? (
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 p-4 relative overflow-hidden min-h-[200px] flex items-center justify-center">
                  {/* Placeholder for Map - visualizing coords */}
                  <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <MapPin className="w-8 h-8 text-blue-500 mb-2 animate-bounce" />
                    <div className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                      {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-48 space-y-4">
                  <div>
                    <span className="block text-zinc-500 text-sm">Compute Type</span>
                    <span className="text-white font-medium block mt-1">{locationData.computeType || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 text-sm">Last Located</span>
                    <span className="text-zinc-300 text-sm block mt-1">{locationData.lastLocatedTime ? new Date(locationData.lastLocatedTime).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-700 italic border-2 border-dashed border-zinc-800/50 rounded-xl">
                Waiting for location stream...
              </div>
            )}
          </div>

          {/* Device Lifecycle Widget */}
          <div className="col-span-1 lg:col-span-3">
            {deviceData && tokens?.sys ? (
              <DeviceLifecycle
                macAddress={deviceData.macAddress}
                sysToken={tokens.sys}
                userAccessToken={tokens.user}
              />
            ) : null}
          </div>

          {/* Signal Strength (BLE & UWB) - Only show if API Key is present */}
          {tokens?.firehoseApiKey ? (
            <div className="col-span-1 lg:col-span-3">
              {deviceData ? (
                <SignalChart macAddress={deviceData.macAddress} apiKey={tokens.firehoseApiKey} />
              ) : (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
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
      </main>
    </div>
  );
}
