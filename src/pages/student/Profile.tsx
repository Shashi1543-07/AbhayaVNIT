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
                className="px-4 pb-24 main-content-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Profile Header */}
                <motion.div variants={cardVariant} className="flex flex-col items-center justify-center py-6">
                    <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mb-3 border-4 border-white shadow-soft">
                        <User className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-primary">{profile?.name || user?.displayName || 'Student'}</h2>
                    <p className="text-sm text-muted">{profile?.enrollmentNo || 'Enrollment No.'}</p>
                </motion.div>

                {/* Info Cards */}
                <motion.div variants={cardVariant} className="bg-surface rounded-2xl shadow-soft overflow-hidden">
                    <div className="p-4 border-b border-surface flex items-center gap-3">
                        <div className="bg-primary-50 p-2 rounded-full">
                            <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted">Email</p>
                            <p className="text-sm font-medium text-primary">{user?.email}</p>
                        </div>
                    </div>
                    <div className="p-4 border-b border-surface flex items-center gap-3">
                        <div className="bg-success-50 p-2 rounded-full">
                            <Phone className="w-4 h-4 text-success" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted">Phone</p>
                            <p className="text-sm font-medium text-primary">{profile?.contactNumber || 'Not set'}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center gap-3">
                        <div className="bg-secondary-50 p-2 rounded-full">
                            <Home className="w-4 h-4 text-secondary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted">Hostel & Room</p>
                            <p className="text-sm font-medium text-primary">
                                {profile?.hostel || 'Hostel'} • {profile?.roomNo || 'Room'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Settings & Actions */}
                <motion.div variants={cardVariant} className="space-y-3">
                    <h3 className="text-sm font-bold text-primary ml-1">Settings</h3>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-surface p-4 rounded-2xl shadow-soft flex items-center justify-between group active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-50 p-2 rounded-full group-hover:bg-primary-100 transition-colors">
                                <Shield className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-primary">Security Settings</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted" />
                    </motion.button>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-surface p-4 rounded-2xl shadow-soft flex items-center justify-between group active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-50 p-2 rounded-full group-hover:bg-primary-100 transition-colors">
                                <Bell className="w-4 h-4 text-primary " />
                            </div>
                            <span className="text-sm font-medium text-primary">Notifications</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted" />
                    </motion.button>
                </motion.div>
            </motion.main>

            <BottomNav />
        </MobileWrapper>
    );
}
