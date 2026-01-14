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

// Helper to decode OSRM polylines
function decodePolyline(str: string, precision: number = 5) {
    let index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision);

    while (index < str.length) {
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += latitude_change;

        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor] as [number, number]);
    }

    return coordinates;
}

export default function EventDetailMap({ userName, eventType, location, center, destination }: EventDetailMapProps) {
    const [status, setStatus] = useState<LocationStatus>('offline');
    const [route, setRoute] = useState<[number, number][]>([]);

    useEffect(() => {
        if (location) {
            setStatus(mapService.calculateLocationStatus(location.lastUpdated));
        } else {
            setStatus('offline');
        }
    }, [location]);

    // Fetch realistic route from OSRM
    useEffect(() => {
        const fetchRoute = async () => {
            if (!location || !destination) {
                setRoute([]);
                return;
            }

            try {
                // Switching to 'driving' profile often follows main campus roads more reliably
                // than 'foot' which may detour through poorly mapped walkways.
                const url = `https://router.project-osrm.org/route/v1/driving/${location.longitude},${location.latitude};${destination.lng},${destination.lat}?overview=full&geometries=polyline&continue_straight=false`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
                    const decoded = decodePolyline(data.routes[0].geometry);

                    // Prepend ACTUAL location and append ACTUAL destination
                    // This bridges the "snapping gap" at both ends.
                    const seamlessRoute: [number, number][] = [
                        [location.latitude, location.longitude],
                        ...decoded,
                        [destination.lat, destination.lng]
                    ];

                    // Simple distance check: if route distance is extremely long compared 
                    // to straight line, the map data is missing a shortcut.
                    const waypointsDist = Math.sqrt(
                        Math.pow(location.latitude - destination.lat, 2) +
                        Math.pow(location.longitude - destination.lng, 2)
                    );

                    const routeDist = data.routes[0].distance / 111320;

                    if (routeDist > waypointsDist * 3) {
                        setRoute([
                            [location.latitude, location.longitude],
                            [destination.lat, destination.lng]
                        ]);
                    } else {
                        setRoute(seamlessRoute);
                    }
                } else {
                    // Fallback to straight line if OSRM fails
                    setRoute([
                        [location.latitude, location.longitude],
                        [destination.lat, destination.lng]
                    ]);
                }
            } catch (error) {
                console.error('OSRM Routing Error:', error);
                setRoute([
                    [location.latitude, location.longitude],
                    [destination.lat, destination.lng]
                ]);
            }
        };

        const timer = setTimeout(fetchRoute, 500);
        return () => clearTimeout(timer);
    }, [location?.latitude, location?.longitude, destination?.lat, destination?.lng]);

    // Determine map center with better fallback logic
    const determineCenter = (): [number, number] => {
        // Priority 1: Use live location if available
        if (location) {
            return [location.latitude, location.longitude];
        }
        // Priority 2: Use destination as center
        if (destination) {
            return [destination.lat, destination.lng];
        }
        // Priority 3: Use provided center
        if (center) {
            return [center.lat, center.lng];
        }
        // Priority 4: Default to VNIT campus center
        return [21.1259, 79.0525];
    };

    const mapCenter = determineCenter();

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
                {route.length > 0 && (
                    <Polyline
                        positions={route}
                        color={eventType === 'SOS' ? '#ef4444' : '#10b981'}
                        weight={6}
                        opacity={0.8}
                        lineJoin="round"
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
