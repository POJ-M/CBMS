/**
 * errorUtils.js
 *
 * parseApiError(err) → human-readable string
 *
 * Interprets:
 *   - Network offline / no response
 *   - Request timeout
 *   - HTTP status codes: 400, 401, 403, 404, 409, 422, 429, 500, 502, 503
 *   - Backend validation errors (array of {msg} or {message})
 *   - Backend custom message strings
 *
 * Usage:
 *   import { parseApiError } from '../utils/errorUtils';
 *   ...
 *   catch (err) { toast.error(parseApiError(err)); }
 */

export function parseApiError(err) {
  // ── 1. No response at all (network down, server unreachable, CORS) ──────────
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Request timed out. The server is taking too long — please try again.';
    }
    if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
      return 'Network error — check your internet connection and try again.';
    }
    return `Could not reach the server. (${err.message || 'No response'})`;
  }

  const status  = err.response.status;
  const data    = err.response.data;

  // ── 2. Backend sent a clear message string ────────────────────────────────
  if (data?.message && typeof data.message === 'string') {
    // Some common backend messages get friendlier wording
    const m = data.message;

    if (m.toLowerCase().includes('duplicate') || m.toLowerCase().includes('already exists'))
      return 'This record already exists. Please check for duplicates.';

    if (m.toLowerCase().includes('invalid token') || m.toLowerCase().includes('jwt'))
      return 'Your session has expired. Please log in again.';

    return m; // trust the backend message otherwise
  }

  // ── 3. Validation error array (express-validator style) ──────────────────
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map(e => e.msg || e.message || String(e)).join(' · ');
  }

  // ── 4. Status-code fallbacks ─────────────────────────────────────────────
  switch (status) {
    case 400: return 'Invalid request — please check your inputs and try again.';
    case 401: return 'You are not logged in. Please log in to continue.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested record was not found.';
    case 409: return 'A conflict occurred — this record may already exist.';
    case 413: return 'The uploaded file is too large.';
    case 422: return 'Some fields are invalid — please review your inputs.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 500: return 'Server error — something went wrong on our end. Please try again shortly.';
    case 502:
    case 503: return 'The server is temporarily unavailable. Please try again in a moment.';
    default:  return `Unexpected error (${status}). Please try again.`;
  }
}

/**
 * toastApiError(err, toastFn)
 * Convenience wrapper: calls toast.error with a parsed message.
 *
 * Usage:
 *   import { toastApiError } from '../utils/errorUtils';
 *   catch (err) { toastApiError(err, toast.error); }
 */
export function toastApiError(err, toastErrorFn) {
  toastErrorFn(parseApiError(err));
}