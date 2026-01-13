import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { wardenNavItems } from '../../lib/navItems';
import { User, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function WardenProfile() {
    const { profile } = useAuthStore();

    return (
        <MobileWrapper>
            <TopHeader title="My Profile" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    variants={cardVariant}
                    className="glass rounded-[3rem] p-10 shadow-2xl flex flex-col items-center border border-white/5 bg-black/40"
                >
                    <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl rounded-[32px] flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CF9E1B]/20 via-transparent to-transparent rounded-[32px] opacity-50" />
                        <User className="w-12 h-12 text-[#D4AF37]" strokeWidth={3} />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#D4AF37] rounded-xl flex items-center justify-center border-4 border-black shadow-lg">
                            <Shield className="w-4 h-4 text-black" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-black text-white font-heading tracking-tight drop-shadow-sm">{profile?.name || 'WARDEN CMD'}</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-2 font-mono">{profile?.email}</p>
                    <div className="mt-4 px-5 py-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border border-[#D4AF37]/20">
                        {profile?.role || 'WARDEN'}
                    </div>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
