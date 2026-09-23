import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../models/sensor_data.dart';
import '../services/ble_service.dart';
import '../services/wifi_service.dart';
import '../services/mock_service.dart';
import '../services/tts_service.dart';

class AirMonitorProvider extends ChangeNotifier {
  final BleService bleService = BleService();
  final WifiService wifiService = WifiService();
  final MockService mockService = MockService();
  final TtsService ttsService = TtsService();

  SensorData currentData = SensorData(co2: 650, temperature: 24.5, humidity: 52.0);
  final List<SensorData> tripHistory = [];
  final int maxHistoryPoints = 50;

  String connectionStatus = 'Chế độ Giả Lập (Demo)';
  String activeMode = 'mock'; // 'ble' | 'wifi' | 'mock'
  bool isConnected = true;

  int minCo2 = 9999;
  int maxCo2 = 0;

  StreamSubscription? _dataSub;
  StreamSubscription? _statusSub;

  AirMonitorProvider() {
    _initWakelock();
    startMockMode();
  }

  Future<void> _initWakelock() async {
    try {
      await WakelockPlus.enable(); // Giữ màn hình điện thoại luôn sáng khi gắn trên xe
    } catch (_) {}
  }

  void _onNewData(SensorData data) {
    currentData = data;

    if (data.co2 < minCo2) minCo2 = data.co2;
    if (data.co2 > maxCo2) maxCo2 = data.co2;

    tripHistory.add(data);
    if (tripHistory.length > maxHistoryPoints) {
      tripHistory.removeAt(0);
    }

    _checkAlerts(data);
    notifyListeners();
  }

  void _checkAlerts(SensorData data) {
    if (data.co2 >= 1800) {
      ttsService.speakAlert(
        'Cảnh báo nguy cấp: Nồng độ CO2 trong cabin quá cao, tài xế hãy hạ kính hoặc bật lấy gió ngoài ngay!',
        'danger_co2',
      );
    } else if (data.co2 >= 1200) {
      ttsService.speakAlert(
        'Nồng độ CO2 bắt đầu tăng cao, khuyến nghị chuyển sang chế độ lấy gió ngoài.',
        'warning_co2',
      );
    } else if (data.temperature >= 38.0) {
      ttsService.speakAlert(
        'Nhiệt độ trong xe rất cao, cẩn thận sốc nhiệt cabin!',
        'danger_temp',
      );
    }
  }

  void startMockMode() {
    _cleanupStreams();
    activeMode = 'mock';
    isConnected = true;
    connectionStatus = 'Chế độ Giả Lập (Demo)';
    mockService.start();
    _dataSub = mockService.dataStream.listen(_onNewData);
    notifyListeners();
  }

  Future<bool> connectBle(BluetoothDevice device) async {
    _cleanupStreams();
    activeMode = 'ble';
    connectionStatus = 'Đang kết nối BLE...';
    notifyListeners();

    _dataSub = bleService.dataStream.listen(_onNewData);
    _statusSub = bleService.statusStream.listen((status) {
      connectionStatus = status;
      isConnected = status.contains('Đã kết nối');
      notifyListeners();
    });

    final success = await bleService.connectToDevice(device);
    return success;
  }

  Future<void> connectWifi(String ip) async {
    _cleanupStreams();
    activeMode = 'wifi';
    connectionStatus = 'Đang kết nối Wi-Fi...';
    notifyListeners();

    _dataSub = wifiService.dataStream.listen(_onNewData);
    _statusSub = wifiService.statusStream.listen((status) {
      connectionStatus = status;
      isConnected = status.contains('Đã kết nối');
      notifyListeners();
    });

    await wifiService.connect(ip);
  }

  void _cleanupStreams() {
    mockService.stop();
    bleService.disconnect();
    wifiService.disconnect();
    _dataSub?.cancel();
    _statusSub?.cancel();
  }

  void toggleSound() {
    ttsService.toggleSound();
    notifyListeners();
  }

  @override
  void dispose() {
    _cleanupStreams();
    bleService.dispose();
    wifiService.dispose();
    mockService.dispose();
    super.dispose();
  }
}
