import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: 'info' | 'danger' | 'success' | 'warning';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export default function CustomModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false
}: CustomModalProps) {

    const getIcon = () => {
        switch (type) {
            case 'danger': return <ShieldAlert className="w-8 h-8 text-red-500" />;
            case 'success': return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
            case 'warning': return <AlertCircle className="w-8 h-8 text-amber-500" />;
            default: return <Info className="w-8 h-8 text-[#D4AF37]" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'danger': return {
                border: 'border-red-500/30',
                bg: 'bg-red-500/5',
                button: 'from-red-600 to-red-800'
            };
            case 'success': return {
                border: 'border-emerald-500/30',
                bg: 'bg-emerald-500/5',
                button: 'from-emerald-500 to-emerald-700'
            };
            case 'warning': return {
                border: 'border-amber-500/30',
                bg: 'bg-amber-500/5',
                button: 'from-amber-500 to-amber-700'
            };
            default: return {
                border: 'border-[#D4AF37]/30',
                bg: 'bg-[#D4AF37]/5',
                button: 'from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13]'
            };
        }
    };

    const colors = getColors();

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`relative w-full max-w-sm glass-card rounded-[2.5rem] border ${colors.border} overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] p-8 flex flex-col items-center text-center`}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                        {/* Top Decoration */}
                        <div className={`w-20 h-20 rounded-[2rem] ${colors.bg} border ${colors.border} flex items-center justify-center mb-6 shadow-inner`}>
                            {getIcon()}
                        </div>

                        <h3 className="text-xl font-black text-white font-heading uppercase tracking-widest mb-3 leading-tight">
                            {title}
                        </h3>

                        <p className="text-sm font-bold text-zinc-400 leading-relaxed mb-8 px-2">
                            {message}
                        </p>

                        <div className="flex flex-col gap-3 w-full">
                            {onConfirm && (
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`w-full py-4.5 rounded-[1.5rem] bg-gradient-to-br ${colors.button} text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all border border-white/20 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center`}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        confirmText
                                    )}
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full py-4 rounded-[1.5rem] bg-white/5 text-zinc-300 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                            >
                                {cancelText}
                            </button>
                        </div>

                        {/* Close button icon for accessibility */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
