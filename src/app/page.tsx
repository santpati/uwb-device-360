"use client";

import { useState, useEffect } from "react";
import TokenModal from "@/components/TokenModal";
import { Activity } from "lucide-react";
import LandingPage from "@/components/LandingPage";

interface Tokens {
  sys: string;
  user: string;
  tenant: string;
  firehoseApiKey?: string;
  ssoUser?: string;
  exp?: number;
}

import DeviceDebugger from "@/components/DeviceDebugger";
import { Plus, X } from "lucide-react";

interface Tab {
  id: string;
  title: string;
  mac: string;
}

export default function Home() {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([{ id: 'tab-1', title: 'New Tab', mac: '' }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [totalDebugs, setTotalDebugs] = useState<number>(0);

  // Fetch Analytics Stats
  useEffect(() => {
    fetch('/api/analytics/stats')
      .then(res => res.json())
      .then(data => {
        if (data?.stats?.totalDebugs) {
          setTotalDebugs(data.stats.totalDebugs);
        }
      })
      .catch(err => console.error("Failed to load stats", err));
  }, []);

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

  const handleTokenSave = (sysToken: string, userAccessToken: string, tenant: string, firehoseApiKey: string, ssoUser: string, exp: number, decodedToken?: any) => {
    setTokens({
      sys: sysToken,
      user: userAccessToken,
      tenant,
      firehoseApiKey,
      ssoUser,
      exp
    });

    setShowTokenModal(false);

    localStorage.setItem("sys_token", sysToken);
    localStorage.setItem("tenant_id", tenant);
    if (firehoseApiKey) localStorage.setItem("firehose_api_key", firehoseApiKey);
    if (userAccessToken) localStorage.setItem("user_token", userAccessToken);

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'session_start',
        ssoUser,
        tenantId: tenant,
        details: decodedToken // Log full token details for debugging "Unknown" users
      })
    }).catch(console.error);
  };

  const trackEvent = (eventType: string, details?: any) => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        ssoUser: tokens?.ssoUser,
        tenantId: tokens?.tenant,
        details
      })
    }).catch(console.error);
  };

  const addTab = () => {
    const newId = `tab-${Date.now()}`;
    setTabs([...tabs, { id: newId, title: 'New Tab', mac: '' }]);
    setActiveTabId(newId);
    trackEvent('tab_created', { tabId: newId });
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close the last tab

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    if (id === activeTabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id); // Switch to last tab
    }
    trackEvent('tab_closed', { tabId: id });
  };

  const updateTabMac = (id: string, mac: string) => {
    setTabs(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, mac, title: mac || 'New Tab' };
      }
      return t;
    }));
  };

  if (!tokens) {
    return <LandingPage onSave={handleTokenSave} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-indigo-500/30">
      {showTokenModal && (
        <TokenModal
          isOpen={true}
          onSave={handleTokenSave}
        />
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                UWB Debugger
                <span className="text-zinc-500 font-normal text-sm ml-2">Extension</span>
              </h1>
              {totalDebugs > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse"></span>
                  {totalDebugs.toLocaleString()} debugs performed
                </span>
              )}
            </div>
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
            <button onClick={() => setShowTokenModal(true)} className="text-xs font-mono text-zinc-500 hover:text-white transition-colors">
              {tokens ? 'Configured' : 'No Token'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Strip */}
      <div className="bg-zinc-900/30 border-b border-zinc-800 sticky top-16 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1 h-12 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                            relative flex items-center gap-2 px-4 h-9 rounded-t-lg cursor-pointer transition-all border-t border-x text-xs font-medium select-none min-w-[140px] max-w-[200px]
                            ${activeTabId === tab.id
                    ? 'bg-zinc-950 border-zinc-800 text-indigo-400 z-10 -mb-[1px] border-b-zinc-950'
                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }
                        `}
              >
                <span className="truncate font-mono">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => closeTab(e, tab.id)}
                    className="ml-auto p-0.5 rounded-full hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 opacity-60 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={addTab}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
              title="New Tab"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTabId === tab.id ? 'block animate-in fade-in duration-300' : 'hidden'}>
            <DeviceDebugger
              tokens={tokens}
              initialMac={tab.mac}
              isActive={activeTabId === tab.id}
              onMacUpdate={(mac) => updateTabMac(tab.id, mac)}
            />
          </div>
        ))}
      </main>
    </div>
  );
}
