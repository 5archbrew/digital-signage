import { SignageModule } from './moduleBase.js';
import { poll } from '../api.js';
import { CONFIG } from '../config.js';

export default class EventsModule extends SignageModule {
  async init() {
    this.container.classList.add('events-module');
    this.container.innerHTML = `
      <header class="events-module__header">
        <h1 class="events-module__title">Upcoming Events</h1>
      </header>
      <div class="events-module__list" id="events-list"></div>
    `;
    this.list = this.container.querySelector('#events-list');
    this.stopPoll = null;
  }

  start() {
    const interval = this.settings.events_poll_interval || CONFIG.DEFAULTS.events_poll_interval;
    this.stopPoll = poll(this.api, 'api/events', interval, (items) => this._render(items));
  }

  stop() {
    if (this.stopPoll) this.stopPoll();
    this.stopPoll = null;
  }

  _render(items) {
    if (!items || !items.length) {
      this.list.innerHTML = '<p class="events-module__empty">No upcoming events.</p>';
      return;
    }
    this.list.innerHTML = items.slice(0, 4).map((ev) => {
      const start = new Date(ev.startDateTime);
      const month = start.toLocaleDateString('en-US', { month: 'short' });
      const day = start.toLocaleDateString('en-US', { day: 'numeric' });
      const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `
        <article class="event-card">
          <div class="event-card__date">
            <span class="event-card__month">${month}</span>
            <span class="event-card__day">${day}</span>
          </div>
          <div class="event-card__body">
            <h2 class="event-card__title">${escapeHtml(ev.title)}</h2>
            <p class="event-card__meta">${time}${ev.location ? ' · ' + escapeHtml(ev.location) : ''}</p>
            ${ev.description ? `<p class="event-card__description">${escapeHtml(ev.description)}</p>` : ''}
          </div>
        </article>`;
    }).join('');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
