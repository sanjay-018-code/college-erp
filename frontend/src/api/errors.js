/**
 * Turns an axios error (typically from a DRF backend) into a short,
 * human-readable message, and optionally a field->message map for forms.
 */
export function parseApiError(err) {
  if (!err) return "Something went wrong.";

  if (err.code === "ERR_NETWORK" || !err.response) {
    return "Can't reach the server. Check your connection and try again.";
  }

  const { status, data } = err.response;

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "That item couldn't be found — it may have been deleted.";
  if (status === 429) return "Too many requests. Please slow down and try again shortly.";
  if (status >= 500) return "Server error. Please try again in a moment.";

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    // DRF non-field errors
    if (data.detail) return String(data.detail);
    if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(" ");

    // DRF per-field validation errors -> flatten into one readable line
    const parts = [];
    for (const [field, messages] of Object.entries(data)) {
      const msg = Array.isArray(messages) ? messages.join(" ") : String(messages);
      parts.push(field === "non_field_errors" ? msg : `${humanizeField(field)}: ${msg}`);
    }
    if (parts.length) return parts.join(" · ");
  }

  return "Something went wrong. Please try again.";
}

/** Returns a { field: message } map for inline form-field errors, if the response has one. */
export function parseFieldErrors(err) {
  const data = err?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const out = {};
  for (const [field, messages] of Object.entries(data)) {
    if (field === "non_field_errors" || field === "detail") continue;
    out[field] = Array.isArray(messages) ? messages.join(" ") : String(messages);
  }
  return out;
}

function humanizeField(field) {
  return field.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
