import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUrl, method = "GET", headers = {}, body: reqBody, sysToken, userAccessToken } = body;

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing targetUrl" }, { status: 400 });
    }

    if (!sysToken) {
      return NextResponse.json({ error: "Missing sysToken" }, { status: 401 });
    }

    const cookieHeader = [
      `sys-token=${sysToken}`,
      userAccessToken ? `user-access-token=${userAccessToken}` : null
    ].filter(Boolean).join('; ');

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": cookieHeader,
        ...headers,
      },
    };

    if (reqBody && (method === "POST" || method === "PUT")) {
      fetchOptions.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
    }



    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json().catch(() => ({}));

    return NextResponse.json({
      status: response.status,
      data: data,
      ok: response.ok
    }, { status: 200 });

  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: "Internal Proxy Error" }, { status: 500 });
  }
}
