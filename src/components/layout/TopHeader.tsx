import React from 'react';
import { Bell, ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopHeaderProps {
    title?: string;
    showNotifications?: boolean;
    showBackButton?: boolean;
    showProfile?: boolean;
}

const TopHeader: React.FC<TopHeaderProps> = ({ title = 'SafetyVNIT', showNotifications = true, showBackButton = false, showProfile = false }) => {
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-40 glass-nav border-b px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {showBackButton && (
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-primary-50 text-slate-700 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                )}
                <h1 className="text-xl font-heading font-bold text-primary">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
                {showProfile ? (
                    <button
                        onClick={() => navigate('/warden/profile')}
                        className="p-2 rounded-full hover:bg-primary-50 transition-colors text-slate-700"
                    >
                        <User size={24} />
                    </button>
                ) : showNotifications && (
                    <button className="p-2 rounded-full hover:bg-primary-50 transition-colors relative">
                        <Bell size={24} className="text-slate-700" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-emergency rounded-full ring-2 ring-white"></span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default TopHeader;
