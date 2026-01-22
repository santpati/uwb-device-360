# Walkthrough - UWB Device Dashboard

I have built the initial version of the UWB Device Dashboard using **Next.js**.

## Features Implemented
- **System Token Auth**: Securely proxies requests to Cisco Spaces using your browser cookies/tokens.
- **Device Search**: Lookup UWB devices by MAC address.
- **Device Info Card**: Shows claim status, battery, and last seen time.
- **Location View**: Live location coordinates and compute type.

## How to Run

> [!WARNING]
> The automated installation encountered network/environment issues with `npm`. You may need to run the install manually.

1.  **Navigate to the project**:
    ```bash
    cd uwb-dashboard
    ```
2.  **Install Dependencies** (if missing):
    ```bash
    npm install
    ```
    *If it fails on `unrs-resolver`, try `npm install --ignore-scripts`.*
3.  **Start the Server**:
    ```bash
    npm run dev
    ```
4.  **Open in Browser**:
    Go to `http://localhost:3000`

## How to Use

1.  **Get Credentials**:
    - Open `dnaspaces.io` in Chrome.
    - Open Developer Tools -> Network.
    - Refresh and find a request (e.g., `claimedbeacons`).
    - Copy the `sys-token` from the `Cookie` header (it starts with `eyJ...`).
    - Note your `tenantId` (found in the URL or payload, often `24256`).
2.  **Configure Dashboard**:
    - Click "No Token" or the settings icon.
    - Paste the `sys-token`.
    - Enter the `Tenant ID`.
    - Click "Save Credentials".
3.  **Search Device**:
    - Enter a MAC address (e.g., `00:11:22:33:44:55`).
    - Click "Debug".

## Troubleshooting
- **Proxy Error**: If data doesn't load, check the server console. It might mean the token expired.
- **CORS**: The proxy solves CORS, but `sys-token` is short-lived. You might need to refresh it from the real dashboard often.
