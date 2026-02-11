import { NextResponse } from "next/server";
import { getAnalyticsStats, getFeedbackList } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stats = getAnalyticsStats();
        const feedback = getFeedbackList();

        return NextResponse.json({
            ...stats,
            feedback // Add feedback to the response
        });
    } catch (e: any) {
        console.error("Analytics fetch error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
