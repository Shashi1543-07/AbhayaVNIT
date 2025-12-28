import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import StudentDirectory from '../../components/warden/StudentDirectory';
import { useAuthStore } from '../../context/authStore';
import { wardenNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';

export default function DirectoryPage() {
    const { profile } = useAuthStore();
    const hostelId = profile?.hostelId || profile?.hostel || 'Unknown';

    return (
        <MobileWrapper>
            <TopHeader title="Student Directory" showBackButton={true} />
            <motion.main
                className="px-4 py-6 pb-20 pt-24 h-full"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <div className="h-[calc(100vh-180px)]">
                    <StudentDirectory hostelId={hostelId} />
                </div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
