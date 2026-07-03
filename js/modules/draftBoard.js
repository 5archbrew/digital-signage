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
    this.lastRenderedKey = null;
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

    // Every poll fetches fresh JSON even when nothing actually
    // changed on the sheet -- re-writing identical HTML would still
    // retrigger each card's entrance animation, which reads as a
    // pointless flash every poll cycle. Skip the DOM write entirely
    // when the tap list is unchanged; only a real change (new beer,
    // price update, tap added/removed) replaces the grid and plays
    // the animation.
    const key = JSON.stringify(taps);
    if (key === this.lastRenderedKey) return;
    this.lastRenderedKey = key;

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

    // Only tiers with an actual price on this beer get shown --
    // e.g. a beer with no PriceGrowler set just omits that badge.
    const priceTiers = [
      { price: b.prices.price16, glass: b.glass, fallbackLabel: 'Pour' },
      { price: b.prices.price4, glass: b.tasterGlass, fallbackLabel: '4oz' },
      { price: b.prices.priceGrowler, glass: b.growlerGlass, fallbackLabel: 'Growler' }
    ].filter((tier) => tier.price != null && tier.price !== '');

    const pricingHtml = priceTiers.map((tier) => this._priceBadge(tier)).join('');

    return `
      <article class="tap-card ${tap.isOnDeck ? 'tap-card--on-deck' : ''}">
        <div class="tap-card__number">${tap.tapNumber}</div>
        <div class="tap-card__body">
          <h2 class="tap-card__name">${escapeHtml(b.name)}${b.isSeasonal ? ' <span class="tap-card__badge">Seasonal</span>' : ''}</h2>
          <p class="tap-card__style">${escapeHtml(b.style)}</p>
          <div class="tap-card__meta">
            <span class="tap-card__abv">${b.abv != null ? b.abv + '% ABV' : ''}</span>
          </div>
          <div class="tap-card__pricing">${pricingHtml}</div>
        </div>
        ${tap.isOnDeck ? '<div class="tap-card__ribbon">On Deck</div>' : ''}
      </article>`;
  }

  _priceBadge(tier) {
    const label = (tier.glass && tier.glass.name) ? tier.glass.name : tier.fallbackLabel;
    const amount = `$${Number(tier.price).toFixed(2)}`;
    return `
      <span class="tap-card__price-badge">
        ${tier.glass && tier.glass.imageUrl
          ? `<object class="tap-card__glass-icon" type="image/svg+xml" data="${escapeAttr(tier.glass.imageUrl)}" aria-hidden="true"></object>`
          : ''}
        <span class="tap-card__price-label">${escapeHtml(label)}</span>
        <span class="tap-card__price-amount">${amount}</span>
      </span>`;
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
