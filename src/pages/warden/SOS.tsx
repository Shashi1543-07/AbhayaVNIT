import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { wardenNavItems } from '../../lib/navItems';
import { useAuthStore } from '../../context/authStore';

export default function WardenSOS() {
    const { profile } = useAuthStore();
    const wardenHostelId = profile?.hostelId || profile?.hostel || 'H6';

    return (
        <MobileWrapper>
            <TopHeader title="Active Emergencies" showBackButton={true} />
            <motion.main
                className="px-4 py-6 pb-20 pt-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <div className="glass-card-soft bg-surface/50 rounded-2xl overflow-hidden border-2 border-emergency">
                        <WardenActiveSOS hostelId={wardenHostelId} />
                    </div>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
