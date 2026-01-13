import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import { motion } from 'framer-motion';
import { containerStagger } from '../../lib/animations';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { securityNavItems } from '../../lib/navItems';
import { Shield } from 'lucide-react';

export default function SecurityProfile() {
    const { profile } = useAuthStore();


    return (
        <MobileWrapper>
            <TopHeader title="Security Profile" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="show"
            >
                <div className="glass rounded-[3rem] p-10 flex flex-col items-center border border-white/5 bg-black/40 shadow-2xl">
                    <div className="w-24 h-24 bg-white/5 backdrop-blur-3xl rounded-[32px] flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CF9E1B]/20 via-transparent to-transparent rounded-[32px] opacity-50" />
                        <Shield className="w-12 h-12 text-[#D4AF37]" strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-black text-white font-heading tracking-tight drop-shadow-sm">{profile?.name || 'FIELD OFFICER'}</h2>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-2 font-mono">{profile?.email}</p>
                    <div className="mt-4 px-5 py-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        {profile?.role || 'SECURITY HQ'}
                    </div>
                </div>

            </motion.main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
