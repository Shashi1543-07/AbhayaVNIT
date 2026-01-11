import { useEffect, useState } from 'react';
import { sosService, type SOSEvent } from '../../services/sosService';
import SOSCard from '../common/SOSCard';

interface WardenActiveSOSProps {
    hostelId?: string;
}

export default function WardenActiveSOS({ hostelId }: WardenActiveSOSProps) {
    const [allEvents, setAllEvents] = useState<SOSEvent[]>([]);

    useEffect(() => {
        // Subscribe to SOS events filtered by hostelId if provided
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setAllEvents(events);
        }, hostelId);
        return () => unsubscribe();
    }, [hostelId]);

    if (allEvents.length === 0) {
        return (
            <div className="bg-success/10 p-8 rounded-2xl border border-success/30 text-success flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-bold">All Clear</h3>
                <p className="text-sm">No active emergencies across campus.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {allEvents.map(event => (
                <SOSCard key={event.id} event={event} role="warden" />
            ))}
        </div>
    );
}
