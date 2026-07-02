import { SignageModule } from './moduleBase.js';
import { poll } from '../api.js';
import { CONFIG } from '../config.js';

export default class AnnouncementsModule extends SignageModule {
  async init() {
    this.container.classList.add('announcements-module');
    this.container.innerHTML = `<div class="announcements-module__card" id="announcement-card"></div>`;
    this.card = this.container.querySelector('#announcement-card');
    this.items = [];
    this.itemIndex = 0;
    this.stopPoll = null;
    this.internalTimer = null;
  }

  start() {
    const interval = this.settings.announcements_poll_interval || CONFIG.DEFAULTS.announcements_poll_interval;
    this.stopPoll = poll(this.api, 'api/announcements', interval, (items) => {
      this.items = items || [];
      this.itemIndex = 0;
      this._renderCurrent();
      this._restartInternalRotation();
    });
  }

  stop() {
    if (this.stopPoll) this.stopPoll();
    this.stopPoll = null;
    clearInterval(this.internalTimer);
    this.internalTimer = null;
  }

  // Announcements has its own sub-rotation between messages, on
  // top of the outer module rotation, since a venue may have
  // several announcements active at once.
  _restartInternalRotation() {
    clearInterval(this.internalTimer);
    if (this.items.length <= 1) return;
    this.internalTimer = setInterval(() => {
      this.itemIndex = (this.itemIndex + 1) % this.items.length;
      this._renderCurrent();
    }, 6000);
  }

  _renderCurrent() {
    if (!this.items.length) {
      this.card.innerHTML = '';
      this.container.classList.add('announcements-module--empty');
      return;
    }
    this.container.classList.remove('announcements-module--empty');
    const item = this.items[this.itemIndex];
    this.card.classList.remove('announcements-module__card--enter');
    // Force reflow so the enter animation replays for each message.
    void this.card.offsetWidth;
    this.card.innerHTML = `
      ${item.icon ? `<div class="announcements-module__icon">${item.icon}</div>` : ''}
      <p class="announcements-module__message">${escapeHtml(item.message)}</p>
    `;
    this.card.classList.add('announcements-module__card--enter');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
