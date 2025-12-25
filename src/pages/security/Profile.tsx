import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { useAuthStore } from '../../context/authStore';
import { securityNavItems } from '../../lib/navItems';
import { Shield } from 'lucide-react';

export default function SecurityProfile() {
    const { profile } = useAuthStore();


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

            </main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
