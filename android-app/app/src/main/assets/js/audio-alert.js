/**
 * audio-alert.js
 * Quản lý cảnh báo âm thanh (Web Audio API Beep/Chime) và Giọng nói tiếng Việt (Web Speech API)
 */
class AudioAlertService {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.voiceEnabled = true;
    this.lastVoiceAlertTime = 0;
    this.voiceCooldown = 60000; // Nhắc lại tối đa 1 lần mỗi 60 giây
    this.lastAlertKey = '';

    // Khởi tạo AudioContext khi có tương tác đầu tiên của người dùng
    document.addEventListener('click', () => this.initAudioContext(), { once: true });
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  playChime(type = 'info') {
    if (!this.soundEnabled) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'warning') {
        // Double warning beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.setValueAtTime(800, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'danger') {
        // Urgent alarm pulse
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.setValueAtTime(1200, now + 0.15);
        osc.frequency.setValueAtTime(900, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Gentle pleasant chime (connected / ok)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  speak(text, alertKey = '') {
    if (!this.soundEnabled || !this.voiceEnabled) return;
    if (!('speechSynthesis' in window)) return;

    const now = Date.now();
    if (alertKey && alertKey === this.lastAlertKey && (now - this.lastVoiceAlertTime < this.voiceCooldown)) {
      return; // Vẫn trong thời gian chờ (cooldown)
    }

    this.lastVoiceAlertTime = now;
    this.lastAlertKey = alertKey;

    window.speechSynthesis.cancel(); // Hủy câu đang đọc dở nếu có

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Tìm giọng đọc tiếng Việt nếu trình duyệt hỗ trợ
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

window.audioAlert = new AudioAlertService();
