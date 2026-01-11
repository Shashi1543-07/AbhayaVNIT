import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import { mapService, type LocationData, type LocationStatus } from '../../services/mapService';
import MapMarker from './MapMarker';
import 'leaflet/dist/leaflet.css';

interface EventDetailMapProps {
    userName?: string;
    eventType: 'SOS' | 'SAFEWALK';
    // exact location object or null. if null, we might show "Offline" or static center
    location: LocationData | null;
    // center to initially focus on (or fly to)
    center?: { lat: number; lng: number };
}

// Component to recenter map when location changes
function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], 16, { animate: true });
    }, [lat, lng, map]);
    return null;
}

export default function EventDetailMap({ userName, eventType, location, center }: EventDetailMapProps) {
    const [status, setStatus] = useState<LocationStatus>('offline');

    useEffect(() => {
        if (location) {
            setStatus(mapService.calculateLocationStatus(location.lastUpdated));
        } else {
            setStatus('offline');
        }
    }, [location]);

    // Priority: Live Location -> Passed Center -> Default VNIT (Safety Fallback)
    const displayLat = location?.latitude || center?.lat || 21.1259;
    const displayLng = location?.longitude || center?.lng || 79.0525;

    // Use passed center if available, otherwise fallback
    const mapCenter: [number, number] = [displayLat, displayLng];

    return (
        <div className="h-full w-full relative z-0">
            {/* Status Overlay */}
            <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' :
                    status === 'stale' ? 'bg-yellow-500' : 'bg-slate-400'
                    }`} />
                <span className="text-xs font-bold text-slate-700">
                    {status === 'active' ? 'LIVE TRACKING' :
                        status === 'stale' ? 'SIGNAL WEAK' : 'OFFLINE'}
                </span>
            </div>

            <MapContainer
                center={mapCenter}
                zoom={16}
                className="h-full w-full"
                scrollWheelZoom={false}
                zoomControl={false}
            >
                <ZoomControl position="bottomright" />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {location && (
                    <MapMarker
                        location={location}
                        type={eventType}
                        userName={userName || 'Student'}
                    />
                )}

                {/* Only recenter if we have live data */}
                {location && <RecenterMap lat={location.latitude} lng={location.longitude} />}
            </MapContainer>
        </div>
    );
}
