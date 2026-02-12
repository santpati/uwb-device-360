"use client";

import { useState, useEffect } from "react";
import { Lock, Radio, Info, Key, Play, Terminal, CheckCircle2, Sparkles } from "lucide-react";
import { jwtDecode } from "jwt-decode";

interface LandingPageProps {
    onSave: (sysToken: string, userAccessToken: string, tenantId: string, firehoseApiKey: string, ssoUser: string, exp: number, decodedToken?: any) => void;
}

interface DecodedToken {
    tenantId: number | string;
    ssoUser?: string;
    userName?: string;
    email?: string;
    sub?: string;
    username?: string;
    exp: number;
    [key: string]: any;
}

// ... (inside component)



export default function LandingPage({ onSave }: LandingPageProps) {
    // Form State
    const [sysToken, setSysToken] = useState("");
    const [firehoseApiKey, setFirehoseApiKey] = useState("");
    const [decodedData, setDecodedData] = useState<DecodedToken | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [browserType, setBrowserType] = useState<'chrome' | 'firefox' | 'other'>('other');

    useEffect(() => {
        const ua = navigator.userAgent;
        if (ua.includes("Firefox")) {
            setBrowserType('firefox');
        } else if (ua.includes("Chrome")) {
            setBrowserType('chrome');
        }
    }, []);

    // Video State
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const storedSys = localStorage.getItem("sys_token");
        const storedFirehose = localStorage.getItem("firehose_api_key");

        if (storedSys) {
            setSysToken(storedSys);
            try {
                const decoded = jwtDecode<DecodedToken>(storedSys);
                // Check if expired
                const currentTime = Date.now() / 1000;
                if (decoded.exp < currentTime) {
                    console.warn("Stored token expired");
                    setDecodedData(null);
                    localStorage.removeItem("sys_token"); // Clean up
                    setSysToken(""); // Optional: clear input or keep it for user to refresh
                } else {
                    setDecodedData(decoded);
                }
            } catch (e) {
                console.error("Invalid stored token", e);
                setDecodedData(null);
                localStorage.removeItem("sys_token");
            }
        }
        if (storedFirehose) setFirehoseApiKey(storedFirehose);
    }, []);

    const handleTokenChange = (token: string) => {
        setSysToken(token);
        setError(null);
        if (!token) {
            setDecodedData(null);
            return;
        }

        try {
            const decoded = jwtDecode<DecodedToken>(token);
            setDecodedData(decoded);
        } catch (e) {
            setDecodedData(null);
        }
    };

    const handleSave = () => {
        if (sysToken && decodedData && decodedData.tenantId) {
            localStorage.setItem("sys_token", sysToken);
            localStorage.setItem("tenant_id", String(decodedData.tenantId));

            if (firehoseApiKey) {
                localStorage.setItem("firehose_api_key", firehoseApiKey);
            } else {
                localStorage.removeItem("firehose_api_key");
            }

            const user = decodedData.ssoUser || decodedData.userName || decodedData.email || decodedData.sub || decodedData.username || "Unknown";
            onSave(sysToken, "", String(decodedData.tenantId), firehoseApiKey, user, decodedData.exp, decodedData);
        } else {
            setError("Invalid System Token. Could not extract Tenant ID.");
        }
    };

    const handlePlayVideo = () => {
        setIsPlaying(true);
        // Track Video Click
        fetch('/api/audit/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: 'video_tutorial_click',
                ssoUser: 'guest', // User not logged in yet usually
                details: { action: 'play_video' }
            })
        }).catch(console.error);
    };

    // Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden">

            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-black/80 z-10"></div> {/* Overlay */}
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-60"
                >
                    <source src="/3d-rotation.mp4" type="video/mp4" />
                </video>
            </div>

            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">

                {/* Left Column: Configuration */}
                {/* Validated Header Structure */}
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                    <div>
                        <div className="flex flex-col gap-1 mb-8">
                            <div className="flex items-center gap-4">
                                <img src="/cisco-uwb-logo.png" alt="Cisco UWB" className="w-20 h-20 object-contain" />
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-2xl tracking-tight">UWB 360 DASHBOARD</span>
                                    <span className="text-indigo-400 font-medium text-sm tracking-wide uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md self-start border border-indigo-500/20">Cisco Internal Tool</span>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-4 text-white">
                            {getGreeting()}.
                        </h1>
                        <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                            Are you looking to onboard Cisco Asset tag and experience Sub-meter accuracy? Lets get you started in onboarding and debugigng your UWB tag journey.
                        </p>
                    </div>

                    <div className="space-y-6 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">

                        {/* Sys Token Input */}
                        <div className="space-y-3">
                            {/* Extension Promo Banner */}
                            <a
                                href={browserType === 'firefox' ? '/browser-extension-firefox' : '/browser-extension-chrome'}
                                className="block mb-2 p-3 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl group cursor-pointer hover:border-indigo-400/50 transition-all relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-500 shadow-lg shadow-indigo-500/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">New</div>
                                        <div className="flex flex-col">
                                            <p className="text-sm text-indigo-100 font-medium leading-none">
                                                Easily copy your Sys-Token
                                            </p>
                                            <p className="text-xs text-indigo-300 mt-1">
                                                Use our <span className="text-white font-bold border-b border-indigo-400/50 pb-0.5 transition-colors group-hover:border-indigo-400">{browserType === 'firefox' ? 'Firefox Add-on' : 'Chrome Extension'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-lg">
                                        Get it
                                        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </div>
                                </div>
                            </a>

                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-3 h-3" />
                                Sys Token <span className="text-zinc-500 normal-case">(Mandatory)</span> <span className="text-red-500 font-bold">*</span>
                                <div className="group relative ml-auto">
                                    <Info className="w-4 h-4 text-zinc-500 hover:text-indigo-400 cursor-help transition-colors" />
                                    <div className="absolute right-0 top-full mt-2 w-[480px] bg-zinc-900 text-zinc-300 text-xs p-4 rounded-2xl border border-zinc-700 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed translate-y-2 group-hover:translate-y-0">
                                        <div className="space-y-3">
                                            <p className="font-medium text-indigo-400 uppercase tracking-wider text-[10px]">How to find your Sys-Token</p>
                                            <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                                                <li>Go to <a href="https://dnaspaces.io" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline">dnaspaces.io</a> and login to your tenant.</li>
                                                <li>Open <span className="text-zinc-200">Developer Tools</span> (F12 or Right Click &gt; Inspect).</li>
                                                <li>Go to the <span className="text-zinc-200">Application</span> (or Storage) tab.</li>
                                                <li>Expand <span className="text-zinc-200">Cookies</span> &gt; <span className="text-zinc-200">https://dnaspaces.io</span>.</li>
                                                <li>Locate <span className="text-indigo-300 font-mono">sys-token</span> and copy its value.</li>
                                            </ol>
                                            <div className="rounded-lg overflow-hidden border border-zinc-800">
                                                <img src="/sys-token-guide.png" alt="Visual Guide" className="w-full h-auto object-cover opacity-90" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </label>
                            <textarea
                                value={sysToken}
                                onChange={(e) => handleTokenChange(e.target.value)}
                                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono h-24 resize-none"
                                placeholder="Paste your JWT sys-token here..."
                            />
                        </div>

                        {/* Decoded Info Preview & Validation Status */}
                        {decodedData && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Token Valid</span>
                                    </div>
                                    <div className="text-zinc-400 font-mono">
                                        Tenant: {decodedData.tenantId}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                                    <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
                                        <span className="block text-zinc-600 mb-1">SSO User</span>
                                        <span className="text-zinc-300 normal-case tracking-normal truncate block" title={decodedData.ssoUser || decodedData.email}>
                                            {decodedData.ssoUser || decodedData.email || "Unknown"}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
                                        <span className="block text-zinc-600 mb-1">Expires</span>
                                        <span className="text-zinc-300 normal-case tracking-normal">
                                            {new Date(decodedData.exp * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Firehose API Key */}
                        {decodedData?.tenantId ? (
                            <FirehoseKeyInput
                                tenantId={String(decodedData.tenantId)}
                                value={firehoseApiKey}
                                onChange={setFirehoseApiKey}
                            />
                        ) : (
                            <div className="opacity-50 pointer-events-none filter blur-[1px] transition-all">
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                        <Radio className="w-3 h-3" />
                                        Firehose API Key <span className="text-zinc-600 normal-case ml-1 tracking-normal">(Enter Tenant first)</span>
                                    </label>
                                    <input disabled className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm" placeholder="Locked" />
                                </div>
                            </div>
                        )}

                        {error && <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

                        <button
                            onClick={handleSave}
                            disabled={!sysToken || !decodedData?.tenantId}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all shadow-lg shadow-indigo-500/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Start Debugging
                        </button>
                    </div>
                </div>

                {/* Right Column: Video & Info */}
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 delay-100">

                    {/* What's New Banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 backdrop-blur-md p-5 shadow-2xl">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                            </div>
                            <h3 className="font-semibold text-white tracking-wide text-sm uppercase">What's New</h3>
                            <span className="ml-auto text-[10px] font-medium px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/20">Latest Updates</span>
                        </div>

                        <ul className="space-y-3">
                            <li className="flex gap-3 text-zinc-300 text-xs leading-relaxed">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                                <span>
                                    <strong className="text-white">Multi-Device Debugging:</strong> Monitor and debug multiple UWB devices in parallel tabs.
                                </span>
                            </li>
                            <li className="flex gap-3 text-zinc-300 text-xs leading-relaxed">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 shadow-[0_0_8px_rgba(192,132,252,0.5)]"></div>
                                <span>
                                    <strong className="text-white">Cisco Live EU Ready:</strong> Simplified experience with auto-selected Firehose API keys.
                                </span>
                            </li>
                            <li className="flex gap-3 text-zinc-300 text-xs leading-relaxed">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                                <span>
                                    <strong className="text-white">Make a Wish:</strong> Share your feedback and feature requests directly from the dashboard.
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-zinc-800 shadow-2xl">
                            {!isPlaying ? (
                                <div
                                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-zinc-900 hover:bg-zinc-800 transition-colors group/play"
                                    onClick={handlePlayVideo}
                                >
                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover/play:scale-110 transition-transform duration-300">
                                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                                        </div>
                                        <p className="text-zinc-400 font-medium tracking-wide">Watch Quick Start Guide</p>
                                    </div>
                                    {/* Fake UI for thumbnail feel */}
                                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                                        <div className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full w-0 bg-indigo-500"></div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ paddingBottom: '56.25%', position: 'relative', display: 'block', width: '100%' }}>
                                    <iframe
                                        src="https://app.vidcast.io/share/embed/a7bd6197-b0b7-4949-b372-52feffaf2243"
                                        width="100%"
                                        height="100%"
                                        title="UWB Device 360 dashboard"
                                        allow="fullscreen *;autoplay *;"
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6 px-2">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            See how to use it
                            <div className="h-px flex-1 bg-zinc-800 ml-4"></div>
                        </h3>
                        <ul className="space-y-4">
                            {[
                                "Streamlines device onboarding and information collection for Tango UWB tags.",
                                "Consolidates data including BLE TDOA signals and location detection.",
                                "Requires sys token and API key for secure access.",
                                "Provides comprehensive lifecycle view: provisioning, firmware, and battery status."
                            ].map((item, i) => (
                                <li key={i} className="flex gap-3 text-zinc-400 text-sm leading-relaxed">
                                    <div className="mt-1 flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponent for Firehose Key to handle its own auto-fetch logic
function FirehoseKeyInput({ tenantId, value, onChange }: { tenantId: string, value: string, onChange: (v: string) => void }) {
    const [autoPopulated, setAutoPopulated] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        const fetchKey = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/firehose/config?tenantId=${tenantId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.found && data.apiKey) {
                        onChange(data.apiKey);
                        setAutoPopulated(true);
                    }
                }
            } catch (e) {
                console.error("Failed to auto-fetch key", e);
            } finally {
                setLoading(false);
            }
        };

        fetchKey();
    }, [tenantId]);

    return (
        <div className="space-y-3 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-3 h-3" />
                    Firehose API Key <span className="text-zinc-600 normal-case ml-1 tracking-normal">(Optional)</span>
                </label>

                {autoPopulated && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Sparkles className="w-3 h-3" />
                        Auto-Populated from Server
                    </span>
                )}
            </div>

            <div className="relative">
                <input
                    type="password"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setAutoPopulated(false);
                    }}
                    className={`w-full bg-zinc-950/80 border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 outline-none transition-all placeholder:text-zinc-700 font-mono
                        ${autoPopulated
                            ? 'border-emerald-500/30 focus:border-emerald-500/50 focus:ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                            : 'border-zinc-800 focus:border-indigo-500/50 focus:ring-indigo-500/50'
                        }
                    `}
                    placeholder="X-API-Key"
                />

                {loading && (
                    <div className="absolute right-3 top-3.5">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {autoPopulated && (
                <p className="text-[10px] text-zinc-500">
                    We found an existing key for this tenant in the database.
                </p>
            )}
        </div>
    );
}
