/**
 * moduleManager.js
 * The core of "modular, schedulable, rotate without touching core
 * code": this file knows nothing about Draft Board, BrewOps, etc.
 * It only knows how to load whatever CONFIG.MODULE_REGISTRY points
 * it to, ask /api/schedule which of those are enabled right now,
 * and crossfade between them in sortOrder.
 */
import { CONFIG } from './config.js';
import { poll } from './api.js';

export class ModuleManager {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.stageA first crossfade layer
   * @param {HTMLElement} opts.stageB second crossfade layer
   * @param {import('./api.js').ApiClient} opts.apiClient
   * @param {Object} opts.settings
   */
  constructor({ stageA, stageB, apiClient, settings }) {
    this.stages = [stageA, stageB];
    this.activeStageIndex = 0;
    this.api = apiClient;
    this.settings = settings;

    this.instances = new Map(); // moduleId -> SignageModule instance
    this.scheduleModules = [];  // raw rows from /api/schedule
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

  async _getOrCreateInstance(moduleId, container) {
    if (this.instances.has(moduleId)) return this.instances.get(moduleId);

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
    const incomingStage = this.stages[1 - this.activeStageIndex];
    const outgoingStage = this.stages[this.activeStageIndex];
    const outgoingModuleId = outgoingStage.dataset.moduleId;

    incomingStage.innerHTML = '';
    const instance = await this._getOrCreateInstance(moduleId, incomingStage);
    incomingStage.dataset.moduleId = moduleId;

    instance.start();

    incomingStage.classList.add('stage--visible');
    outgoingStage.classList.remove('stage--visible');

    // Stop the outgoing module's polling once the crossfade
    // finishes so hidden modules don't burn network/CPU.
    const TRANSITION_MS = 600;
    setTimeout(() => {
      if (outgoingModuleId && this.instances.has(outgoingModuleId) && outgoingModuleId !== moduleId) {
        this.instances.get(outgoingModuleId).stop();
      }
    }, TRANSITION_MS);

    this.activeStageIndex = 1 - this.activeStageIndex;
  }

  updateSettings(settings) {
    this.settings = settings;
    this.instances.forEach((instance) => {
      instance.settings = settings;
    });
  }
}
