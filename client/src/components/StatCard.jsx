/**
 * src/components/StatCard.jsx — Icon + Label + Value tile
 *
 * Originally defined inline inside DashboardPage.jsx; pulled out here
 * so AdminPage can reuse the exact same visual language for its own
 * summary strip instead of inventing a second stat-tile style.
 *
 * borderColor gives each card the same "colour accent" left border the
 * SRS mockups use, so a row of these reads as a set at a glance.
 */

const StatCard = ({ icon: Icon, label, value, subLabel, accent, borderColor }) => (
  <div className={`stat-card border-l-4 ${borderColor}`}>
    <div className={`p-3 rounded-xl ${accent}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subLabel}</p>}
    </div>
  </div>
);

export default StatCard;
