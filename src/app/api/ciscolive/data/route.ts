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
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}
