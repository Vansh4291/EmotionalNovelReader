/**
 * Browser shim for react-native-tts (validation harness ONLY).
 *
 * Bridges the react-native-tts API surface onto the Web Speech API so real
 * audible narration can be exercised in a browser. Records every speak/stop
 * call with its delivery parameters into window.__TTS_LOG__ so the journey
 * validator can assert on them programmatically.
 */
class TtsShim {
  constructor() {
    this.listeners = { 'tts-finish': [], 'tts-cancel': [], 'tts-error': [], 'tts-start': [] };
    this._utter = null;
    this._rate = 1.0;
    this._pitch = 1.0;
    this._lang = 'en-US';
    window.__TTS_LOG__ = window.__TTS_LOG__ || [];
    window.__TTS_ENABLED__ =
      typeof window !== 'undefined' &&
      ('speechSynthesis' in window) &&
      (window.speechSynthesis.getVoices().length > 0 ||
        new Promise((resolve) => {
          // Voices load async in Chrome.
          window.speechSynthesis.onvoiceschanged = () => resolve(true);
          setTimeout(() => resolve(window.speechSynthesis.getVoices().length > 0), 1500);
        }) instanceof Promise);
  }

  async getInitStatus() {
    if (!('speechSynthesis' in window)) {
      const err = new Error('no_engine');
      throw err;
    }
    // Give Chrome a beat to populate voices.
    if (window.speechSynthesis.getVoices().length === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
    return 'success';
  }

  async voices() {
    return (window.speechSynthesis.getVoices() || []).map((v) => ({ id: v.voiceURI, name: v.name, language: v.lang }));
  }

  async setDefaultLanguage(lang) { this._lang = lang; return true; }
  async setDefaultRate(rate) { this._rate = rate; return true; }
  async setDefaultPitch(pitch) { this._pitch = pitch; return true; }
  async setDefaultVolume(v) { this._volume = v; return true; }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
    return { remove: () => { this.listeners[event] = this.listeners[event].filter((h) => h !== handler); } };
  }
  // react-native-tts also exposes these names on some versions.
  addListener(event, handler) { return this.addEventListener(event, handler); }
  removeAllListeners(event) { if (event) this.listeners[event] = []; }

  async speak(text, options = {}) {
    if (!('speechSynthesis' in window)) throw new Error('no_engine');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = options.iosVoiceId ? this._lang : this._lang;
    u.rate = Math.max(0.1, Math.min(10, (options.rate || this._rate)));
    u.pitch = Math.max(0, Math.min(2, (options.pitch || this._pitch)));
    u.volume = options.volume != null ? options.volume : (this._volume != null ? this._volume : 1.0);

    const preferEn = window.speechSynthesis.getVoices().filter((v) => /^en(-|_)/i.test(v.lang));
    if (preferEn.length > 0) {
      const pick = preferEn.find((v) => /natural|google|samantha|daniel|aria/i.test(v.name)) || preferEn[0];
      u.voice = pick;
    }

    window.__TTS_LOG__.push({
      at: Date.now(),
      text: String(text),
      rate: u.rate,
      pitch: u.pitch,
      voice: u.voice ? u.voice.name : null,
    });

    return new Promise((resolve, reject) => {
      u.onstart = () => {
        this.listeners['tts-start'].forEach((h) => { try { h({ utteranceId: 0 }); } catch (e) {} });
        resolve(String(text).length / Math.max(1, u.rate));
      };
      u.onend = () => {
        this._utter = null;
        this.listeners['tts-finish'].forEach((h) => { try { h({ utteranceId: 0 }); } catch (e) {} });
      };
      u.onerror = (e) => {
        this._utter = null;
        this.listeners['tts-error'].forEach((h) => { try { h(e); } catch (err) {} });
        if (e && e.error === 'canceled') {
          this.listeners['tts-cancel'].forEach((h) => { try { h({ utteranceId: 0 }); } catch (err) {} });
        }
        reject(e);
      };
      this._utter = u;
      window.speechSynthesis.speak(u);
    });
  }

  async stop(onWordBoundary) {
    window.__TTS_LOG__.push({ at: Date.now(), text: '__STOP__', rate: null, pitch: null });
    window.speechSynthesis.cancel();
    this._utter = null;
    return true;
  }

  async pause(onWordBoundary) {
    if (window.speechSynthesis.paused) return true;
    window.speechSynthesis.pause();
    return true;
  }

  async resume(onWordBoundary) {
    if (!window.speechSynthesis.paused) return true;
    window.speechSynthesis.resume();
    return true;
  }
}

const instance = new TtsShim();
export default instance;
