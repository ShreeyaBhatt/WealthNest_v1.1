/**
 * src/components/Drawer.jsx — Slide-Over Panel from the Right
 *
 * WHY a drawer instead of a centered modal for forms like "Add
 * Transaction"? A drawer keeps whatever page you were looking at
 * (e.g. the investment's existing transaction history) visible in the
 * background, so you don't lose context while filling out the form —
 * a centered modal would cover it completely.
 */

const Drawer = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop — click to close */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md h-full bg-white dark:bg-dark-850 shadow-xl overflow-y-auto animate-slide-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-dark-700">
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">{title}</h2>
          <button
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
