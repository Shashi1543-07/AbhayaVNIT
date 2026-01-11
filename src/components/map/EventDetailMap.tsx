import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
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
    destination?: { lat: number; lng: number };
}

// Sub-component to handle map following and smooth marker movement
function MapFollower({ location, type, userName }: { location: LocationData, type: 'SOS' | 'SAFEWALK', userName: string }) {
    const map = useMap();
    const markerRef = useRef<L.Marker | null>(null);

    // Initial positioning and one-time marker setup
    useEffect(() => {
        if (!location || !map) return;

        // Fly to initial location
        map.flyTo([location.latitude, location.longitude], 16, { animate: true });

        return () => {
            if (markerRef.current) {
                markerRef.current.remove();
            }
        };
    }, []);

    // Live update position smoothly
    useEffect(() => {
        if (!location) return;

        if (markerRef.current) {
            markerRef.current.setLatLng([location.latitude, location.longitude]);
        }

        // Auto-follow
        map.panTo([location.latitude, location.longitude], { animate: true });
    }, [location, map]);

    return (
        <MapMarker
            location={location}
            type={type}
            userName={userName}
            ref={markerRef}
        />
    );
}

export default function EventDetailMap({ userName, eventType, location, center, destination }: EventDetailMapProps) {
    const [status, setStatus] = useState<LocationStatus>('offline');

    useEffect(() => {
        if (location) {
            setStatus(mapService.calculateLocationStatus(location.lastUpdated));
        } else {
            setStatus('offline');
        }
    }, [location]);

    // Fallback center
    const defaultLat = center?.lat || 21.1259;
    const defaultLng = center?.lng || 79.0525;
    const mapCenter: [number, number] = location ? [location.latitude, location.longitude] : [defaultLat, defaultLng];

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

                {location ? (
                    <MapFollower
                        location={location}
                        type={eventType === 'SAFEWALK' ? 'SAFEWALK' : 'SOS'}
                        userName={userName || 'Student'}
                    />
                ) : center ? (
                    <Marker position={[center.lat, center.lng]} icon={L.divIcon({
                        className: 'bg-slate-400 w-3 h-3 rounded-full border-2 border-white'
                    })} />
                ) : null}

                {/* Render Routing Path */}
                {location && destination && (
                    <Polyline
                        positions={[
                            [location.latitude, location.longitude],
                            [destination.lat, destination.lng]
                        ]}
                        color={eventType === 'SOS' ? '#ef4444' : '#10b981'}
                        weight={3}
                        opacity={0.6}
                        dashArray="10, 10"
                    />
                )}

                {destination && (
                    <Marker
                        position={[destination.lat, destination.lng]}
                        icon={L.divIcon({
                            className: 'routing-dest-icon',
                            html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 2px; border: 2px solid white; transform: rotate(45deg);"></div>`,
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        })}
                    />
                )}
            </MapContainer>
        </div>
    );
}
