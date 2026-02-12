import { NextRequest, NextResponse } from "next/server";
import { getCiscoDB, getAllData, updateDeviceLayout, updateDeviceNotes } from "@/lib/ciscolive_db";

export async function GET(req: NextRequest) {
    try {
        const data = getAllData();
        return NextResponse.json(data);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, mac, payload } = body;

        if (action === 'updateLayout') {
            // payload is index
            updateDeviceLayout(mac, payload);
        } else if (action === 'updateNotes') {
            // payload is notes string
            updateDeviceNotes(mac, payload);
        } else if (action === 'syncDevices') {
            // payload is array of devices
            if (Array.isArray(payload)) {
                console.log(`Syncing ${payload.length} devices from frontend...`);
                // Import upsertDevice dynamically or ensure it's available
                const { upsertDevice } = require('@/lib/ciscolive_db');
                const db = require('@/lib/ciscolive_db').getCiscoDB();

                const stmt = db.prepare(`
                    INSERT INTO devices (mac, name, model, firmware, battery, lastSeen, vendor, layoutIndex, notes)
                    VALUES (@mac, @name, @model, @firmware, @battery, @lastSeen, @vendor, @layoutIndex, @notes)
                    ON CONFLICT(mac) DO UPDATE SET
                        name = coalesce(excluded.name, name),
                        model = coalesce(excluded.model, model),
                        firmware = coalesce(excluded.firmware, firmware),
                        lastSeen = excluded.lastSeen
                `);

                const transaction = db.transaction((devices: any[]) => {
                    for (const dev of devices) {
                        // Map frontend structure to DB structure if needed
                        // Expecting payload to match DB schema roughly or mapping here
                        stmt.run({
                            mac: dev.macAddress || dev.mac,
                            name: dev.name,
                            model: dev.model,
                            firmware: dev.firmwareVersion || dev.firmware,
                            battery: dev.batteryStatus || dev.battery,
                            lastSeen: dev.lastSeenTime || dev.lastSeen || new Date().toISOString(),
                            vendor: dev.vendor || 'Unknown',
                            layoutIndex: null, // Don't overwrite existing layout
                            notes: null // Don't overwrite existing notes
                        });
                    }
                });

                transaction(payload);
                return NextResponse.json({ success: true, count: payload.length });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
