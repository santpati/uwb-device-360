
// Quick test script to verify token and count devices
import https from 'https';

const SYS_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6InNhbnRwYXRpQGNpc2NvLmNvbSIsInVzZXJJZCI6NDkwOTYsInRlbmFudElkIjoyMzI4NSwiY05hbWUiOiJDaXNjb0xpdmVFVSIsInJvbGUiOiIiLCJpYnkiOiJDT01NT05UTVMiLCJzdG8iOiIyMDI2LTAyLTEyVDA0OjQxOjIzWiIsInR5cGUiOiJzeXN0ZW1fdG9rZW4iLCJkZXRhaWxzIjpbeyJhcHBOYW1lIjoiRE5BU3BhY2VzIiwiYXBwUm9sZSI6IlJXIn0seyJhcHBOYW1lIjoiQ2FwdGl2ZVBvcnRhbCIsImFwcFJvbGUiOiJSVyJ9LHsiYXBwTmFtZSI6Ik1hcFNlcnZpY2UiLCJhcHBSb2xlIjoiUlcifSx7ImFwcE5hbWUiOiJMb2NhdGlvbkFuYWx5dGljcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiTG9jYXRpb24gQW5hbHl0aWNzIn0seyJhcHBOYW1lIjoiRWRnZURldmljZU1hbmFnZXIiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IklvVCBTZXJ2aWNlcyJ9LHsiYXBwTmFtZSI6IlJpZ2h0Tm93IiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJSaWdodCBOb3cifSx7ImFwcE5hbWUiOiJJbXBhY3RBbmFseXNpcyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW1wYWN0IEFuYWx5c2lzIn0seyJhcHBOYW1lIjoiQnVzaW5lc3NJbnNpZ2h0cyIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiQmVoYXZpb3IgTWV0cmljcyJ9LHsiYXBwTmFtZSI6IkNhbWVyYU1ldHJpY3MiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkNhbWVyYSBNZXRyaWNzIn0seyJhcHBOYW1lIjoiT3BlblJvYW1pbmciLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6Ik9wZW5Sb2FtaW5nIn0seyJhcHBOYW1lIjoiRW5nYWdlbWVudHMiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IkVuZ2FnZW1lbnRzIn0seyJhcHBOYW1lIjoiTG9jYXRpb24gUGVyc29uYXMifSx7ImFwcE5hbWUiOiJMb2NhdGlvbiIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiRGV0ZWN0IGFuZCBMb2NhdGUifSx7ImFwcE5hbWUiOiJJb3RFeHBsb3JlciIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiSW9UIEV4cGxvcmVyIn0seyJhcHBOYW1lIjoiU2lnbmFnZSIsImFwcFJvbGUiOiJSVyIsImFwcERpc3BsYXlOYW1lIjoiU3BhY2UgTWFuYWdlciJ9LHsiYXBwTmFtZSI6IldvcmtzcGFjZUV4cGVyaWVuY2UiLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIEV4cGVyaWVuY2UifSx7ImFwcE5hbWUiOiJFbnZpcm9ubWVudGFsQW5hbHl0aWNzIiwiYXBwUm9sZSI6IlJXIiwiYXBwRGlzcGxheU5hbWUiOiJFbnZpcm9ubWVudGFsIEFuYWx5dGljcyJ9LHsiYXBwTmFtZSI6IlNwYWNlVXRpbGl6YXRpb24iLCJhcHBSb2xlIjoiUlciLCJhcHBEaXNwbGF5TmFtZSI6IlNwYWNlIFV0aWxpemF0aW9uIn1dLCJpYXQiOjE3NzA4NzEyNDgsIm9yaWdpbmFsX2lhdCI6MTc3MDg3MTI0OCwiYXV0aHR5cGUiOiJTU08iLCJhdXRoT25seSI6ZmFsc2UsImlzU3VwIjpmYWxzZSwic3NvVXNlciI6IiIsInVsYSI6dHJ1ZSwiZXhwIjoxNzcwODczMDQ4fQ.d-YArX529C_TCZuLOVZsRRy1u2bQjuUkvVHZcbTu1RpDy7L1o7Iurz-FDnKCOba00PcyX44tQu3Eev7ZoSlmMJVScOT15UDMXq-62k4mucxiZPayIs7PjQ2RaeCJYGXLWq9Rp60kOT20gyTSsY0aMYF4leQvFV6DRpPWX2bwgBFO-zh2nIUK_ne9FdgzDv9o4DWVv_snjzAFjDLXFVSp-gMt7IVqc0W-6yjnfFs_juTssusB9uXdTgv52ha5NAvzp06SUBiUhD_N09TYbiv08MideLs-lBysh3xn_S0f3jrzQ4mrFZ3Nr3RXWhQmuZmvMI9Yapj4nMpRT4wqdBr9qQ";

const options = {
    hostname: 'dnaspaces.io',
    path: '/api/edm/v1/maps/mapHierarchy',
    method: 'GET',
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": `sys-token=${SYS_TOKEN}`
    }
};

const req = https.request(options, (res) => {
    let data = '';

    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.devices) {
                console.log(`Total Claimed Devices: ${json.devices.length}`);

                const TARGET_MODELS = ['QORVO-UWB', 'SPACES-CT-UB'];
                const filtered = json.devices.filter((d: any) =>
                    TARGET_MODELS.some(m => d.model?.toUpperCase().includes(m)) ||
                    TARGET_MODELS.includes(d.model?.toUpperCase())
                );

                console.log(`Filtered UWB Devices: ${filtered.length}`);
                if (filtered.length > 0) {
                    console.log("Example Device:", JSON.stringify(filtered[0], null, 2));
                }
            } else {
                console.log("No devices found in response.");
                console.log(data.substring(0, 500));
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Raw Data:", data.substring(0, 500));
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
