import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import IncidentReports from '../../components/warden/IncidentReports';
import { wardenNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';

export default function WardenReports() {
    return (
        <MobileWrapper>
            <TopHeader title="Student Complaints" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <IncidentReports hostelId={'all'} />
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}

