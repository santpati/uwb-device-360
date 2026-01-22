import { useState, useEffect } from "react";
import { X, Key, Lock, Globe, Radio, Info } from "lucide-react";

interface TokenModalProps {
    isOpen: boolean;
    onSave: (sysToken: string, userAccessToken: string, tenantId: string, firehoseApiKey: string) => void;
}

export default function TokenModal({ onSave, isOpen }: TokenModalProps) {
    const [sysToken, setSysToken] = useState("");
    // const [userAccessToken, setUserAccessToken] = useState(""); // Removed as per request
    const [tenantId, setTenantId] = useState("");
    const [firehoseApiKey, setFirehoseApiKey] = useState("");

    useEffect(() => {
        const storedSys = localStorage.getItem("sys_token");
        // const storedUser = localStorage.getItem("user_access_token");
        const storedTenant = localStorage.getItem("tenant_id");
        const storedFirehose = localStorage.getItem("firehose_api_key");

        if (storedSys) setSysToken(storedSys);
        // if (storedUser) setUserAccessToken(storedUser);
        if (storedTenant) setTenantId(storedTenant);
        if (storedFirehose) setFirehoseApiKey(storedFirehose);
    }, []);

    const handleSave = () => {
        if (sysToken && tenantId) {
            localStorage.setItem("sys_token", sysToken);
            // if (userAccessToken) localStorage.setItem("user_access_token", userAccessToken);
            localStorage.setItem("tenant_id", tenantId);

            if (firehoseApiKey) {
                localStorage.setItem("firehose_api_key", firehoseApiKey);
            } else {
                localStorage.removeItem("firehose_api_key");
            }

            onSave(sysToken, "", tenantId, firehoseApiKey);
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

                <div className="p-6 space-y-5">
                    {/* Sys Token */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Lock className="w-3 h-3" />
                            Sys Token <span className="text-red-500">*</span>
                            <div className="group relative ml-auto">
                                <Info className="w-3 h-3 text-zinc-600 hover:text-indigo-400 cursor-help" />
                                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 text-zinc-300 text-[10px] p-3 rounded-xl border border-zinc-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                                    Open Developer Tools (F12) in your browser while on Cisco Spaces. Go to Network tab, filter for `sys-token`. Copy the value from the Cookie header.
                                </div>
                            </div>
                        </label>
                        <input
                            type="password"
                            value={sysToken}
                            onChange={(e) => setSysToken(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                            placeholder="eyJhbGciOiJ..."
                        />
                    </div>

                    {/* Tenant ID */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            Tenant ID <span className="text-red-500">*</span>
                            <div className="group relative ml-auto">
                                <Info className="w-3 h-3 text-zinc-600 hover:text-indigo-400 cursor-help" />
                                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 text-zinc-300 text-[10px] p-3 rounded-xl border border-zinc-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                                    Log in to Cisco Spaces. Click your profile on the top right to My Account. You will find the Tenant ID there.
                                </div>
                            </div>
                        </label>
                        <input
                            type="text"
                            value={tenantId}
                            onChange={(e) => setTenantId(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                            placeholder="e.g. 12345"
                        />
                    </div>

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
                        disabled={!sysToken || !tenantId}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
