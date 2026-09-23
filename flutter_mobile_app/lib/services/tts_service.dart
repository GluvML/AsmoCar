import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  final FlutterTts _tts = FlutterTts();
  bool enabled = true;
  DateTime? _lastAlertTime;
  String _lastAlertKey = '';

  TtsService() {
    _initTts();
  }

  Future<void> _initTts() async {
    await _tts.setLanguage("vi-VN");
    await _tts.setSpeechRate(0.95);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
  }

  Future<void> speakAlert(String text, String alertKey) async {
    if (!enabled) return;

    final now = DateTime.now();
    if (_lastAlertKey == alertKey && _lastAlertTime != null) {
      if (now.difference(_lastAlertTime!).inSeconds < 60) {
        return; // Còn trong thời gian chờ
      }
    }

    _lastAlertTime = now;
    _lastAlertKey = alertKey;

    await _tts.stop();
    await _tts.speak(text);
  }

  void toggleSound() {
    enabled = !enabled;
  }
}
