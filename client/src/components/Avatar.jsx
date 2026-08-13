/**
 * src/components/Avatar.jsx — Initials Avatar with a Consistent Color
 *
 * WHY hash the name into a color instead of picking randomly?
 * A random color would change every time the component re-renders.
 * Hashing the name means the SAME person always gets the SAME color,
 * everywhere they appear in the app (navbar, family cards, etc.),
 * without us having to store a "color" field anywhere.
 */

const COLORS = [
  'bg-primary-500', 'bg-gold-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-pink-500', 'bg-emerald-500',
];

const colorForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const initialsForName = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const Avatar = ({ name, size = 'md' }) => (
  <div
    className={`${SIZES[size]} ${colorForName(name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
    title={name}
  >
    {initialsForName(name) || '?'}
  </div>
);

export default Avatar;
