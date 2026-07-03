import { SignageModule } from './moduleBase.js';
import { poll } from '../api.js';
import { CONFIG } from '../config.js';

export default class DraftBoardModule extends SignageModule {
  async init() {
    this.container.classList.add('draft-board');
    this.container.innerHTML = `
      <header class="draft-board__header">
        <h1 class="draft-board__title">On Tap</h1>
      </header>
      <div class="draft-board__grid" id="draft-grid"></div>
    `;
    this.grid = this.container.querySelector('#draft-grid');
    this.stopPoll = null;
  }

  start() {
    const interval = this.settings.draft_poll_interval || CONFIG.DEFAULTS.draft_poll_interval;
    this.stopPoll = poll(this.api, 'api/draft', interval, (data) => this._render(data));
  }

  stop() {
    if (this.stopPoll) this.stopPoll();
    this.stopPoll = null;
  }

  _render(data) {
    const taps = data.taps || [];
    this.grid.innerHTML = taps.map((tap) => this._tapCard(tap)).join('');
  }

  _tapCard(tap) {
    if (!tap.beer) {
      return `
        <article class="tap-card tap-card--empty">
          <div class="tap-card__number">${tap.tapNumber}</div>
          <div class="tap-card__empty-label">Coming Soon</div>
        </article>`;
    }
    const b = tap.beer;
    const price = b.prices.price16 ? `$${b.prices.price16.toFixed(2)}` : '';
    const glass = b.glass;
    return `
      <article class="tap-card ${tap.isOnDeck ? 'tap-card--on-deck' : ''}">
        <div class="tap-card__number">${tap.tapNumber}</div>
        <div class="tap-card__body">
          <h2 class="tap-card__name">${escapeHtml(b.name)}${b.isSeasonal ? ' <span class="tap-card__badge">Seasonal</span>' : ''}</h2>
          <p class="tap-card__style">${escapeHtml(b.style)}</p>
          <div class="tap-card__meta">
            <span class="tap-card__abv">${b.abv != null ? b.abv + '% ABV' : ''}</span>
            <span class="tap-card__glass">
              ${glass && glass.imageUrl ? `<object class="tap-card__glass-icon" type="image/svg+xml" data="${escapeAttr(glass.imageUrl)}" alt="" />` : ''}
              ${glass && glass.name ? `<span class="tap-card__glass-name">${escapeHtml(glass.name)}</span>` : ''}
            </span>
            <span class="tap-card__price">${price}</span>
          </div>
        </div>
        ${tap.isOnDeck ? '<div class="tap-card__ribbon">On Deck</div>' : ''}
      </article>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
