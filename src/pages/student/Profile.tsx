import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { User, Phone, Mail, Home, ChevronRight, Shield, Bell, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { containerStagger, cardVariant } from '../../lib/animations';
import EmergencyContactsList from '../../components/common/EmergencyContactsList';
import BiometricSettings from '../../components/shared/BiometricSettings';

export default function Profile() {
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
                        <div className="absolute bottom-1 right-1 w-9 h-9 bg-[#D4AF37] rounded-full flex items-center justify-center border-4 border-[#121212] shadow-lg">
                            <Shield className="w-4 h-4 text-black" strokeWidth={3} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white font-heading tracking-tight text-center">{profile?.name || user?.displayName || 'Student'}</h2>
                    <p className="text-[#D4AF37] text-sm font-bold mt-1">@{profile?.username || 'no_alias'}</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest rounded-full border border-[#D4AF37]/20">
                            {profile?.enrollmentNumber || profile?.rollNo || 'ID - N/A'}
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-500/20">
                            Active Student
                        </span>
                    </div>
                </motion.div>

                {/* Info Cards */}
                <motion.div variants={cardVariant} className="glass rounded-[2rem] shadow-2xl overflow-hidden mb-8 border border-white/5 bg-[#1a1a1a]/40">
                    {/* Email */}
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 shrink-0">
                            <Mail className="w-5 h-5 text-[#D4AF37]" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Email Address</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{user?.email || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <Phone className="w-5 h-5 text-blue-400" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Contact Number</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{profile?.phone || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Hostel & Room */}
                    <div className="p-5 border-b border-white/5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                            <Home className="w-5 h-5 text-purple-400" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Campus Residence</p>
                            <p className="text-sm font-semibold text-zinc-200 truncate font-heading">
                                {profile?.hostel || profile?.hostelId || 'N/A'} • Room {profile?.roomNo || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* ID & Enrollment */}
                    <div className="p-5 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20 shrink-0">
                            <Shield className="w-5 h-5 text-pink-400" strokeWidth={2} />
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">ID Number</p>
                                <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{profile?.idNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Enrollment</p>
                                <p className="text-sm font-semibold text-zinc-200 truncate font-heading">{profile?.enrollmentNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Additional Settings (Visual only) */}
                <motion.div variants={cardVariant} className="space-y-4 mb-24">
                    <h3 className="text-xs font-bold text-zinc-500 ml-4 uppercase tracking-widest">Account Settings</h3>

                    <div className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white/5 bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]/60 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Security Settings</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                    </div>

                    <div className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white/5 bg-[#1a1a1a]/40 hover:bg-[#1a1a1a]/60 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Notifications</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
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

                {/* Biometric Auth Settings */}
                <motion.div variants={cardVariant}>
                    <BiometricSettings role="student" userEmail={user?.email || ''} />
                </motion.div>

                {/* Emergency Contacts */}
                <motion.div variants={cardVariant} className="mb-8">
                    <EmergencyContactsList />
                </motion.div>

            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
