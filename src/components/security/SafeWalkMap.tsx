import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { rtdb } from '../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { type SafeWalkSession } from '../../services/safeWalkService';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for Safe Walk
const safeWalkIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface SafeWalkMapProps {
    walks: SafeWalkSession[];
}

export default function SafeWalkMap({ walks }: SafeWalkMapProps) {
    // Default center: VNIT Nagpur (Approx)
    const defaultCenter: [number, number] = [21.123, 79.051];
    const [locations, setLocations] = useState<Record<string, any>>({});

    useEffect(() => {
        // Listen to safe walk locations
        const locationsRef = ref(rtdb, 'safe_walk_locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                setLocations(snapshot.val());
            } else {
                setLocations({});
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-lg border border-surface relative z-0">
            <MapContainer center={defaultCenter} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {walks.map(walk => {
                    const loc = locations[walk.id];
                    if (!loc) return null; // Don't show if no location data yet

                    return (
                        <Marker
                            key={walk.id}
                            position={[loc.latitude, loc.longitude]}
                            icon={safeWalkIcon}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-success">SAFE WALK</h3>
                                    <p className="font-semibold text-primary">{walk.userName}</p>
                                    <p className="text-xs text-muted">To: {walk.destination.name}</p>
                                    <p className="text-xs text-muted">Status: {walk.status}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
