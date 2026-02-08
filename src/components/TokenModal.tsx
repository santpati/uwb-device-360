import { useState, useEffect } from "react";
import { X, Key, Lock, Globe, Radio, Info, User, Clock } from "lucide-react";
import { jwtDecode } from "jwt-decode";

interface TokenModalProps {
    isOpen: boolean;
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

export default function TokenModal({ onSave, isOpen }: TokenModalProps) {
    const [sysToken, setSysToken] = useState("");
    const [firehoseApiKey, setFirehoseApiKey] = useState("");
    const [decodedData, setDecodedData] = useState<DecodedToken | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            // Don't show error immediately while typing, maybe on blur or just silently fail decoding
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Configuration</h2>
                        <p className="text-zinc-500 text-xs mt-1">Enter your Cisco Spaces credentials</p>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Sys Token */}
                    <div className="space-y-2">
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
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono h-24 resize-none"
                            placeholder="Paste your JWT sys-token here..."
                        />
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                    </div>

                    {/* Decoded Info Preview */}
                    {decodedData && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium uppercase tracking-wider">
                                <Key className="w-3 h-3" />
                                Token Decoded Successfully
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Tenant ID</span>
                                    <span className="text-white font-mono text-sm">{decodedData.tenantId}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">User</span>
                                    <span className="text-white font-mono text-sm truncate" title={decodedData.ssoUser || decodedData.email || decodedData.sub || decodedData.username}>{decodedData.ssoUser || decodedData.email || decodedData.sub || decodedData.username || "Unknown"}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Expires</span>
                                    <span className="text-zinc-400 text-xs font-mono">
                                        {new Date(decodedData.exp * 1000).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="h-px bg-zinc-800/50 my-2" />

                    {/* Firehose API Key */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Radio className="w-3 h-3" />
                            Firehose API Key <span className="text-zinc-600 normal-case ml-1 tracking-normal">(Optional)</span>
                        </label>
                        <input
                            type="password"
                            value={firehoseApiKey}
                            onChange={(e) => setFirehoseApiKey(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                            placeholder="X-API-Key for Firehose Streaming"
                        />
                        <p className="text-[10px] text-zinc-500">Required only for the Signal Analysis widget.</p>
                    </div>
                </div>

                <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!sysToken || !decodedData?.tenantId}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
