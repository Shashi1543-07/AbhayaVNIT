import React from 'react';

interface MobileWrapperProps {
    children: React.ReactNode;
    className?: string;
}

const MobileWrapper: React.FC<MobileWrapperProps> = ({ children, className = '' }) => {
    return (
        <div className={`min-h-screen bg-transparent text-slate-800 font-sans relative pt-20 pb-20 ${className}`}>
            {children}
        </div>
    );
};

export default MobileWrapper;
