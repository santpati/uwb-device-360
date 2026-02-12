
import React from 'react';
import { Battery, BatteryCharging, BatteryWarning, BatteryFull } from 'lucide-react';

interface BatteryLevelProps {
    level: number | string; // Can be string "85" or number 85
    isCharging?: boolean;
}

export default function BatteryLevel({ level, isCharging = false }: BatteryLevelProps) {
    // Parse level
    let percentage = 0;
    if (typeof level === 'number') {
        percentage = level;
    } else if (typeof level === 'string') {
        // Handle "85%" or "85"
        percentage = parseInt(level.replace('%', ''), 10) || 0;
    }

    // Clamp
    percentage = Math.min(100, Math.max(0, percentage));

    // Determine Color
    let colorClass = 'bg-emerald-500'; // Default Green (Radiant)
    let textClass = 'text-emerald-400';

    if (percentage <= 20) {
        colorClass = 'bg-red-500';
        textClass = 'text-red-400';
    } else if (percentage <= 50) {
        colorClass = 'bg-amber-500';
        textClass = 'text-amber-400';
    }

    // Determine Icon
    // We construct a custom battery using CSS for precise filling, 
    // rather than using the Lucide icon which has fixed fill steps.

    return (
        <div className="flex items-center gap-2" title={`${percentage}%`}>
            {/* Battery Body */}
            <div className="relative w-8 h-4 border border-zinc-600 rounded-sm p-0.5">
                {/* Positive Nipple */}
                <div className="absolute -right-1 top-1 bottom-1 w-0.5 bg-zinc-600 rounded-r-sm"></div>

                {/* Fill Bar */}
                <div
                    className={`h-full rounded-xs transition-all duration-500 ease-out ${colorClass} ${isCharging ? 'animate-pulse' : ''}`}
                    style={{ width: `${percentage}%` }}
                ></div>

                {/* Charging Bolt Overlay */}
                {isCharging && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1.5 h-3 bg-white rotate-12 -ml-0.5" style={{ clipPath: 'polygon(75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%, 25% 0%)' }}></div>
                    </div>
                )}
            </div>

            {/* Percentage Text */}
            <span className={`text-xs font-mono font-medium ${textClass}`}>
                {percentage}%
            </span>
        </div>
    );
}
