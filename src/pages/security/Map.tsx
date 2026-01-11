import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import SecurityOverviewMap from '../../components/map/SecurityOverviewMap';
import { sosService, type SOSEvent } from '../../services/sosService';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { securityNavItems } from '../../lib/navItems';
import { useState, useEffect } from 'react';

export default function SecurityMap() {
    const [activeEvents, setActiveEvents] = useState<SOSEvent[]>([]);
    const [activeWalks, setActiveWalks] = useState<SafeWalkSession[]>([]);

    useEffect(() => {
        const unsubscribeSOS = sosService.subscribeToActiveSOS((events) => {
            setActiveEvents(events);
        });

        const unsubscribeWalks = safeWalkService.subscribeToActiveWalks((walks) => {
            setActiveWalks(walks);
        });

        return () => {
            unsubscribeSOS();
            unsubscribeWalks();
        };
    }, []);

    return (
        <MobileWrapper>
            <TopHeader title="Campus Overview" showBackButton={true} />
            <main className="px-4 pt-nav-safe pb-nav-safe flex-1 flex flex-col min-h-[calc(100vh-8rem)]">
                <SecurityOverviewMap
                    sosEvents={activeEvents}
                    activeWalks={activeWalks}
                />

                {/* Stats Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-[400]">
                    {activeEvents.length > 0 && (
                        <div className="glass-card px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 border border-red-200 shadow-md">
                            {activeEvents.length} Active SOS
                        </div>
                    )}
                    {activeWalks.length > 0 && (
                        <div className="glass-card px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 shadow-md">
                            {activeWalks.length} Safe Walks
                        </div>
                    )}
                </div>
            </main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
