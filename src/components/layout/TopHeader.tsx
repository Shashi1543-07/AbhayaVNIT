import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../context/authStore';

interface TopHeaderProps {
    title: string;
    showBackButton?: boolean;
    transparent?: boolean;
    leftElement?: React.ReactNode;
}

export default function TopHeader({ title, showBackButton = false, transparent = false, leftElement }: TopHeaderProps) {
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
        <header className={`fixed top-0 left-0 right-0 z-40 px-6 pb-6 pt-6 flex items-end justify-between shrink-0 safe-top transition-all duration-300 ${transparent
            ? 'bg-transparent'
            : 'glass-nav border-b border-white/5 shadow-2xl backdrop-blur-3xl pt-0'
            }`}>
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 -ml-2 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 text-[#D4AF37] transition-all shadow-lg border border-white/10 active:scale-90"
                    >
                        <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                )}
                {leftElement}
                <h1 className="text-xl font-heading font-extrabold text-[#CF9E1B] tracking-tight truncate max-w-[220px] drop-shadow-sm">{title}</h1>
            </div>

            <div className="flex items-center">
                <button
                    onClick={handleLogout}
                    className="p-2.5 rounded-xl bg-red-500/5 hover:bg-red-500/15 text-red-500 transition-all shadow-lg border border-red-500/10 active:scale-90 backdrop-blur-md"
                    title="Logout"
                >
                    <LogOut size={20} strokeWidth={2.5} />
                </button>
            </div>
        </header>
    );
}
