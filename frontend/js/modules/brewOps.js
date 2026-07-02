import { SignageModule } from './moduleBase.js';
import { poll } from '../api.js';
import { CONFIG } from '../config.js';

export default class BrewOpsModule extends SignageModule {
  async init() {
    this.container.classList.add('brew-ops');
    this.container.innerHTML = `
      <header class="brew-ops__header">
        <h1 class="brew-ops__title">In The Brewhouse</h1>
      </header>
      <div class="brew-ops__columns">
        <section class="brew-ops__batches" id="brewops-batches">
          <h2>Fermenting &amp; Conditioning</h2>
          <div class="brew-ops__batch-list"></div>
        </section>
        <section class="brew-ops__inventory" id="brewops-inventory">
          <h2>Cellar Stock</h2>
          <div class="brew-ops__inventory-list"></div>
        </section>
      </div>
    `;
    this.batchList = this.container.querySelector('.brew-ops__batch-list');
    this.inventoryList = this.container.querySelector('.brew-ops__inventory-list');
    this.stopPoll = null;
  }

  start() {
    const interval = this.settings.brewops_poll_interval || CONFIG.DEFAULTS.brewops_poll_interval;
    this.stopPoll = poll(this.api, 'api/brewops', interval, (data) => this._render(data));
  }

  stop() {
    if (this.stopPoll) this.stopPoll();
    this.stopPoll = null;
  }

  _render(data) {
    const batches = data.batches || [];
    const inventory = data.inventory || [];

    this.batchList.innerHTML = batches.length
      ? batches.map((b) => `
        <div class="batch-row">
          <div class="batch-row__name">${escapeHtml(b.beerName)}</div>
          <div class="batch-row__style">${escapeHtml(b.beerStyle)}</div>
          <div class="batch-row__stats">
            ${b.tempF != null ? `<span>${b.tempF}&deg;F</span>` : ''}
            ${b.sg != null ? `<span>SG ${b.sg}</span>` : ''}
            ${b.gallons != null ? `<span>${b.gallons} gal</span>` : ''}
          </div>
        </div>`).join('')
      : '<p class="brew-ops__empty">Nothing currently in process.</p>';

    this.inventoryList.innerHTML = inventory.length
      ? inventory.map((i) => `
        <div class="inventory-row">
          <span class="inventory-row__name">${escapeHtml(i.beerName)}</span>
          <span class="inventory-row__count">${i.halfBBL} × 1/2bbl · ${i.sixthBBL} × 1/6bbl</span>
        </div>`).join('')
      : '<p class="brew-ops__empty">No inventory data.</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
