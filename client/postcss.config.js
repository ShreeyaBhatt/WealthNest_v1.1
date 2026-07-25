/**
 * postcss.config.js — PostCSS Configuration
 *
 * WHY PostCSS?
 * Tailwind CSS is technically a PostCSS plugin.
 * PostCSS processes your CSS and Tailwind transforms utility classes
 * into actual CSS. Autoprefixer adds vendor prefixes automatically
 * (e.g., -webkit-, -moz-) for browser compatibility.
 *
 * You don't need to modify this file.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
