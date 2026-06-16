/**
 * Toast.jsx — Animated inline feedback banner.
 *
 * Shows success/warning/error messages that auto-dismiss after 3 seconds.
 * Gives the receptionist immediate visual confirmation that their action registered.
 */

import { useEffect, useState } from 'react';

const TOAST_DURATION = 3000;

export default function Toast({ action, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!action) return;
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 250); // wait for fade-out animation
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [action, onDismiss]);

  if (!action) return null;

  const iconMap = {
    success: '✓',
    warning: '⚠',
    error: '✕',
  };

  return (
    <div
      className={`toast toast--${action.type} ${isVisible ? 'toast--visible' : 'toast--hidden'}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__icon">{iconMap[action.type] || '•'}</span>
      <span className="toast__message">{action.message}</span>
    </div>
  );
}
