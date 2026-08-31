import { createContext, useCallback, useContext, useRef, useState } from "react";
import { registerGlobalErrorHandler } from "../api/axios";
import { parseApiError } from "../api/errors";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback((message, type = "info", duration = 6000) => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, message, type }]);
    if (duration) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const showError = useCallback((err, fallback) => {
    const message = typeof err === "string" ? err : parseApiError(err) || fallback;
    return push(message, "error", 8000);
  }, [push]);

  const showSuccess = useCallback((message) => push(message, "success", 4000), [push]);

  // Wire the axios interceptor to route unhandled API errors here too,
  // so nothing fails silently even if a page forgets to catch it.
  useState(() => {
    registerGlobalErrorHandler((err) => {
      // Don't double-toast 401s — the axios layer already redirects to /login.
      if (err?.response?.status === 401) return;
      showError(err);
    });
  });

  return (
    <ToastContext.Provider value={{ showError, showSuccess, push }}>
      {children}
      <div className="toast-stack" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            <span>{t.message}</span>
            <button className="toast-close" aria-label="Dismiss" onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
