import type { Variants } from 'framer-motion';

export const sosPulse: Variants = {
    animate: {
        scale: [1, 1.08, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
        }
    }
};

export const sosRipple: Variants = {
    initial: { scale: 1, opacity: 0 },
    animate: {
        scale: [1, 1.4, 1.8],
        opacity: [0.4, 0.2, 0],
        transition: { duration: 1, repeat: Infinity }
    }
};

export const cardVariant: Variants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
        y: 0, opacity: 1,
        transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1] // Custom quintic ease-out
        }
    }
};

export const containerStagger: Variants = {
    visible: {
        transition: { staggerChildren: 0.1 }
    }
};

export const navIconVariant: Variants = {
    active: { scale: 1.2, color: "#C084FC" },
    inactive: { scale: 1, color: "#A1A1AA" },
    tap: { scale: 0.85 }
};

export const pageTransition: Variants = {
    initial: { x: 15, opacity: 0, filter: "blur(4px)" },
    animate: {
        x: 0,
        opacity: 1,
        filter: "blur(0px)",
        transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: {
        x: -15,
        opacity: 0,
        filter: "blur(4px)",
        transition: { duration: 0.3 }
    },
};

export const modalPop: Variants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
        scale: 1, opacity: 1,
        transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.15 } }
};

export const floatingIcon: Variants = {
    animate: {
        y: [0, -5, 0],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    }
};

export const softGlow: Variants = {
    animate: {
        boxShadow: [
            "0px 0px 0px rgba(192,132,252,0.2)",
            "0px 0px 16px rgba(192,132,252,0.5)",
            "0px 0px 0px rgba(192,132,252,0.2)"
        ],
        transition: { duration: 2, repeat: Infinity }
    }
};

// Toast/Notification animations
export const toastSlide: Variants = {
    hidden: { y: -30, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: { y: -30, opacity: 0, transition: { duration: 0.2 } }
};

// Timeline entry animation
export const timelineEntry: Variants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.25, ease: "easeOut" }
    }
};

// Map marker pulse (for SOS markers)
export const mapMarkerPulse: Variants = {
    animate: {
        boxShadow: [
            "0 0 0px rgba(255,79,90,0.3)",
            "0 0 15px rgba(255,79,90,0.5)",
            "0 0 0px rgba(255,79,90,0.3)"
        ],
        transition: { duration: 1.5, repeat: Infinity }
    }
};

// Map marker smooth movement
export const mapMarkerMove = {
    type: "spring" as const,
    stiffness: 100,
    damping: 20
};

// Button glow animation (soft violet)
export const buttonGlow: Variants = {
    animate: {
        boxShadow: [
            "0px 0px 0px rgba(192,132,252,0.2)",
            "0px 0px 16px rgba(192,132,252,0.5)",
            "0px 0px 0px rgba(192,132,252,0.2)"
        ],
        transition: { duration: 2, repeat: Infinity }
    }
};

// Alert card animation
export const alertCard: Variants = {
    initial: { scale: 0.95, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { scale: 0.95, opacity: 0 }
};

// Background overlay fade
export const overlayFade: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 0.5 },
    exit: { opacity: 0 }
};
