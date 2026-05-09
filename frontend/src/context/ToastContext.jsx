import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import Toast from "../components/Toast";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, options = {}) => {
      const id = ++idRef.current;
      const toast = {
        id,
        message,
        type: options.type || "info",
        timeout: options.timeout ?? 3500,
      };
      setToasts((prev) => [...prev, toast]);
      if (toast.timeout > 0) {
        setTimeout(() => remove(id), toast.timeout);
      }
      return id;
    },
    [remove]
  );

  const value = useMemo(
    () => ({
      success: (msg, opts) => push(msg, { ...opts, type: "success" }),
      error: (msg, opts) => push(msg, { ...opts, type: "error" }),
      info: (msg, opts) => push(msg, { ...opts, type: "info" }),
      remove,
    }),
    [push, remove]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-2 p-4">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
