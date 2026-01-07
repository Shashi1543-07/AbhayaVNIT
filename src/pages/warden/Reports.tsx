import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import IncidentReports from '../../components/warden/IncidentReports';
import { useAuthStore } from '../../context/authStore';
import { wardenNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';

export default function WardenReports() {
    const { profile } = useAuthStore();
    const hostelId = profile?.hostelId || profile?.hostel || 'Unknown';

    return (
        <MobileWrapper>
            <TopHeader title="Student Complaints" showBackButton={true} />
            <motion.main
                className="px-4 pt-28 pb-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <IncidentReports hostelId={hostelId} />
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}

