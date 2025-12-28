import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { wardenNavItems } from '../../lib/navItems';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function WardenProfile() {
    const { profile } = useAuthStore();

    return (
        <MobileWrapper>
            <TopHeader title="My Profile" showBackButton={true} />
            <motion.main
                className="px-4 py-6 pb-20 space-y-4 pt-24"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    variants={cardVariant}
                    className="glass-card rounded-2xl p-6 shadow-soft flex flex-col items-center border border-white/40"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <User className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{profile?.name || 'Warden'}</h2>
                    <p className="text-slate-500">{profile?.email}</p>
                    <div className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase">
                        {profile?.role || 'Warden'}
                    </div>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
