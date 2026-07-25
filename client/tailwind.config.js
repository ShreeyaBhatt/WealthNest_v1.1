/**
 * tailwind.config.js — Tailwind CSS Configuration
 *
 * WHY Tailwind CSS?
 * Tailwind is a "utility-first" CSS framework. Instead of writing custom CSS,
 * you apply small, single-purpose classes directly in your HTML/JSX.
 *
 * Example:
 *   Traditional CSS:  .card { background: white; border-radius: 8px; padding: 16px; }
 *   Tailwind:         <div className="bg-white rounded-lg p-4">
 *
 * Benefits:
 * - No switching between HTML and CSS files
 * - Consistent spacing/color scale
 * - Easy dark mode with 'dark:' prefix
 * - Tiny production bundle (purges unused classes)
 */

/** @type {import('tailwindcss').Config} */
export default {
  // ─── Content Purging ───────────────────────────────────────
  // Tailwind scans these files and removes unused CSS classes
  // This keeps the final CSS bundle very small
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  // ─── Dark Mode ─────────────────────────────────────────────
  // 'class' mode: add/remove 'dark' class on <html> to toggle dark mode
  // This gives us programmatic control (vs 'media' which follows OS setting)
  darkMode: 'class',

  theme: {
    extend: {
      // ─── Custom Color Palette ─────────────────────────────
      // Our WealthNest brand colors — finance-inspired blues and greens
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // Main primary color
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',  // Main accent color (green for profit)
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',  // Red for losses
          600: '#dc2626',
        },
        // Dark mode background colors
        dark: {
          50:  '#f8fafc',
          600: '#475569',  // lighter hover surfaces
          700: '#334155',  // borders / hover surfaces — a bit lighter than the 800 card background
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#080e1a',
        },
      },

      // ─── Custom Fonts ──────────────────────────────────────
      fontFamily: {
        // 'Inter' is a clean, modern font used by many fintech apps
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      // ─── Custom Animations ─────────────────────────────────
      animation: {
        'fade-in':     'fadeIn 0.3s ease-in-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-in':    'slideIn 0.3s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':     'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ─── Custom Box Shadows ───────────────────────────────
      boxShadow: {
        'card':      '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-dark': '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
        'glow':      '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-green':'0 0 20px rgba(34, 197, 94, 0.3)',
      },

      // ─── Custom Border Radius ─────────────────────────────
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },

  plugins: [],
};
