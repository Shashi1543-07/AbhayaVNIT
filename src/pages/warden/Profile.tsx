import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { wardenNavItems } from '../../lib/navItems';
import { User, Shield, Info, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { containerStagger, cardVariant } from '../../lib/animations';
import EmergencyContactsList from '../../components/common/EmergencyContactsList';

export default function WardenProfile() {
    const { user, profile } = useAuthStore();
    const navigate = useNavigate();

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
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-8">
                    <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-full flex items-center justify-center mb-5 border border-white/10 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#CF9E1B]/20 via-transparent to-transparent rounded-full opacity-50" />
                        <User className="w-14 h-14 text-[#D4AF37] relative z-10" strokeWidth={2.5} />
                        <div className="absolute bottom-1 right-1 w-9 h-9 bg-purple-500 rounded-full flex items-center justify-center border-4 border-[#121212] shadow-lg">
                            <Shield className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-heading tracking-tight text-center">{profile?.name || 'Warden'}</h2>
                    <p className="text-[#D4AF37] text-sm font-bold mt-1">@{profile?.username || 'no_alias'}</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-purple-500/20">
                            Authorized Warden
                        </span>
                    </div>
                </motion.div>

                {/* Info Cards */}
                <motion.div variants={cardVariant} className="glass rounded-[2rem] shadow-2xl overflow-hidden mb-8 border border-white/5 bg-[#1a1a1a]/40">
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shrink-0">
                            <User className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Email Address</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{user?.email || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <User className="w-5 h-5 text-blue-400" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Contact Number</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{profile?.phone || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <Shield className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Assigned Hostel</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{profile?.hostel || profile?.hostelId || 'N/A'}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Settings & Actions */}
                <motion.div variants={cardVariant} className="space-y-4 mb-24">
                    <h3 className="text-xs font-bold text-zinc-500 ml-4 uppercase tracking-widest">Management</h3>

                    <div className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white/5 bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]/60 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Emergency Protocol</span>
                        </div>
                    </div>

                    <div
                        onClick={() => navigate('/about')}
                        className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white/5 bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]/60 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Info className="w-5 h-5 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">About App</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </div>
                </motion.div>

                {/* Emergency Contacts */}
                <motion.div variants={cardVariant} className="mb-8">
                    <EmergencyContactsList />
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper >
    );
}
