import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

interface LiveMapProps {
    sosEvents: any[];
}

export default function LiveMap({ sosEvents }: LiveMapProps) {
    // Default center: VNIT Nagpur (Approx)
    const defaultCenter: [number, number] = [21.123, 79.051];

    const [liveLocations, setLiveLocations] = useState<Record<string, any>>({});

    useEffect(() => {
        // Listen to all live locations
        const locationsRef = ref(rtdb, 'live_locations');
        const unsubscribe = onValue(locationsRef, (snapshot) => {
            if (snapshot.exists()) {
                setLiveLocations(snapshot.val());
            } else {
                setLiveLocations({});
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-slate-300 relative z-0">
            <MapContainer center={defaultCenter} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {sosEvents.map(event => {
                    // Use live location if available, otherwise fallback to initial location
                    const liveLoc = liveLocations[event.userId];
                    const position: [number, number] = liveLoc
                        ? [liveLoc.latitude, liveLoc.longitude]
                        : [event.location.lat, event.location.lng];

                    return (
                        <Marker
                            key={event.id}
                            position={position}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold text-red-600">SOS ACTIVE</h3>
                                    <p className="font-semibold">{event.userName}</p>
                                    <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleTimeString()}</p>
                                    {liveLoc && <p className="text-xs text-green-600 font-bold mt-1">● Live Tracking</p>}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
