import { SignageModule } from './moduleBase.js';
import { poll } from '../api.js';
import { CONFIG } from '../config.js';

/**
 * Reads now_playing_* keys from /api/settings. This keeps the
 * backend generic: whether those keys are updated by hand, by a
 * Zapier/Make automation, or by a separate Apps Script trigger
 * that polls Spotify, the Music module doesn't need to change.
 */
export default class MusicModule extends SignageModule {
  async init() {
    this.container.classList.add('music-module');
    this.container.innerHTML = `
      <div class="music-module__card">
        <div class="music-module__art-wrap">
          <img class="music-module__art" id="music-art" alt="" />
        </div>
        <div class="music-module__info">
          <p class="music-module__eyebrow">Now Playing</p>
          <h1 class="music-module__title" id="music-title">&mdash;</h1>
          <h2 class="music-module__artist" id="music-artist"></h2>
        </div>
      </div>
    `;
    this.art = this.container.querySelector('#music-art');
    this.title = this.container.querySelector('#music-title');
    this.artist = this.container.querySelector('#music-artist');
    this.stopPoll = null;
  }

  start() {
    const interval = this.settings.music_poll_interval || CONFIG.DEFAULTS.music_poll_interval;
    this.stopPoll = poll(this.api, 'api/settings', interval, (data) => this._render(data));
  }

  stop() {
    if (this.stopPoll) this.stopPoll();
    this.stopPoll = null;
  }

  _render(settings) {
    const title = settings.now_playing_title || 'Nothing playing right now';
    const artist = settings.now_playing_artist || '';
    const art = settings.now_playing_art_url || '';

    this.title.textContent = title;
    this.artist.textContent = artist;
    this.art.style.display = art ? '' : 'none';
    if (art) this.art.src = art;
    this.container.classList.toggle('music-module--playing', !!settings.now_playing_title);
  }
}
