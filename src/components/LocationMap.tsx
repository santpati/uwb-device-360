
"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet components to avoid SSR 'window is not defined' error
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);
// We also need to import the CSS in the parent or global, 
// OR we can inject a link tag here if we want to be self-contained (but globals is fast).
// We will also likely need to fix the default Icon issue in Leaflet.

interface LocationMapProps {
    latitude: number;
    longitude: number;
    deviceName?: string;
}

export default function LocationMap({ latitude, longitude, deviceName }: LocationMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    // Fix leafet default icon issue
    useEffect(() => {
        setIsMounted(true);
        (async () => {
            // Leaflet icon fix
            const L = await import('leaflet');
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        })();
    }, []);

    if (!isMounted) {
        return <div className="w-full h-full bg-zinc-900 animate-pulse rounded-2xl"></div>;
    }

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden relative z-0">
            {/* Map */}
            {/* @ts-ignore - Dynamic types sometimes fight with Props, but these are correct for Leaflet */}
            <MapContainer center={[latitude, longitude]} zoom={18} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker position={[latitude, longitude]}>
                    <Popup>
                        <div className="text-zinc-900 font-sans">
                            <span className="font-bold">{deviceName || "Device"}</span>
                            <br />
                            Lat: {latitude.toFixed(5)}
                            <br />
                            Long: {longitude.toFixed(5)}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
