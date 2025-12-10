import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import { AlertTriangle, FileText, Home, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function WardenSOS() {

    const wardenNavItems = [
        { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
        { icon: AlertTriangle, label: 'SOS', path: '/warden/sos' },
        { icon: FileText, label: 'Reports', path: '/warden/reports' },
        { icon: Megaphone, label: 'Broadcast', path: '/warden/broadcasts' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="Active Emergencies" showProfile={true} showBackButton={true} />
            <motion.main
                className="px-4 py-6 pb-20"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <div className="glass-card-soft bg-surface/50 rounded-2xl overflow-hidden border-2 border-black/15">
                        <WardenActiveSOS />
                    </div>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
