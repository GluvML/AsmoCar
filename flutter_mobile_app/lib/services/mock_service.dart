import 'dart:async';
import 'dart:math';
import '../models/sensor_data.dart';

class MockService {
  final _controller = StreamController<SensorData>.broadcast();
  Stream<SensorData> get dataStream => _controller.stream;

  Timer? _timer;
  double _co2 = 650;
  double _temp = 24.5;
  double _hum = 52.0;
  String _scenario = 'normal';
  final _random = Random();

  bool get isRunning => _timer != null;

  void start() {
    stop();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
    _tick();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void setScenario(String scenario) {
    _scenario = scenario;
    if (scenario == 'normal') {
      _co2 = 600;
      _temp = 23.5;
      _hum = 50.0;
    } else if (scenario == 'recirc_buildup') {
      _co2 = 1100;
      _temp = 24.5;
    } else if (scenario == 'parked_sun') {
      _temp = 36.5;
      _hum = 35.0;
    } else if (scenario == 'fresh_air') {
      _co2 = 800;
    }
    _tick();
  }

  void setManualValues({double? co2, double? temp, double? hum}) {
    _scenario = 'manual';
    if (co2 != null) _co2 = co2;
    if (temp != null) _temp = temp;
    if (hum != null) _hum = hum;
    _tick();
  }

  void _tick() {
    if (_scenario == 'recirc_buildup') {
      _co2 = min(2500, _co2 + _random.nextDouble() * 25 + 10);
      _hum = min(70, _hum + 0.1);
    } else if (_scenario == 'parked_sun') {
      _temp = min(50.0, _temp + 0.3);
      _hum = max(25.0, _hum - 0.2);
    } else if (_scenario == 'fresh_air') {
      _co2 = max(420, _co2 - (_random.nextDouble() * 40 + 20));
    } else if (_scenario == 'normal') {
      _co2 += (_random.nextDouble() - 0.5) * 6;
      _co2 = max(450, min(750, _co2));
      _temp += (_random.nextDouble() - 0.5) * 0.1;
      _hum += (_random.nextDouble() - 0.5) * 0.2;
    }

    _controller.add(
      SensorData(
        co2: _co2.round(),
        temperature: double.parse(_temp.toStringAsFixed(1)),
        humidity: double.parse(_hum.toStringAsFixed(1)),
        source: 'Giả Lập (Demo)',
      ),
    );
  }

  void dispose() {
    stop();
    _controller.close();
  }
}
