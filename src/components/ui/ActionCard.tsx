import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariant } from '../../lib/animations';

interface ActionCardProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    variant?: 'primary' | 'default';
    className?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({
    icon: Icon,
    label,
    onClick,
    variant = 'default',
    className = ''
}) => {
    const baseStyles = "flex flex-col items-center justify-center p-4 rounded-3xl cursor-pointer transition-all duration-300";
    const variants = {
        default: "glass text-white border-white/10 shadow-2xl",
        primary: "bg-gradient-to-br from-[#CF9E1B] to-[#8B6E13] text-black shadow-lg border border-white/20",
    };

    return (
        <motion.div
            variants={cardVariant}
            whileHover={{ y: -4, scale: 1.02, boxShadow: "0 20px 40px rgba(212,175,55,0.15)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            <div className={`p-3 rounded-2xl mb-2 ${variant === 'primary' ? 'bg-black/10 text-black' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-heading font-black text-center leading-tight uppercase tracking-tight">{label}</span>
        </motion.div>
    );
};

export default ActionCard;
