/**
 * src/context/ConfirmDialogContext.jsx — A Shared "Are You Sure?" Popup
 *
 * WHY useContext instead of Redux for this one thing?
 * Redux is for DATA (who's logged in, what theme is active). This isn't
 * data — it's a little bit of UI behavior ("show a confirm popup, and
 * run this callback if the user clicks Yes") that many unrelated pages
 * need (deleting an investment, removing a family member, etc). Without
 * context, every page that needs a confirm dialog would have to render
 * its own <ConfirmDialog> and manage its own open/close state. With
 * context, we render ONE dialog at the top of the app (see main.jsx),
 * and any component anywhere can call `confirm()` from this hook to
 * pop it open — that's the textbook use case for React Context.
 *
 * Usage in any component:
 *   const confirm = useConfirm();
 *   const handleDelete = async () => {
 *     const ok = await confirm('Delete this investment?');
 *     if (ok) { ...actually delete... }
 *   };
 */

import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmDialogContext = createContext(null);

export const ConfirmDialogProvider = ({ children }) => {
  // dialog holds { message, resolve } while open, or null while closed.
  // "resolve" is the Promise resolver we call when the user picks Yes/No.
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setDialog({ message, resolve });
    });
  }, []);

  const handleChoice = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card max-w-sm w-full animate-slide-up">
            <p className="text-gray-800 dark:text-gray-100 mb-6">{dialog.message}</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => handleChoice(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => handleChoice(true)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmDialogContext);
