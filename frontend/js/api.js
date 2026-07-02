/**
 * api.js
 * Thin fetch wrapper around the Apps Script backend. Every module
 * calls only the endpoint(s) it needs, on its own interval -- the
 * ApiClient itself has no polling logic, it's a stateless client.
 */
export class ApiClient {
  /**
   * @param {string} baseUrl Apps Script /exec URL
   * @param {number} timeoutMs per-request timeout
   */
  constructor(baseUrl, timeoutMs = 10000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * @param {string} path e.g. "api/draft"
   * @param {Object} [params] extra query params
   * @returns {Promise<any>} the `data` field of a successful response
   */
  async get(path, params = {}) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('path', path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${path}`);
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || `API error for ${path}`);
      }
      return json.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Wraps a polling loop around ApiClient#get. Calls `onData` with
 * fresh data on success and keeps the last-known-good data on
 * failure (logs to console rather than blanking the display --
 * a kiosk should never show an error screen over a network blip).
 *
 * @returns {Function} stop() to cancel the polling loop
 */
export function poll(apiClient, path, intervalMs, onData, onError = console.warn) {
  let stopped = false;
  let timer = null;

  async function tick() {
    if (stopped) return;
    try {
      const data = await apiClient.get(path);
      if (!stopped) onData(data);
    } catch (err) {
      onError(`[poll:${path}]`, err);
    } finally {
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  }

  tick();
  return function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
