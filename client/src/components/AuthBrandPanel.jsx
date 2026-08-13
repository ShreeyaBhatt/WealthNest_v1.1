/**
 * src/components/AuthBrandPanel.jsx — Left-side brand panel for Login/Register
 *
 * Both auth pages need the identical navy hero panel, so it's factored
 * out here instead of duplicated (same reasoning as Avatar/Drawer being
 * shared components). `hidden lg:flex` — this panel only shows on wider
 * screens; below `lg` both pages fall back to today's single centered
 * form, so nothing regresses on mobile.
 */

import { FiShield, FiTrendingUp, FiUsers } from 'react-icons/fi';

const TRUST_POINTS = [
  { icon: FiShield, text: 'Your data stays private to your family' },
  { icon: FiTrendingUp, text: 'AI-driven risk & growth predictions' },
  { icon: FiUsers, text: 'Track investments together, one login' },
];

const AuthBrandPanel = () => (
  <div className="hidden lg:flex flex-col justify-center px-14 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900">
    <div className="text-6xl mb-4">💰</div>
    <h1 className="text-4xl font-bold gradient-text mb-3">WealthNest</h1>
    <p className="text-gray-300 mb-10 max-w-sm">
      The family investment portfolio tracker built for households who manage their money together.
    </p>
    <ul className="space-y-4">
      {TRUST_POINTS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3 text-sm text-gray-300">
          <span className="w-8 h-8 rounded-lg bg-gold-400/10 text-gold-400 flex items-center justify-center shrink-0">
            <Icon size={16} />
          </span>
          {text}
        </li>
      ))}
    </ul>
  </div>
);

export default AuthBrandPanel;
