/**
 * moduleManager.js
 * The core of "modular, schedulable, rotate without touching core
 * code": this file knows nothing about Draft Board, BrewOps, etc.
 * It only knows how to load whatever CONFIG.MODULE_REGISTRY points
 * it to, ask /api/schedule which of those are enabled right now,
 * and crossfade between them in sortOrder.
 *
 * Each module gets exactly one persistent container, created once
 * and reused for the lifetime of the app -- it is only ever shown
 * or hidden, never destroyed and rebuilt. That matters a lot for
 * IframeModule-based modules (music, brewops): an embedded
 * third-party dashboard should load once and keep running quietly
 * off-screen, not reload every time its slot comes back around.
 */
import { CONFIG } from './config.js';
import { poll } from './api.js';

export class ModuleManager {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.stageRoot element the module containers are mounted into
   * @param {import('./api.js').ApiClient} opts.apiClient
   * @param {Object} opts.settings
   */
  constructor({ stageRoot, apiClient, settings }) {
    this.stageRoot = stageRoot;
    this.api = apiClient;
    this.settings = settings;

    this.containers = new Map(); // moduleId -> persistent container element
    this.instances = new Map();  // moduleId -> SignageModule instance
    this.activeModuleId = null;

    this.scheduleModules = []; // raw rows from /api/schedule
    this.rotationIndex = 0;
    this.rotationTimer = null;
    this.stopSchedulePoll = null;
  }

  async start() {
    this.stopSchedulePoll = poll(
      this.api,
      'api/schedule',
      this.settings.schedule_poll_interval || CONFIG.DEFAULTS.schedule_poll_interval,
      (data) => {
        this.scheduleModules = data.modules || [];
        // If nothing is currently rotating, kick things off as
        // soon as the first schedule response arrives.
        if (!this.rotationTimer) this._advance();
      }
    );
  }

  /** Modules eligible right now: enabled AND inside their day/time window. */
  _eligibleModules() {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const dow = now.toLocaleDateString('en-US', { weekday: 'short' });

    return this.scheduleModules.filter((m) => {
      if (!m.enabled) return false;
      if (!CONFIG.MODULE_REGISTRY[m.moduleId]) return false;
      if (m.daysOfWeek && !m.daysOfWeek.some((d) => d.toLowerCase().startsWith(dow.toLowerCase().slice(0, 3)))) {
        return false;
      }
      if (m.startTime && m.endTime) {
        if (m.startTime <= m.endTime) {
          if (hhmm < m.startTime || hhmm > m.endTime) return false;
        } else {
          // window crosses midnight, e.g. 20:00-02:00
          if (hhmm < m.startTime && hhmm > m.endTime) return false;
        }
      }
      return true;
    });
  }

  _getOrCreateContainer(moduleId) {
    let container = this.containers.get(moduleId);
    if (container) return container;

    container = document.createElement('section');
    container.className = 'stage__layer';
    container.dataset.moduleId = moduleId;
    this.stageRoot.appendChild(container);
    this.containers.set(moduleId, container);
    return container;
  }

  async _getOrCreateInstance(moduleId) {
    const existing = this.instances.get(moduleId);
    if (existing) return existing;

    const container = this._getOrCreateContainer(moduleId);
    const loader = CONFIG.MODULE_REGISTRY[moduleId];
    const mod = await loader();
    const ModuleClass = mod.default;
    const instance = new ModuleClass(container, this.api, this.settings);
    await instance.init();
    this.instances.set(moduleId, instance);
    return instance;
  }

  async _advance() {
    clearTimeout(this.rotationTimer);
    const eligible = this._eligibleModules();

    if (eligible.length === 0) {
      // Nothing scheduled right now; recheck soon rather than
      // leaving the last frame frozen indefinitely.
      this.rotationTimer = setTimeout(() => this._advance(), 15000);
      return;
    }

    if (this.rotationIndex >= eligible.length) this.rotationIndex = 0;
    const next = eligible[this.rotationIndex];
    this.rotationIndex = (this.rotationIndex + 1) % eligible.length;

    await this._showModule(next.moduleId);

    const durationMs = (next.durationSeconds || CONFIG.DEFAULTS.rotation_default_duration) * 1000;
    this.rotationTimer = setTimeout(() => this._advance(), durationMs);
  }

  async _showModule(moduleId) {
    const previousModuleId = this.activeModuleId;
    if (previousModuleId === moduleId) {
      // Only one eligible module right now -- keep it visible and
      // just make sure it's still "started" (cheap/idempotent for
      // every module type).
      this.instances.get(moduleId).start();
      return;
    }

    const instance = await this._getOrCreateInstance(moduleId);
    const container = this.containers.get(moduleId);

    instance.start();
    container.classList.add('stage--visible');

    if (previousModuleId) {
      const previousContainer = this.containers.get(previousModuleId);
      previousContainer.classList.remove('stage--visible');

      // Stop the outgoing module's polling once the crossfade
      // finishes so hidden JSON-polling modules don't burn
      // network/CPU. IframeModule's stop() is a deliberate no-op,
      // so this doesn't tear down embedded dashboards.
      const TRANSITION_MS = 600;
      setTimeout(() => {
        const previousInstance = this.instances.get(previousModuleId);
        if (previousInstance) previousInstance.stop();
      }, TRANSITION_MS);
    }

    this.activeModuleId = moduleId;
  }

  updateSettings(settings) {
    this.settings = settings;
    this.instances.forEach((instance) => {
      instance.settings = settings;
    });
  }
}
