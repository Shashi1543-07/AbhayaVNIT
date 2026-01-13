import React from 'react';

type StatusType = 'success' | 'warning' | 'error' | 'neutral';

interface StatusBadgeProps {
    status: StatusType;
    label: string;
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
    const styles = {
        success: "bg-success/10 text-success border-success/30",
        warning: "bg-warning/10 text-warning border-warning/30",
        error: "bg-emergency-pulse text-emergency-dark border-emergency/30",
        neutral: "bg-primary-50 text-text-secondary border-primary-200",
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black font-heading uppercase tracking-widest border transition-all duration-300 ${styles[status]} ${className}`}>
            {label}
        </span>
    );
};

export default StatusBadge;
