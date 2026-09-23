import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/sensor_data.dart';

class WifiService {
  final _dataController = StreamController<SensorData>.broadcast();
  Stream<SensorData> get dataStream => _dataController.stream;

  final _statusController = StreamController<String>.broadcast();
  Stream<String> get statusStream => _statusController.stream;

  WebSocketChannel? _channel;
  Timer? _pollTimer;
  bool _isConnected = false;

  Future<void> connect(String ip) async {
    disconnect();
    _statusController.add('Đang kết nối Wi-Fi tới $ip...');

    try {
      final wsUrl = Uri.parse('ws://$ip:81/');
      _channel = WebSocketChannel.connect(wsUrl);

      _channel!.stream.listen(
        (message) {
          _isConnected = true;
          _statusController.add('Đã kết nối Wi-Fi WebSocket: $ip');
          final data = json.decode(message);
          _dataController.add(SensorData.fromJson(data, source: 'Wi-Fi'));
        },
        onError: (e) {
          _startHttpPolling(ip);
        },
        onDone: () {
          _isConnected = false;
          _statusController.add('Mất kết nối Wi-Fi');
        },
      );
    } catch (e) {
      _startHttpPolling(ip);
    }
  }

  void _startHttpPolling(String ip) {
    _statusController.add('Chuyển sang HTTP polling: $ip');
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) async {
      try {
        final res = await http.get(Uri.parse('http://$ip/data')).timeout(const Duration(seconds: 2));
        if (res.statusCode == 200) {
          final data = json.decode(res.body);
          _dataController.add(SensorData.fromJson(data, source: 'Wi-Fi (HTTP)'));
          _statusController.add('Đã kết nối Wi-Fi HTTP: $ip');
        }
      } catch (e) {
        _statusController.add('Lỗi kết nối Wi-Fi: $e');
      }
    });
  }

  void disconnect() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    _statusController.add('Đã ngắt kết nối Wi-Fi');
  }

  void dispose() {
    disconnect();
    _dataController.close();
    _statusController.close();
  }
}
