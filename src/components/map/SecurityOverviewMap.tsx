import { useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { mapService, type LocationData } from '../../services/mapService';
import MapMarker from './MapMarker';
import 'leaflet/dist/leaflet.css';

interface SecurityOverviewMapProps {
    sosEvents: any[]; // Replace with proper type
    activeWalks: any[]; // Replace with proper type
}

export default function SecurityOverviewMap({ sosEvents, activeWalks }: SecurityOverviewMapProps) {
    const defaultCenter: [number, number] = [21.123, 79.051]; // VNIT Nagpur
    const [liveLocations, setLiveLocations] = useState<Record<string, LocationData>>({});

    useEffect(() => {
        const unsubscribe = mapService.subscribeToGlobalLocations((locations) => {
            setLiveLocations(locations);
        });
        return () => unsubscribe();
    }, []);



    return (
        <div className="h-full w-full rounded-xl overflow-hidden relative z-0">
            <MapContainer
                center={defaultCenter}
                zoom={15}
                className="h-full w-full"
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render SOS Markers */}
                {sosEvents.map(event => {
                    const loc = liveLocations[event.userId];
                    if (!loc) return null; // Only show if we have live data? Or show static? 
                    // Requirement: "One marker per student only". 
                    // "When an event ends... marker MUST be removed immediately" -> Handled by parent passing filtered list.

                    return (
                        <MapMarker
                            key={`sos-${event.id}`}
                            location={loc}
                            type="SOS"
                            userName={event.userName || 'Unknown'}
                            description={`Room: ${event.roomNumber || 'N/A'}`}
                        />
                    );
                })}

                {/* Render Safe Walk Markers */}
                {activeWalks.map(walk => {
                    // Prevent duplicate markers if student has both (Edge case, but possible)
                    if (sosEvents.some(e => e.userId === walk.userId)) return null;

                    const loc = liveLocations[walk.userId];
                    if (!loc) return null;

                    return (
                        <MapMarker
                            key={`walk-${walk.id}`}
                            location={loc}
                            type="SAFEWALK"
                            userName={walk.userName || 'Student'}
                            description={`Dest: ${walk.destination?.name || 'Unknown'}`}
                        />
                    );
                })}
            </MapContainer>
        </div>
    );
}
