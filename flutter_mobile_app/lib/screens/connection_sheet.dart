import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:provider/provider.dart';
import '../providers/air_monitor_provider.dart';

class ConnectionSheet extends StatefulWidget {
  const ConnectionSheet({super.key});

  @override
  State<ConnectionSheet> createState() => _ConnectionSheetState();
}

class _ConnectionSheetState extends State<ConnectionSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _ipController = TextEditingController(text: '192.168.4.1');
  List<ScanResult> _scanResults = [];
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  void _startBleScan(AirMonitorProvider provider) async {
    setState(() {
      _isScanning = true;
      _scanResults.clear();
    });

    await provider.bleService.startScan(onResults: (results) {
      if (mounted) {
        setState(() {
          _scanResults = results;
        });
      }
    });

    Future.delayed(const Duration(seconds: 6), () {
      if (mounted) setState(() => _isScanning = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AirMonitorProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF131822),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF232C3D),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'KẾT NỐI THIẾT BỊ ESP32',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),
          TabBar(
            controller: _tabController,
            indicatorColor: const Color(0xFF00E5FF),
            labelColor: const Color(0xFF00E5FF),
            unselectedLabelColor: const Color(0xFF94A3B8),
            tabs: const [
              Tab(text: 'Bluetooth BLE'),
              Tab(text: 'Wi-Fi'),
              Tab(text: 'Giả Lập (Demo)'),
            ],
          ),
          SizedBox(
            height: 320,
            child: TabBarView(
              controller: _tabController,
              children: [
                // 1. Tab BLE
                Column(
                  children: [
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _isScanning ? null : () => _startBleScan(provider),
                      icon: Icon(_isScanning ? Icons.sync : Icons.bluetooth_searching),
                      label: Text(_isScanning ? 'Đang quét...' : 'Quét Bluetooth ESP32'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(45),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: _scanResults.isEmpty
                          ? Center(
                              child: Text(
                                _isScanning ? 'Đang tìm kiếm thiết bị CarAir_ESP32...' : 'Bấm nút quét để tìm thiết bị trên xe',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            )
                          : ListView.builder(
                              itemCount: _scanResults.length,
                              itemBuilder: (ctx, i) {
                                final r = _scanResults[i];
                                return ListTile(
                                  title: Text(r.device.platformName.isEmpty ? 'Thiết bị không tên' : r.device.platformName,
                                      style: const TextStyle(color: Colors.white)),
                                  subtitle: Text(r.device.remoteId.str, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  trailing: ElevatedButton(
                                    onPressed: () async {
                                      final success = await provider.connectBle(r.device);
                                      if (mounted && success) Navigator.pop(context);
                                    },
                                    child: const Text('Kết nối'),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),

                // 2. Tab Wi-Fi
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextField(
                      controller: _ipController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Địa chỉ IP ESP32 (Mặc định AP: 192.168.4.1)',
                        labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFF19202C),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: () {
                        provider.connectWifi(_ipController.text);
                        Navigator.pop(context);
                      },
                      icon: const Icon(Icons.wifi),
                      label: const Text('Kết Nối Wi-Fi'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(45),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),

                // 3. Tab Demo
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Chọn kịch bản cabin để kiểm thử giao diện & âm thanh:',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _scenarioBtn('🍃 Bình thường (550 ppm)', () => provider.mockService.setScenario('normal')),
                        _scenarioBtn('⚠️ Bí khí / Lấy gió trong', () => provider.mockService.setScenario('recirc_buildup')),
                        _scenarioBtn('☀️ Đậu xe ngoài nắng', () => provider.mockService.setScenario('parked_sun')),
                        _scenarioBtn('🌬️ Mở cửa / Lấy gió ngoài', () => provider.mockService.setScenario('fresh_air')),
                      ],
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        provider.startMockMode();
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E676),
                        foregroundColor: Colors.black,
                        minimumSize: const Size.fromHeight(42),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Chạy Chế Độ Giả Lập'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _scenarioBtn(String label, VoidCallback onTap) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF1E2636),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text(label, style: const TextStyle(fontSize: 11)),
    );
  }
}
