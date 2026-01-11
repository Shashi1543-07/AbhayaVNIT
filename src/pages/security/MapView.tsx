import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import ComprehensiveMap from '../../components/security/ComprehensiveMap';
import WalkDetailPanel from '../../components/security/WalkDetailPanel';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { securityNavItems } from '../../lib/navItems';

export default function SecurityMapView() {
    const [selectedWalk, setSelectedWalk] = useState<SafeWalkSession | null>(null);
    const [activeCount, setActiveCount] = useState(0);

    useEffect(() => {
        const unsubscribe = safeWalkService.subscribeToActiveWalks((walks) => {
            setActiveCount(walks.length);
        });

        // Listen for walk detail open events from map
        const handleOpenDetail = (e: any) => {
            setSelectedWalk(e.detail);
        };

        window.addEventListener('openWalkDetail', handleOpenDetail);

        return () => {
            unsubscribe();
            window.removeEventListener('openWalkDetail', handleOpenDetail);
        };
    }, []);


    return (
        <MobileWrapper>
            <div className="bg-transparent min-h-screen flex flex-col">
                <TopHeader title={`Live Map - ${activeCount} Active`} />

                <main className="px-4 pt-nav-safe pb-nav-safe flex-1 flex flex-col min-h-[calc(100vh-8rem)]">
                    <ComprehensiveMap />
                </main>

                {selectedWalk && (
                    <WalkDetailPanel
                        walk={selectedWalk}
                        onClose={() => setSelectedWalk(null)}
                    />
                )}
            </div>

            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
