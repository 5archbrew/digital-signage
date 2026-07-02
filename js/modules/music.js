import { IframeModule } from './iframeModule.js';

/**
 * Embeds SoundTrack Your Brand's "now playing" page. Set
 * `soundtrack_now_playing_url` in the Settings sheet to the
 * public/display URL SoundTrack gives you for that view -- check
 * their dashboard for a "TV" / display-mode / embed link rather
 * than the regular account URL, since those are the ones typically
 * built to be shown full-screen and to allow framing.
 */
export default class MusicModule extends IframeModule {
  static settingsKey = 'soundtrack_now_playing_url';
  static label = 'Now Playing';
}
