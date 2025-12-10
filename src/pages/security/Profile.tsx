import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { Shield, Map as MapIcon, User, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SecurityProfile() {
    const { profile, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const securityNavItems = [
        { icon: Bell, label: 'SOS', path: '/security/dashboard' },
        { icon: MapIcon, label: 'Map', path: '/security/map' },
        { icon: Shield, label: 'Patrol', path: '/security/patrol' },
        { icon: User, label: 'Profile', path: '/security/profile' },
    ];

    return (
        <MobileWrapper>
            <TopHeader title="Security Profile" showBackButton={true} />
            <main className="px-4 py-6 pb-20 space-y-4">
                <div className="glass-card rounded-2xl p-6 flex flex-col items-center border border-black/15">
                    <div className="w-20 h-20 bg-white/40 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-10 h-10 text-slate-700" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">{profile?.name || 'Security Officer'}</h2>
                    <p className="text-slate-600">{profile?.email}</p>
                    <div className="mt-2 px-3 py-1 bg-white/30 text-slate-800 rounded-full text-xs font-bold uppercase">
                        {profile?.role || 'Security'}
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-black/15">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
