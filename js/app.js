import { CONFIG } from './config.js';
import { ApiClient } from './api.js';
import { poll } from './api.js';
import { ModuleManager } from './moduleManager.js';

async function main() {
  const apiClient = new ApiClient(CONFIG.API_BASE_URL);

  let settings = { ...CONFIG.DEFAULTS };
  try {
    const remote = await apiClient.get('api/settings');
    settings = { ...settings, ...remote };
  } catch (err) {
    console.warn('Falling back to default settings, /api/settings unreachable on boot:', err);
  }

  applyChrome(settings);
  applyOrientation(settings);

  const manager = new ModuleManager({
    stageRoot: document.getElementById('stage'),
    apiClient,
    settings
  });

  document.getElementById('boot-loader').classList.add('boot-loader--hidden');

  await manager.start();

  // Keep chrome/orientation/theme in sync if Settings changes later,
  // without requiring a device reboot or page reload.
  poll(apiClient, 'api/settings', settings.settings_poll_interval || CONFIG.DEFAULTS.settings_poll_interval, (data) => {
    settings = { ...settings, ...data };
    applyChrome(settings);
    applyOrientation(settings);
    manager.updateSettings(settings);
  });

  startClock();
}

function applyChrome(settings) {
  const root = document.documentElement.style;
  root.setProperty('--color-primary', settings.theme_primary_color || CONFIG.DEFAULTS.theme_primary_color);
  root.setProperty('--color-bg', settings.theme_bg_color || CONFIG.DEFAULTS.theme_bg_color);
  root.setProperty('--color-accent', settings.theme_accent_color || CONFIG.DEFAULTS.theme_accent_color);

  document.getElementById('venue-name').textContent = settings.venue_name || CONFIG.DEFAULTS.venue_name;
  const logo = document.getElementById('venue-logo');
  if (settings.logo_url) {
    logo.src = settings.logo_url;
    logo.style.display = '';
  } else {
    logo.style.display = 'none';
  }

  document.getElementById('chrome-bar').style.display =
    settings.show_chrome === false ? 'none' : '';
}

function applyOrientation(settings) {
  const orientation = settings.orientation === 'portrait' ? 'portrait' : 'landscape';
  document.body.classList.toggle('orientation-portrait', orientation === 'portrait');
  document.body.classList.toggle('orientation-landscape', orientation === 'landscape');
}

function startClock() {
  const clockEl = document.getElementById('chrome-clock');
  if (!clockEl) return;
  const tick = () => {
    clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 15000);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  document.getElementById('boot-loader').textContent =
    'Unable to start signage app. Check network and API_BASE_URL in config.js.';
});
