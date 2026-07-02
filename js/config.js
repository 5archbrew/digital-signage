/**
 * config.js
 * The one file you must edit per-deployment: point API_BASE_URL at
 * your Apps Script Web App /exec URL. Everything else (theme,
 * orientation, poll intervals, rotation) is fetched live from
 * /api/settings and /api/schedule so it can change without
 * touching the Pi.
 */
export const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbw5k5TrCYET6zp5UZhAJGc9aGo3olmZj2YwdAJz3StCfoZXVDZA98jynJpBOlDUijqO_g/exec',

  // Used only until /api/settings responds for the first time.
  DEFAULTS: {
    orientation: 'landscape',
    theme_primary_color: '#f7931e',
    theme_bg_color: '#0b0d10',
    theme_accent_color: '#3ddc97',
    venue_name: 'Taproom',
    logo_url: '',
    show_chrome: true,
    rotation_default_duration: 20,
    draft_poll_interval: 15000,
    brewops_poll_interval: 30000,
    music_poll_interval: 8000,
    announcements_poll_interval: 30000,
    events_poll_interval: 60000,
    settings_poll_interval: 120000,
    schedule_poll_interval: 120000
  },

  // Registry of available signage modules. Adding a new module to
  // the platform means: write frontend/js/modules/yourModule.js
  // exporting a default class that extends SignageModule, add one
  // line here, and add a row to the Schedule sheet. Nothing else
  // in the app needs to change.
  MODULE_REGISTRY: {
    draft: () => import('./modules/draftBoard.js'),
    brewops: () => import('./modules/brewOps.js'),
    music: () => import('./modules/music.js'),
    announcements: () => import('./modules/announcements.js'),
    events: () => import('./modules/events.js')
  }
};
