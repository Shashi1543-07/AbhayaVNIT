import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import { wardenNavItems } from '../../lib/navItems';

export default function WardenReports() {

    // Nav items imported from shared lib

    return (
        <MobileWrapper>
            <TopHeader title="Student Reports" showBackButton={true} />
            <motion.main
                className="px-4 py-6 pb-20 pt-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    variants={cardVariant}
                    className="glass-card rounded-2xl p-6 shadow-soft text-center border-2 border-black/15"
                >
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-700">No Reports Found</h3>
                    <p className="text-slate-500 text-sm">There are no pending reports from students at this time.</p>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
