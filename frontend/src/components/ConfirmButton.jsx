import { useState } from "react";

/**
 * A delete/destructive action button that requires a second click to confirm,
 * instead of a browser confirm() popup. Reverts to the normal state after a
 * few seconds if the person doesn't confirm.
 */
export default function ConfirmButton({ onConfirm, label = "Delete", confirmLabel = "Confirm?", className = "btn btn-sm btn-danger", disabled }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="row-actions">
        <button
          type="button"
          className={className}
          disabled={disabled}
          onClick={async () => { setConfirming(false); await onConfirm(); }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={() => setConfirming(true)}>
      {label}
    </button>
  );
}
