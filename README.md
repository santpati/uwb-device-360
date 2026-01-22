# UWB Device Dashboard & Debugger

![UWB Debugger Dashboard](public/assets/dashboard-preview.png)

A professional debugging extension and dashboard for Ultra-Wideband (UWB) devices in the Cisco Spaces ecosystem. This tool provides real-time signal analysis, device lifecycle tracking, and location visualization for Qorvo and other UWB tags.

## 🚀 Features

-   **Real-time Signal Analysis**: Visualizes RSSI (BLE) and TDOA Confidence (UWB) streams directly from the Firehose API.
-   **Smart Device Search**: Automatically fetches your claimed devices (filtered for UWB models) and offers autocomplete search.
-   **Device Lifecycle Timeline**: Tracks device events (Provisioning, Ranging, etc.) in a chronological timeline.
-   **Live Location Map**: Visualizes the real-time calculated coordinates (latency < 1s).
-   **Secure Configuration**: Client-side storage of tokens with optional API Key usage.

## 🛠️ Prerequisites

-   **Node.js** 18+ installed.
-   **Cisco Spaces Account** with proper permissions.
-   **Sys Token** (from Cisco Spaces Cookie).
-   **Firehose API Key** (optional, for Signal Graph).

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/santpati/uwb-device-360.git
    cd uwb-device-360
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

Click the **"No Token" / "Configured"** button in the top right corner to open the settings:

1.  **Sys Token** (Required):
    *   Log in to Cisco Spaces.
    *   Open Developer Tools (`F12`) -> **Network** tab.
    *   Filter for `sys-token` and copy the value from the Cookie header.
2.  **Tenant ID** (Required):
    *   Found in **My Account** on the Cisco Spaces dashboard.
3.  **Firehose API Key** (Optional):
    *   Required only if you want to see the live Signal Analysis chart.

## 🏗️ Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Charts**: [Recharts](https://recharts.org/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
