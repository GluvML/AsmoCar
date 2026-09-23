import 'dart:math';
import 'package:flutter/material.dart';

enum Co2SafetyLevel { good, normal, warning, danger }

class SensorData {
  final int co2;
  final double temperature;
  final double humidity;
  final DateTime timestamp;
  final String source;

  SensorData({
    required this.co2,
    required this.temperature,
    required this.humidity,
    DateTime? timestamp,
    this.source = 'BLE',
  }) : timestamp = timestamp ?? DateTime.now();

  factory SensorData.fromJson(Map<String, dynamic> json, {String source = 'ESP32'}) {
    return SensorData(
      co2: json['co2'] is int ? json['co2'] : int.tryParse(json['co2'].toString()) ?? 400,
      temperature: (json['temp'] as num?)?.toDouble() ?? 25.0,
      humidity: (json['hum'] as num?)?.toDouble() ?? 50.0,
      source: source,
    );
  }

  // Phân loại mức độ an toàn của CO2 trong cabin
  Co2SafetyLevel get co2Level {
    if (co2 < 800) return Co2SafetyLevel.good;
    if (co2 < 1200) return Co2SafetyLevel.normal;
    if (co2 < 1800) return Co2SafetyLevel.warning;
    return Co2SafetyLevel.danger;
  }

  String get co2StatusText {
    switch (co2Level) {
      case Co2SafetyLevel.good:
        return 'Trong lành';
      case Co2SafetyLevel.normal:
        return 'Bình thường';
      case Co2SafetyLevel.warning:
        return 'Bí khí / Buồn ngủ';
      case Co2SafetyLevel.danger:
        return 'Nguy hiểm / Thiếu oxy';
    }
  }

  Color get co2Color {
    switch (co2Level) {
      case Co2SafetyLevel.good:
        return const Color(0xFF00E676);
      case Co2SafetyLevel.normal:
        return const Color(0xFF00E5FF);
      case Co2SafetyLevel.warning:
        return const Color(0xFFFFAB00);
      case Co2SafetyLevel.danger:
        return const Color(0xFFFF3D71);
    }
  }

  // Tính chỉ số sốc nhiệt Heat Index (°C)
  double get heatIndex {
    final t = temperature;
    final rh = humidity;
    if (t < 26) return t;

    const c1 = -8.78469475556;
    const c2 = 1.61139411;
    const c3 = 2.33854883889;
    const c4 = -0.14611605;
    const c5 = -0.012308094;
    const c6 = -0.0164248277778;
    const c7 = 0.002211732;
    const c8 = 0.00072546;
    const c9 = -0.000003582;

    final hi = c1 + (c2 * t) + (c3 * rh) + (c4 * t * rh) +
        (c5 * t * t) + (c6 * rh * rh) + (c7 * t * t * rh) +
        (c8 * t * rh * rh) + (c9 * t * t * rh * rh);
    return max(t, hi);
  }

  // Tính điểm sương Dew Point (°C) - cảnh báo hấp hơi mờ kính lái
  double get dewPoint {
    const a = 17.27;
    const b = 237.7;
    final alpha = ((a * temperature) / (b + temperature)) + log(max(1.0, humidity) / 100.0);
    return (b * alpha) / (a - alpha);
  }
}
