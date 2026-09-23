import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/air_monitor_provider.dart';
import '../widgets/gauge_widget.dart';
import '../widgets/car_tips_widget.dart';
import 'connection_sheet.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AirMonitorProvider>();
    final data = provider.currentData;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0D14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131822),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ATMOCAR COCKPIT',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: Color(0xFF00E5FF),
                letterSpacing: 0.5,
              ),
            ),
            Text(
              'ESP32 • T6703 • SHT35',
              style: TextStyle(fontSize: 10, color: Colors.grey[400], letterSpacing: 1),
            ),
          ],
        ),
        actions: [
          // Nút bật/tắt âm thanh
          IconButton(
            icon: Icon(
              provider.ttsService.enabled ? Icons.volume_up : Icons.volume_off,
              color: provider.ttsService.enabled ? const Color(0xFF00E5FF) : Colors.grey,
            ),
            onPressed: () => provider.toggleSound(),
          ),
          // Nút kết nối
          IconButton(
            icon: const Icon(Icons.tune, color: Color(0xFF00E5FF)),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => const ConnectionSheet(),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Status bar
            GestureDetector(
              onTap: () {
                showModalBottomSheet(
                  context: context,
                  backgroundColor: Colors.transparent,
                  builder: (_) => const ConnectionSheet(),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF131822),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF232C3D)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: provider.isConnected ? const Color(0xFF00E676) : const Color(0xFFFFAB00),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      provider.connectionStatus,
                      style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Banner cảnh báo an toàn
            _buildAlertBanner(data),
            const SizedBox(height: 16),

            // 1. Đồng hồ CO2 (Telaire T6703)
            GaugeWidget(
              title: 'Nồng độ CO₂ Trong Cabin',
              sensorModel: 'Telaire T6703 NDIR',
              value: data.co2.toString(),
              unit: 'PPM',
              statusText: data.co2StatusText,
              accentColor: data.co2Color,
              progress: (data.co2 - 400) / (2500 - 400),
              footer: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Text('Thấp nhất: ${provider.minCo2} ppm',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  Text('Cao nhất: ${provider.maxCo2} ppm',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 2. Đồng hồ Nhiệt độ (SHT35)
            GaugeWidget(
              title: 'Nhiệt Độ Cabin',
              sensorModel: 'Sensirion SHT35',
              value: data.temperature.toStringAsFixed(1),
              unit: '°C',
              statusText: data.temperature > 35 ? 'Rất nóng' : 'Dễ chịu',
              accentColor: data.temperature > 35 ? const Color(0xFFFF3D71) : const Color(0xFF00E5FF),
              progress: (data.temperature - 15) / (50 - 15),
              footer: Text(
                'Chỉ số nhiệt (Heat Index): ${data.heatIndex.toStringAsFixed(1)}°C',
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
            ),
            const SizedBox(height: 14),

            // 3. Đồng hồ Độ ẩm (SHT35)
            GaugeWidget(
              title: 'Độ Ẩm Tương Đối',
              sensorModel: 'Sensirion SHT35',
              value: data.humidity.toStringAsFixed(0),
              unit: '% RH',
              statusText: data.humidity > 75 ? 'Nguy cơ mờ kính' : 'Cân bằng',
              accentColor: const Color(0xFF38BDF8),
              progress: data.humidity / 100,
              footer: Text(
                'Điểm sương (Dew Point): ${data.dewPoint.toStringAsFixed(1)}°C',
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
            ),
            const SizedBox(height: 16),

            // Trợ lý thông minh
            CarTipsWidget(data: data),
          ],
        ),
      ),
    );
  }

  Widget _buildAlertBanner(dynamic data) {
    if (data.co2 >= 1800) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFF3D71).withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFF3D71)),
        ),
        child: const Row(
          children: [
            Text('🚨', style: TextStyle(fontSize: 24)),
            SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CẢNH BÁO NGUY CẤP: CO2 QUÁ CAO',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFF3D71), fontSize: 12)),
                  Text('Hạ kính hoặc bật chế độ lấy gió ngoài ngay!',
                      style: TextStyle(color: Colors.white, fontSize: 11)),
                ],
              ),
            )
          ],
        ),
      );
    } else if (data.co2 >= 1200) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFAB00).withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFFAB00)),
        ),
        child: const Row(
          children: [
            Text('⚠️', style: TextStyle(fontSize: 24)),
            SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CHÚ Ý: CABIN BẮT ĐẦU BÍ KHÍ',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFFFAB00), fontSize: 12)),
                  Text('Đề xuất chuyển sang lấy gió ngoài trong 5 phút.',
                      style: TextStyle(color: Colors.white, fontSize: 11)),
                ],
              ),
            )
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF00E676).withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF00E676).withOpacity(0.3)),
      ),
      child: const Row(
        children: [
          Text('🍃', style: TextStyle(fontSize: 24)),
          SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('KHÔNG KHÍ CABIN AN TOÀN',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF00E676), fontSize: 12)),
                Text('Khoang xe thoáng mát, nồng độ oxy tối ưu.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
