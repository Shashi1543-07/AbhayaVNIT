import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import WardenActiveSOS from '../../components/warden/WardenActiveSOS';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { wardenNavItems } from '../../lib/navItems';


export default function WardenSOS() {
    return (
        <MobileWrapper>
            <TopHeader title="Active Emergencies" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <WardenActiveSOS />
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
