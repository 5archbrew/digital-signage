/**
 * moduleBase.js
 * Every signage module extends this and implements onStart/onStop.
 * The ModuleManager only ever calls the five lifecycle methods
 * below, so a module can be swapped out or added without the
 * manager knowing anything about its internals.
 */
export class SignageModule {
  /**
   * @param {HTMLElement} container element this module renders into
   * @param {import('../api.js').ApiClient} apiClient
   * @param {Object} settings global settings object (theme, poll intervals, etc.)
   */
  constructor(container, apiClient, settings) {
    this.container = container;
    this.api = apiClient;
    this.settings = settings;
  }

  /** One-time setup: build static DOM structure. Called once, before the first start(). */
  async init() {}

  /** Called every time this module becomes the visible/active one. Start polling here. */
  start() {}

  /** Called when another module takes over. Stop polling here; keep DOM intact for a fast re-show. */
  stop() {}

  /** Called when the module is being torn down entirely (rare -- e.g. schedule removed it). */
  destroy() {
    this.container.innerHTML = '';
  }
}
