import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { User, Phone, Mail, Home, ChevronRight, Shield, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function Profile() {
    const { user, profile } = useAuthStore();

    return (
        <MobileWrapper>
            <TopHeader title="My Profile" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Profile Header */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-10">
                    <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-[40px] flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CF9E1B]/20 via-transparent to-transparent rounded-[40px] opacity-50" />
                        <User className="w-14 h-14 text-[#D4AF37] relative z-10" strokeWidth={3} />
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-black shadow-lg">
                            <Shield className="w-5 h-5 text-black" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white font-heading tracking-tight drop-shadow-sm">{profile?.name || user?.displayName || 'TACTICAL ASSET'}</h2>
                    <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.3em] font-heading opacity-80 mt-2 bg-[#D4AF37]/5 px-4 py-1.5 rounded-full border border-[#D4AF37]/20">
                        {profile?.enrollmentNo || 'ID-REDACTED'}
                    </p>
                </motion.div>

                {/* Info Cards */}
                <motion.div variants={cardVariant} className="glass rounded-[2.5rem] shadow-2xl overflow-hidden mb-10 border border-white/5 bg-black/40">
                    <div className="p-6 border-b border-white/5 flex items-center gap-5 transition-all hover:bg-white/5">
                        <div className="bg-[#D4AF37]/10 p-3.5 rounded-2xl border border-[#D4AF37]/20">
                            <Mail className="w-5 h-5 text-[#D4AF37]" strokeWidth={3} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">Tactical Comms</p>
                            <p className="text-sm font-black text-white font-heading">{user?.email}</p>
                        </div>
                    </div>
                    <div className="p-6 border-b border-white/5 flex items-center gap-5 transition-all hover:bg-white/5">
                        <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20">
                            <Phone className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">Direct Line</p>
                            <p className="text-sm font-black text-white font-heading">{profile?.contactNumber || 'NOT ESTABLISHED'}</p>
                        </div>
                    </div>
                    <div className="p-6 flex items-center gap-5 transition-all hover:bg-white/5">
                        <div className="bg-[#D4AF37]/10 p-3.5 rounded-2xl border border-[#D4AF37]/20">
                            <Home className="w-5 h-5 text-[#D4AF37]" strokeWidth={3} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-0.5">Deployed Sector</p>
                            <p className="text-sm font-black text-white font-heading">
                                {profile?.hostel || 'CAMPUS HUB'} • UNIT {profile?.roomNo || 'N/A'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Settings & Actions */}
                <motion.div variants={cardVariant} className="space-y-5">
                    <h3 className="text-[10px] font-black text-[#D4AF37] ml-4 uppercase tracking-[0.3em] font-heading opacity-60">System Configuration</h3>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full glass p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between group border border-white/5 active:scale-95 transition-all bg-black/40"
                    >
                        <div className="flex items-center gap-5">
                            <div className="bg-[#D4AF37]/10 p-3.5 rounded-[20px] group-hover:bg-[#D4AF37]/20 transition-all border border-[#D4AF37]/10">
                                <Shield className="w-5 h-5 text-[#D4AF37]" strokeWidth={3} />
                            </div>
                            <span className="text-sm font-black text-white uppercase tracking-widest font-heading">Security Protocol</span>
                        </div>
                        <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full glass p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between group border border-white/5 active:scale-95 transition-all bg-black/40"
                    >
                        <div className="flex items-center gap-5">
                            <div className="bg-[#CF9E1B]/10 p-3.5 rounded-[20px] group-hover:bg-[#CF9E1B]/20 transition-all border border-[#CF9E1B]/10">
                                <Bell className="w-5 h-5 text-[#CF9E1B]" strokeWidth={3} />
                            </div>
                            <span className="text-sm font-black text-white uppercase tracking-widest font-heading">Alert Frequency</span>
                        </div>
                        <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                    </motion.button>
                </motion.div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
