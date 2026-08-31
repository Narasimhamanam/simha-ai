/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['Roboto Mono', 'JetBrains Mono', 'monospace'],
        divine: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        void: { DEFAULT: '#151c24', surface: '#1a232c', elevated: '#202b37' },
        mane: { DEFAULT: '#20B2AA', bright: '#2DD4BF', dim: '#0D9488' },
        teal: { DEFAULT: '#20B2AA', bright: '#2DD4BF', dim: '#0D9488' },
        violet: { DEFAULT: '#818CF8', bright: '#A5B4FC' },
        cyan: { DEFAULT: '#38BDF8', bright: '#7DD3FC' },
        ink: { 1: '#F1F5F9', 2: '#CBD5E1', 3: '#64748B' },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drift': 'drift 8s infinite ease-in-out',
        'pulse-gold': 'pulseGold 3s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        drift: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}