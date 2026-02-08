"use client";

import { useState, useEffect } from "react";
import { Lock, Radio, Info, Key, Play, Terminal, CheckCircle2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";

interface LandingPageProps {
    onSave: (sysToken: string, userAccessToken: string, tenantId: string, firehoseApiKey: string, ssoUser: string, exp: number) => void;
}

interface DecodedToken {
    tenantId: number | string;
    ssoUser?: string;
    email?: string;
    sub?: string;
    username?: string;
    exp: number;
    [key: string]: any;
}

export default function LandingPage({ onSave }: LandingPageProps) {
    // Form State
    const [sysToken, setSysToken] = useState("");
    const [firehoseApiKey, setFirehoseApiKey] = useState("");
    const [decodedData, setDecodedData] = useState<DecodedToken | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Video State
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const storedSys = localStorage.getItem("sys_token");
        const storedFirehose = localStorage.getItem("firehose_api_key");

        if (storedSys) {
            setSysToken(storedSys);
            try {
                const decoded = jwtDecode<DecodedToken>(storedSys);
                setDecodedData(decoded);
            } catch (e) {
                console.error("Invalid stored token", e);
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

            const user = decodedData.ssoUser || decodedData.email || decodedData.sub || decodedData.username || "Unknown";
            onSave(sysToken, "", String(decodedData.tenantId), firehoseApiKey, user, decodedData.exp);
        } else {
            setError("Invalid System Token. Could not extract Tenant ID.");
        }
    };

    const handlePlayVideo = () => {
        setIsPlaying(true);
        // Track Video Click
        fetch('/api/analytics/track', {
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
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

                {/* Left Column: Configuration */}
                {/* Validated Header Structure */}
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                    <div>
                        <div className="flex flex-col gap-1 mb-8">
                            <div className="flex items-center gap-4">
                                <img src="/cisco-uwb-logo.png" alt="Cisco UWB" className="w-16 h-16 object-contain" />
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-2xl tracking-tight">UWB 360 DASHBOARD</span>
                                    <span className="text-indigo-400 font-medium text-sm tracking-wide uppercase bg-indigo-500/10 px-2 py-0.5 rounded-md self-start border border-indigo-500/20">Cisco Internal Tool</span>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight mb-4 text-white">
                            {getGreeting()}.
                        </h1>
                        <p className="text-zinc-400 text-lg leading-relaxed max-w-md">
                            Are you looking to onboard Cisco Asset tag and experience Sub-meter accuracy? Lets get you started in onboarding and debugigng your UWB tag journey.
                        </p>
                    </div>

                    <div className="space-y-6 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">

                        {/* Sys Token Input */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-3 h-3" />
                                Sys Token <span className="text-red-500">*</span>
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

                        {/* Decoded Info Preview */}
                        {decodedData && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-emerald-300 font-medium">
                                    <Key className="w-3 h-3" />
                                    <span>Token Valid</span>
                                </div>
                                <div className="text-zinc-400 font-mono">
                                    Tenant: {decodedData.tenantId}
                                </div>
                            </div>
                        )}

                        {/* Firehose API Key */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                <Radio className="w-3 h-3" />
                                Firehose API Key <span className="text-zinc-600 normal-case ml-1 tracking-normal">(Optional)</span>
                            </label>
                            <input
                                type="password"
                                value={firehoseApiKey}
                                onChange={(e) => setFirehoseApiKey(e.target.value)}
                                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                                placeholder="X-API-Key for Firehose Streaming"
                            />
                        </div>

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
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 delay-100">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-zinc-800 shadow-2xl">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                                poster="/public/3d-rotation-poster.png" // Optional if we want a poster
                            >
                                <source src="/3d-rotation.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                            {/* Overlay Gradient for better integration */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

                            <div className="absolute bottom-4 left-6 pointer-events-none">
                                <span className="text-white/80 font-medium text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">360° Device View</span>
                            </div>
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
