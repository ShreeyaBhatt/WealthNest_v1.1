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
      // "Premium wealth management" identity — a restrained navy-indigo
      // for everyday UI (buttons/links/focus rings/active states) plus a
      // gold/bronze accent used SPARINGLY for the premium brand moments
      // (wordmark, one hero CTA per page, icons/borders) — never as a
      // wholesale button-fill, or dense pages (Investments/Admin/Family)
      // would turn gaudy instead of "private bank."
      colors: {
        primary: {
          50:  '#eef3f8',
          100: '#dce7f1',
          200: '#b3cbe1',
          300: '#82a8ca',
          400: '#5483ac',
          500: '#3a6690',
          600: '#2c4d70',  // Main primary color — navy-indigo, not consumer blue
          700: '#213a56',
          800: '#182a3f',
          900: '#101d2c',
          950: '#09121b',
        },
        // Premium brand accent — gold/bronze. Text needs 600/700 for
        // contrast on light backgrounds; 400/500 are for fills, icons,
        // borders, and glows only (raw gold fails as light-mode body text).
        gold: {
          50:  '#fbf7ec',
          100: '#f6ecd0',
          200: '#ecd79f',
          300: '#dfbd68',
          400: '#d4af37',
          500: '#c2960e',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Was `accent` — renamed because its only job is signalling
        // profit/positive-return, never brand decoration (that's `gold`
        // now). Values are unchanged, just the name is clearer.
        gain: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',  // Main gain color (green for profit)
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Red for losses
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
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
        'glow':      '0 0 20px rgba(44, 77, 112, 0.35)',   // navy glow — matches new primary
        'glow-gain': '0 0 20px rgba(34, 197, 94, 0.3)',    // was 'glow-green'
        'glow-gold': '0 0 20px rgba(212, 175, 55, 0.35)',  // premium accent glow — hero CTAs
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
