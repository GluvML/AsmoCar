import 'dart:async';
import 'dart:convert';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/sensor_data.dart';

class BleService {
  static const String serviceUuid = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  static const String characteristicUuid = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

  final _dataController = StreamController<SensorData>.broadcast();
  Stream<SensorData> get dataStream => _dataController.stream;

  final _statusController = StreamController<String>.broadcast();
  Stream<String> get statusStream => _statusController.stream;

  BluetoothDevice? _connectedDevice;
  StreamSubscription? _notifySub;

  Future<void> startScan({Function(List<ScanResult>)? onResults}) async {
    _statusController.add('Đang quét tìm thiết bị ESP32 (CarAir_)...');

    // Kiểm tra Bluetooth khả dụng
    if (await FlutterBluePlus.isSupported == false) {
      _statusController.add('Thiết bị không hỗ trợ Bluetooth BLE');
      return;
    }

    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 6),
      withNames: ["CarAir_ESP32"],
    );

    FlutterBluePlus.scanResults.listen((results) {
      if (onResults != null) onResults(results);
    });
  }

  Future<bool> connectToDevice(BluetoothDevice device) async {
    try {
      _statusController.add('Đang kết nối tới ${device.platformName}...');
      await FlutterBluePlus.stopScan();

      await device.connect(autoConnect: false, timeout: const Duration(seconds: 10));
      _connectedDevice = device;

      _statusController.add('Đã kết nối BLE: ${device.platformName}');

      // Khám phá dịch vụ GATT
      List<BluetoothService> services = await device.discoverServices();
      for (var service in services) {
        if (service.uuid.toString().toLowerCase() == serviceUuid) {
          for (var char in service.characteristics) {
            if (char.uuid.toString().toLowerCase() == characteristicUuid) {
              await char.setNotifyValue(true);
              _notifySub = char.onValueReceived.listen((value) {
                try {
                  final jsonStr = utf8.decode(value);
                  final Map<String, dynamic> data = json.decode(jsonStr);
                  _dataController.add(SensorData.fromJson(data, source: 'BLE'));
                } catch (e) {
                  // decode error
                }
              });
              return true;
            }
          }
        }
      }
      return true;
    } catch (e) {
      _statusController.add('Lỗi kết nối BLE: $e');
      return false;
    }
  }

  Future<void> disconnect() async {
    await _notifySub?.cancel();
    _notifySub = null;
    if (_connectedDevice != null) {
      await _connectedDevice!.disconnect();
      _connectedDevice = null;
    }
    _statusController.add('Đã ngắt kết nối BLE');
  }

  void dispose() {
    disconnect();
    _dataController.close();
    _statusController.close();
  }
}
