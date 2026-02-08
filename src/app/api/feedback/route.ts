import { NextRequest, NextResponse } from "next/server";
import { saveFeedback } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const feedback = formData.get("feedback") as string;
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const ssoUser = formData.get("ssoUser") as string;
        const tenantId = formData.get("tenantId") as string;
        const file = formData.get("image") as File | null;

        if (!feedback) {
            return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
        }

        let imagePath = "";

        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = Date.now() + "_" + file.name.replace(/\s/g, "_");
            const uploadDir = path.join(process.cwd(), "public", "uploads", "feedback");

            // Ensure directory exists
            await mkdir(uploadDir, { recursive: true });

            await writeFile(path.join(uploadDir, filename), buffer);
            imagePath = `/uploads/feedback/${filename}`;
        }

        saveFeedback({
            feedback,
            name,
            email,
            ssoUser,
            imagePath,
            tenantId
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Feedback error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
