import { ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';

interface TopHeaderProps {
    title: string;
    showBackButton?: boolean;
}

export default function TopHeader({ title, showBackButton = false }: TopHeaderProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 mx-auto w-full max-w-[480px] z-40 glass-nav border-b px-4 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-primary-50 text-slate-700 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}
                <h1 className="text-xl font-heading font-bold text-primary truncate max-w-[200px]">{title}</h1>
            </div>

            <div className="flex items-center">
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                    title="Logout"
                >
                    <LogOut size={24} />
                </button>
            </div>
        </header>
    );
}
