
interface ProxyRequest {
    targetUrl: string;
    method?: string;
    body?: any;
    sysToken: string;
    userAccessToken?: string;
    headers?: Record<string, string>;
}

export async function fetchProxy<T>(params: ProxyRequest): Promise<T> {
    const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });

    const json = await res.json();

    if (!res.ok) {
        console.error(`Proxy Request Failed: Status ${res.status}`, json);
        const error: any = new Error(json.message || 'Proxy Request Failed');
        error.status = res.status;
        throw error;
    }

    if (!json.ok) {
        console.error("Proxy returned error:", JSON.stringify(json, null, 2));
        const error: any = new Error(json.data?.message || 'Upstream Error');
        error.status = json.status || 500;
        throw error;
    }
    return json.data as T;
}
