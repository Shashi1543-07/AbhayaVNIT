import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { studentNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
}

interface BottomNavProps {
    items?: NavItem[];
}

const BottomNav: React.FC<BottomNavProps> = ({ items }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const defaultItems: NavItem[] = studentNavItems;

    const navItems = items || defaultItems;

    const handleNav = (path: string) => {
        Haptics.impact({ style: ImpactStyle.Light });
        navigate(path);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none px-4 pb-8">
            <div className="w-full max-w-[420px] glass-nav pointer-events-auto rounded-[28px] overflow-hidden shadow-2xl safe-bottom border border-white/10">
                <div className="flex justify-around items-center h-16 relative">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.label}
                                onClick={() => handleNav(item.path)}
                                className="relative flex flex-col items-center justify-center w-full h-full space-y-1 outline-none active:scale-95 transition-transform"
                            >
                                <motion.div
                                    animate={active ? { scale: 1.15, color: "#D4AF37" } : { scale: 1, color: "#a1a1aa" }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                                </motion.div>
                                <span className={`text-[10px] font-bold transition-colors ${active ? 'text-[#CF9E1B]' : 'text-zinc-500'}`}>
                                    {item.label}
                                </span>
                                {active && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute bottom-0 w-12 h-1 bg-gradient-to-r from-[#D4AF37] to-[#8B7D13] rounded-t-full shadow-[0_-4px_10px_rgba(212,175,55,0.4)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNav;
