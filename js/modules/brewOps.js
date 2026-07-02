import { IframeModule } from './iframeModule.js';

/**
 * Embeds the BrewBlocks dashboard. BrewBlocks is reachable only
 * over the venue's VPN, so it's the kiosk device (the Chromium
 * instance actually rendering this iframe) that needs an active
 * VPN connection to BrewBlocks's network -- the Apps Script
 * backend never talks to BrewBlocks at all, this module doesn't
 * go through /api/brewops.
 */
export default class BrewOpsModule extends IframeModule {
  static settingsKey = 'brewblocks_dashboard_url';
  static label = 'Brew Ops';
}
