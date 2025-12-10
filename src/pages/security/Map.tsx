import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import LiveMap from '../../components/LiveMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { Shield, Map as MapIcon, User, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SecurityMap() {
    const [activeEvents, setActiveEvents] = useState<SOSEvent[]>([]);

    useEffect(() => {
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveEvents(events);
        });
        return () => unsubscribe();
    }, []);

    const securityNavItems = [
        { icon: Bell, label: 'SOS', path: '/security/dashboard' },
        { icon: MapIcon, label: 'Map', path: '/security/map' },
        { icon: Shield, label: 'Patrol', path: '/security/patrol' },
        { icon: User, label: 'Profile', path: '/security/profile' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="Campus Map" showBackButton={true} />
            <main className="h-[calc(100vh-140px)] w-full relative">
                <LiveMap sosEvents={activeEvents} />
                <div className="absolute top-4 right-4 glass-card px-3 py-1.5 rounded-lg text-xs font-bold shadow-md z-[400] border border-black/15">
                    {activeEvents.length} Active Alerts
                </div>
            </main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
