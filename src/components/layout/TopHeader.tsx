import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../context/authStore';

interface TopHeaderProps {
    title: string;
    showBackButton?: boolean;
    transparent?: boolean;
}

export default function TopHeader({ title, showBackButton = false, transparent = false }: TopHeaderProps) {
    const navigate = useNavigate();
    const { role } = useAuthStore();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate(`/login?role=${role || 'student'}`);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className={`fixed top-0 left-0 right-0 mx-auto w-full lg:max-w-[480px] z-40 px-6 pb-6 pt-6 flex items-end justify-between shrink-0 safe-top transition-all duration-300 ${transparent
            ? 'bg-transparent'
            : 'glass-nav border-b border-white/20 shadow-xl backdrop-blur-xl pt-0'
            }`}>
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 -ml-2 rounded-full bg-white/40 hover:bg-white/60 text-slate-700 transition-all shadow-sm border border-white/20 active:scale-90"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1 className="text-xl font-heading font-extrabold text-primary-dark tracking-tight truncate max-w-[220px]">{title}</h1>
            </div>

            <div className="flex items-center">
                <button
                    onClick={handleLogout}
                    className="p-2.5 rounded-full bg-red-50/50 hover:bg-red-100 text-red-500 transition-all shadow-sm border border-red-100 active:scale-90"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}
