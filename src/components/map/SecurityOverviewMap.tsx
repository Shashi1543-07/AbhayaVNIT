import { useState, useEffect, useRef } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline
} from 'react-leaflet';
import L, { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { type SOSEvent } from '../../services/sosService';


interface SecurityOverviewMapProps {
    sosEvents: SOSEvent[];
    activeWalks: SafeWalkSession[];
    selectedId?: string;
}

export default function SecurityOverviewMap({ sosEvents, activeWalks, selectedId }: SecurityOverviewMapProps) {
    const [locations, setLocations] = useState<Record<string, { lat: number; lng: number }>>({});

    /** Leaflet map reference */
    const mapRef = useRef<L.Map | null>(null);

    /** Marker references for smooth movement */
    const markerRefs = useRef<Record<string, L.Marker>>({});

    /* --------------------------------------------------
       Subscribe to live locations for all active walks
    -------------------------------------------------- */
    useEffect(() => {
        const unsubscribers: (() => void)[] = [];

        // 1. Subscribe to walks
        activeWalks.forEach((walk) => {
            if (!walk.userId) return;
            const unsub = safeWalkService.subscribeToWalkLocation(walk.userId, (location) => {
                setLocations((prev) => ({
                    ...prev,
                    [walk.userId]: { lat: location.latitude, lng: location.longitude }
                }));
            });
            unsubscribers.push(unsub);
        });

        // 2. Subscribe to SOS events
        sosEvents.forEach((event) => {
            if (!event.userId) return;
            const unsub = safeWalkService.subscribeToWalkLocation(event.userId, (location) => {
                setLocations((prev) => ({
                    ...prev,
                    [event.userId]: { lat: location.latitude, lng: location.longitude }
                }));
            });
            unsubscribers.push(unsub);
        });

        return () => unsubscribers.forEach(unsub => unsub());
    }, [activeWalks, sosEvents]);

    /* --------------------------------------------------
       Move markers instead of recreating (Smooth Movement)
    -------------------------------------------------- */
    useEffect(() => {
        Object.entries(locations).forEach(([id, loc]) => {
            const marker = markerRefs.current[id];
            if (marker) {
                marker.setLatLng([loc.lat, loc.lng]);
            }
        });
    }, [locations]);

    /* --------------------------------------------------
       Auto-follow selected event/walk
    -------------------------------------------------- */
    useEffect(() => {
        if (!selectedId || !mapRef.current) return;

        const loc = locations[selectedId] ||
            sosEvents.find(e => e.id === selectedId)?.location ||
            activeWalks.find(w => w.id === selectedId)?.startLocation;

        if (loc) {
            const lat = 'lat' in loc ? (loc as any).lat : (loc as any).latitude;
            const lng = 'lng' in loc ? (loc as any).lng : (loc as any).longitude;
            mapRef.current.panTo([lat, lng], {
                animate: true,
                duration: 0.5
            });
        }
    }, [selectedId, locations, sosEvents, activeWalks]);

    /* --------------------------------------------------
       Marker Helpers
    -------------------------------------------------- */
    const createColoredIcon = (status: string, type: 'sos' | 'walk') => {
        let color = '#10b981'; // Default green
        if (type === 'sos') color = '#ef4444'; // SOS red
        else {
            switch (status) {
                case 'danger': color = '#ef4444'; break;
                case 'delayed':
                case 'off-route': color = '#f59e0b'; break;
                case 'paused': color = '#6b7280'; break;
            }
        }

        const svg = `
            <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.7 0 0 6.7 0 15c0 10 15 25 15 25s15-15 15-25c0-8.3-6.7-15-15-15z"
                      fill="${color}" stroke="#fff" stroke-width="2"/>
                <circle cx="15" cy="15" r="6" fill="#fff"/>
            </svg>
        `;

        return new Icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        });
    };

    const defaultCenter: [number, number] = [21.125, 79.052];

    const handleMarkerClick = (data: any) => {
        // Emit custom event for parent components to handle
        const event = new CustomEvent('openWalkDetail', { detail: data });
        window.dispatchEvent(event);
    };

    return (
        <MapContainer
            center={defaultCenter}
            zoom={16}
            className="h-full w-full"
            ref={(map) => { if (map) mapRef.current = map; }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render Safe Walks */}
            {activeWalks.map((walk) => {
                const liveLoc = locations[walk.userId];
                const pos: [number, number] = liveLoc
                    ? [liveLoc.lat, liveLoc.lng]
                    : [walk.startLocation?.lat || 0, walk.startLocation?.lng || 0];

                return (
                    <Marker
                        key={walk.id}
                        position={pos}
                        icon={createColoredIcon(walk.status, 'walk')}
                        ref={(ref) => { if (ref) markerRefs.current[walk.userId] = ref; }}
                        eventHandlers={{ click: () => handleMarkerClick(walk) }}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm">{walk.userName}</h3>
                                <p className="text-xs text-slate-500">{walk.status.toUpperCase()}</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Render SOS Events */}
            {sosEvents.map((event) => {
                const liveLoc = locations[event.userId];
                const pos: [number, number] = liveLoc
                    ? [liveLoc.lat, liveLoc.lng]
                    : [event.location.lat, event.location.lng];

                return (
                    <Marker
                        key={event.id}
                        position={pos}
                        icon={createColoredIcon('danger', 'sos')}
                        ref={(ref) => { if (ref) markerRefs.current[event.userId] = ref; }}
                    >
                        <Popup>
                            <div className="p-1">
                                <h3 className="font-bold text-sm text-red-600">SOS: {event.userName}</h3>
                                <p className="text-xs">{event.emergencyType.toUpperCase()}</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Render Route Paths */}
            {activeWalks.map(walk => (
                <Polyline
                    key={`route-${walk.id}`}
                    positions={[
                        locations[walk.userId] ? [locations[walk.userId].lat, locations[walk.userId].lng] : [walk.startLocation?.lat || 0, walk.startLocation?.lng || 0],
                        [walk.destination?.lat || 0, walk.destination?.lng || 0]
                    ]}
                    color={walk.status === 'danger' ? '#ef4444' : '#10b981'}
                    weight={2}
                    opacity={0.5}
                    dashArray="5, 8"
                />
            ))}
        </MapContainer>
    );
}
