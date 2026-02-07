import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon } from 'leaflet';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { Navigation, Shield, AlertTriangle, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function ComprehensiveMap() {
    const [walks, setWalks] = useState<SafeWalkSession[]>([]);
    const [locations, setLocations] = useState<{ [walkId: string]: { lat: number; lng: number } }>({});
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);

    useEffect(() => {
        // Subscribe to all active walks
        const unsubscribe = safeWalkService.subscribeToActiveWalks((activeWalks) => {
            setWalks(activeWalks);

            // Subscribe to each walk's location
            activeWalks.forEach(walk => {
                safeWalkService.subscribeToWalkLocation(walk.id, (location) => {
                    setLocations(prev => ({
                        ...prev,
                        [walk.id]: { lat: location.latitude, lng: location.longitude }
                    }));
                });
            });
        });

        return () => unsubscribe();
    }, []);

    const getMarkerColor = (status: string) => {
        switch (status) {
            case 'danger': return '#ef4444'; // red
            case 'delayed':
            case 'off-route': return '#f59e0b'; // yellow/orange
            case 'paused': return '#6b7280'; // gray
            default: return '#10b981'; // green
        }
    };

    const createColoredIcon = (status: string) => {
        const color = getMarkerColor(status);
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

    // Default center (VNIT campus approximate)
    const defaultCenter: [number, number] = [21.1250, 79.0520];

    return (
        <div className="h-[calc(100vh-8rem)] relative">
            <MapContainer
                center={defaultCenter}
                zoom={15}
                className="h-full w-full rounded-xl"
                style={{ zIndex: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {walks.map(walk => {
                    const location = locations[walk.id];
                    if (!location) return null;

                    return (
                        <Marker
                            key={walk.id}
                            position={[location.lat, location.lng]}
                            icon={createColoredIcon(walk.status)}
                            eventHandlers={{
                                click: () => setSelectedWalk(walk)
                            }}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-sm">{walk.userName}</h3>
                                    <p className="text-xs text-slate-600">{walk.userHostel || walk.hostelId || 'Campus'}</p>
                                    <div className="flex items-center text-xs mt-1">
                                        <Navigation className="w-3 h-3 mr-1" />
                                        <span>{walk.destination.name}</span>
                                    </div>
                                    <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${walk.status === 'danger' ? 'bg-red-100 text-red-700' :
                                        walk.status === 'delayed' || walk.status === 'off-route' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                        {walk.status.toUpperCase()}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Draw routes - lines from current location to destination */}
                {walks.map(walk => {
                    const location = locations[walk.id];
                    if (!location) return null;

                    const positions: [number, number][] = [
                        [location.lat, location.lng],
                        [walk.destination.lat, walk.destination.lng]
                    ];

                    return (
                        <Polyline
                            key={`route-${walk.id}`}
                            positions={positions}
                            color={getMarkerColor(walk.status)}
                            weight={2}
                            opacity={0.6}
                            dashArray="5, 10"
                        />
                    );
                })}
            </MapContainer>

            {/* Sidebar with walk details */}
            {selectedWalk && (
                <div className="absolute top-4 right-4 glass-card rounded-xl shadow-lg p-4 max-w-sm w-80 z-10 backdrop-blur-md bg-white/90 border border-white/20">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{selectedWalk.userName}</h3>
                            <p className="text-sm text-slate-500">{selectedWalk.userHostel || selectedWalk.hostelId || 'Campus'}</p>
                        </div>
                        <button
                            onClick={() => setSelectedWalk(null)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                            <Navigation className="w-4 h-4 mr-2 text-primary" />
                            <span className="text-slate-700">{selectedWalk.destination.name}</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            <span className="text-slate-700">{selectedWalk.expectedDuration} min</span>
                        </div>
                        {selectedWalk.escortRequested && !selectedWalk.assignedEscort && (
                            <div className="flex items-center bg-blue-50 p-2 rounded">
                                <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
                                <span className="text-blue-700 font-semibold">Escort Requested</span>
                            </div>
                        )}
                        {selectedWalk.assignedEscort && (
                            <div className="flex items-center bg-green-50 p-2 rounded">
                                <Shield className="w-4 h-4 mr-2 text-green-600" />
                                <span className="text-green-700">Escort: {selectedWalk.assignedEscort}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            // Open full detail panel
                            window.dispatchEvent(new CustomEvent('openWalkDetail', { detail: selectedWalk }));
                            setSelectedWalk(null);
                        }}
                        className="w-full mt-4 bg-primary text-white py-2 rounded-lg font-semibold text-sm shadow-md hover:bg-primary/90 transition-colors"
                    >
                        View Full Details
                    </button>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-card rounded-lg shadow-lg p-3 z-10 backdrop-blur-md bg-white/90 border border-white/20">
                <h4 className="text-xs font-bold mb-2 text-slate-700">Walk Status</h4>
                <div className="space-y-1">
                    <div className="flex items-center text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2 shadow-sm"></div>
                        <span>Active</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2 shadow-sm"></div>
                        <span>Delayed/Off-route</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-sm"></div>
                        <span>Danger</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-gray-500 mr-2 shadow-sm"></div>
                        <span>Paused</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
