import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import EventDetailMap from '../../components/map/EventDetailMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { mapService, type LocationData } from '../../services/mapService';
import { motion } from 'framer-motion';

export default function EventMapPage() {
    const { id } = useParams();
    const [event, setEvent] = useState<SOSEvent | null>(null);
    const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        // Fetch event details (we need userName and static location as fallback)
        // Subscribing to all active might be heavy just for one, but consistent with other pages.
        // Or we could fetch single doc if service supported it. sticking to subscription for consistency.
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            const found = events.find(e => e.id === id);
            if (found) {
                setEvent(found);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        if (!event?.userId) return;
        const unsubscribe = mapService.subscribeToSingleLocation(event.userId, (data) => {
            setLiveLocation(data);
        });
        return () => unsubscribe();
    }, [event?.userId]);

    if (loading) {
        return (
            <MobileWrapper>
                <TopHeader title="Loading Map..." showBackButton={true} />
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </MobileWrapper>
        );
    }

    if (!event) {
        return (
            <MobileWrapper>
                <TopHeader title="Event Not Found" showBackButton={true} />
                <div className="p-4 text-center pt-20">
                    <p className="text-muted">Event not found.</p>
                </div>
            </MobileWrapper>
        );
    }

    return (
        <MobileWrapper className="pb-0 bg-slate-100">
            <TopHeader title={`${event.userName}'s Location`} showBackButton={true} transparent={true} />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 top-0 left-0 right-0 bottom-0 z-0" // Full screen relative to MobileWrapper
            >
                <EventDetailMap
                    userName={event.userName}
                    eventType="SOS"
                    location={liveLocation}
                    center={
                        liveLocation ? { lat: liveLocation.latitude, lng: liveLocation.longitude } :
                            (typeof event.location === 'object' && event.location !== null && 'lat' in event.location) ?
                                { lat: (event.location as any).lat, lng: (event.location as any).lng } :
                                { lat: 21.1259, lng: 79.0525 }
                    }
                />
            </motion.div>
        </MobileWrapper>
    );
}
