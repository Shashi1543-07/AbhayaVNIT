/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PRIMARY COLORS - Feminine & Vibrant
        primary: {
          DEFAULT: '#C084FC', // Violet - main brand color
          blush: '#FFB7C5',   // Blush Pink
          purple: '#C7A8F7',  // Pastel Purple
          lavender: '#E5D9FA', // Lavender Mist
          peach: '#FFD6A5',   // Peach Soft
          light: '#E5D9FA',
          dark: '#9333EA',
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
        },
        secondary: {
          DEFAULT: '#FFB7C5', // Blush Pink as secondary
          light: '#FFD6A5',   // Peach
          dark: '#FF8FA3',
          50: '#FFF1F2',
          100: '#FFE4E6',
        },
        accent: {
          DEFAULT: '#C7A8F7', // Pastel Purple
          light: '#E5D9FA',   // Lavender Mist
          dark: '#A78BFA',
        },
        // EMERGENCY COLORS
        emergency: {
          DEFAULT: '#FF4F5A', // SOS Red
          pulse: '#FFE5E7',   // Light pink for pulse
          dark: '#DC2626',
        },
        success: '#4CAF50',   // Safe Green
        warning: '#FFC947',   // Warning Amber

        // SURFACE/BACKGROUND COLORS
        background: '#FFFFFF',
        surface: {
          DEFAULT: '#F6F7F9',  // Soft Gray 1
          card: '#FFFFFF',
          gray: '#E3E6EB',     // Soft Gray 2
        },

        // TEXT COLORS
        text: {
          primary: '#1F2937',   // Primary text
          secondary: '#6B7280', // Secondary text
          muted: '#9CA3AF',     // Muted text
        },

        // NAV BAR COLORS
        nav: {
          bg: '#FFFFFF',
          active: '#C084FC',    // Violet glow
          inactive: '#A1A1AA',
          indicator: '#FF4F5A',
        },

        // CARD SPECIFIC COLORS
        card: {
          safewalk: '#E5D9FA',  // Lavender
          sos: '#FFE5E7',       // Light pink
          escort: '#FFEAD1',    // Light peach
          reports: '#C7A8F7',   // Pastel purple
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(229, 57, 53, 0.5)',
      },
    },
    animation: {
      blob: "blob 7s infinite",
    },
    keyframes: {
      blob: {
        "0%": {
          transform: "translate(0px, 0px) scale(1)",
        },
        "33%": {
          transform: "translate(30px, -50px) scale(1.1)",
        },
        "66%": {
          transform: "translate(-20px, 20px) scale(0.9)",
        },
        "100%": {
          transform: "translate(0px, 0px) scale(1)",
        },
      },
    },
  },
  plugins: [],
}
