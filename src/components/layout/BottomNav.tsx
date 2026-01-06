import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { studentNavItems } from '../../lib/navItems';
import { motion } from 'framer-motion';

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

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="w-full max-w-[480px] glass-nav border-t pointer-events-auto">
                <div className="flex justify-around items-center h-16 relative">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                className="relative flex flex-col items-center justify-center w-full h-full space-y-1 outline-none"
                            >
                                <motion.div
                                    animate={active ? { scale: 1.2, color: "#C084FC" } : { scale: 1, color: "#334155" }}
                                    whileTap={{ scale: 0.85 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                                </motion.div>
                                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : 'text-slate-700'}`}>
                                    {item.label}
                                </span>
                                {active && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute bottom-0 w-12 h-1 bg-gradient-to-r from-[#FF99AC] to-[#C084FC] rounded-t-full"
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
