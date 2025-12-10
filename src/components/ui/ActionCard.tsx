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
    const baseStyles = "flex flex-col items-center justify-center p-4 rounded-2xl cursor-pointer";
    const variants = {
        default: "bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white hover:shadow-lg shadow-md border border-white/20",
        primary: "bg-primary text-white shadow-lg hover:shadow-xl",
    };

    return (
        <motion.div
            variants={cardVariant}
            whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${className}`}
        >
            <Icon size={28} className="mb-2" strokeWidth={2} />
            <span className="text-sm font-medium text-center leading-tight">{label}</span>
        </motion.div>
    );
};

export default ActionCard;
