import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { AlertTriangle, FileText, Home, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function WardenProfile() {
    const { profile, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const wardenNavItems = [
        { icon: Home, label: 'Dashboard', path: '/warden/dashboard' },
        { icon: AlertTriangle, label: 'SOS', path: '/warden/sos' },
        { icon: FileText, label: 'Reports', path: '/warden/reports' },
        { icon: User, label: 'Profile', path: '/warden/profile' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="My Profile" />
            <motion.main
                className="px-4 py-6 pb-20 space-y-4"
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

                <motion.div
                    variants={cardVariant}
                    className="glass-card rounded-2xl shadow-soft overflow-hidden border border-white/40"
                >
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-4 text-emergency hover:bg-emergency/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </motion.div>
            </motion.main>
            <BottomNav items={wardenNavItems} />
        </MobileWrapper>
    );
}
