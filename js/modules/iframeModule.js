import { SignageModule } from './moduleBase.js';

/**
 * IframeModule
 * For modules that are really just "show this external page" --
 * SoundTrack Your Brand's now-playing view, a BrewBlocks
 * dashboard, etc. These pages update themselves; we don't poll
 * any API for them, we just point an <iframe> at a URL pulled
 * from Settings and leave it alone.
 *
 * Deliberately does NOT reload the iframe on every start(): once
 * loaded, it keeps running in the background while other modules
 * are on-screen (moduleManager keeps its container mounted rather
 * than destroying it), so a rotation back to this module is
 * instant instead of re-loading/re-authenticating a third-party
 * dashboard every cycle.
 *
 * Subclass and set static settingsKey / label, e.g.:
 *
 *   export default class MusicModule extends IframeModule {
 *     static settingsKey = 'soundtrack_now_playing_url';
 *     static label = 'Now Playing';
 *   }
 */
export class IframeModule extends SignageModule {
  static settingsKey = 'iframe_url';
  static label = 'External Display';
  // If the iframe's `load` event hasn't fired within this long,
  // assume the page failed or refused to embed and show a hint
  // instead of a silent blank screen. Cross-origin `load` firing
  // behavior on a blocked frame is inconsistent across browsers,
  // so this is a heuristic, not a guarantee.
  static loadTimeoutMs = 10000;

  async init() {
    this.container.classList.add('iframe-module');
    this.container.innerHTML = `
      <iframe class="iframe-module__frame" title="${this.constructor.label}"
        referrerpolicy="no-referrer-when-downgrade"></iframe>
      <div class="iframe-module__placeholder">
        <p class="iframe-module__placeholder-title">${this.constructor.label}</p>
        <p class="iframe-module__placeholder-body">Not configured yet.</p>
      </div>
      <div class="iframe-module__warning">
        <p>${this.constructor.label} isn't loading.</p>
        <p class="iframe-module__warning-detail">
          Check the URL in Settings, that the display has network/VPN access to it,
          and that the source allows being embedded in an iframe.
        </p>
      </div>
    `;
    this.frame = this.container.querySelector('.iframe-module__frame');
    this.placeholder = this.container.querySelector('.iframe-module__placeholder');
    this.warning = this.container.querySelector('.iframe-module__warning');
    this.loadedUrl = null;
    this.loadTimer = null;

    this.frame.addEventListener('load', () => {
      clearTimeout(this.loadTimer);
      this.warning.classList.remove('iframe-module__warning--visible');
    });
  }

  start() {
    const url = this.settings[this.constructor.settingsKey];
    if (!url) {
      this.placeholder.classList.add('iframe-module__placeholder--visible');
      return;
    }
    this.placeholder.classList.remove('iframe-module__placeholder--visible');

    // Only (re)load if the configured URL actually changed --
    // this is what keeps the embedded dashboard alive across
    // rotations instead of reloading it every time it's shown.
    if (url !== this.loadedUrl) {
      this.loadedUrl = url;
      this.warning.classList.remove('iframe-module__warning--visible');
      clearTimeout(this.loadTimer);
      this.loadTimer = setTimeout(() => {
        this.warning.classList.add('iframe-module__warning--visible');
      }, this.constructor.loadTimeoutMs);
      this.frame.src = url;
    }
  }

  stop() {
    // Intentionally does nothing -- the whole point is that this
    // keeps running off-screen. If a given deployment would rather
    // free resources while hidden, override stop() in the subclass
    // to clear this.frame.src, at the cost of a reload flash and
    // possibly losing the source's own session state on return.
  }
}
