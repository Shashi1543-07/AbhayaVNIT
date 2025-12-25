import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { CheckCircle } from 'lucide-react';
import { securityNavItems } from '../../lib/navItems';

export default function SecurityPatrol() {

    return (
        <MobileWrapper>
            <TopHeader title="Patrol Management" showBackButton={true} />
            <main className="px-4 py-6 pb-20 space-y-4">
                <div className="glass-card rounded-2xl p-6 border border-black/15">
                    <h3 className="font-bold text-slate-800 mb-4">Current Shift</h3>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">Active Duty</p>
                            <p className="text-xs text-slate-600">Started at 08:00 AM</p>
                        </div>
                    </div>
                    <button className="w-full bg-white/40 text-slate-700 font-bold py-3 rounded-xl hover:bg-white/50 transition-colors">
                        End Shift
                    </button>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-black/15">
                    <h3 className="font-bold text-slate-800 mb-4">Assigned Zones</h3>
                    <div className="space-y-3">
                        {['Library Area', 'Hostel Block A', 'Main Gate'].map((zone) => (
                            <div key={zone} className="flex justify-between items-center p-3 bg-white/40 rounded-xl">
                                <span className="text-sm font-medium text-slate-800">{zone}</span>
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
