import 'package:flutter/material.dart';
import '../models/sensor_data.dart';

class CarTipsWidget extends StatelessWidget {
  final SensorData data;

  const CarTipsWidget({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final bool isRecircWarn = data.co2 >= 1200;
    final bool isHumHigh = data.humidity >= 75;
    final bool isTempHigh = data.temperature >= 38;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131822),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF232C3D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.assistant_outlined, color: Color(0xFF00E5FF), size: 18),
              SizedBox(width: 8),
              Text(
                'TRỢ LÝ BUỒNG LÁI THÔNG MINH',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildTipItem(
            icon: Icons.sync,
            title: isRecircWarn ? 'Chuyển sang: LẤY GIÓ NGOÀI (Fresh Air)' : 'Chế độ gió: TỰ ĐỘNG / GIÓ TRONG',
            desc: isRecircWarn
                ? 'CO2 hiện tại ${data.co2} ppm gây buồn ngủ. Hãy cấp thêm khí tươi ngay!'
                : 'Không khí lưu thông tốt, duy trì làm mát hiệu quả.',
            isWarning: isRecircWarn,
          ),
          const SizedBox(height: 10),
          _buildTipItem(
            icon: Icons.ac_unit,
            title: isHumHigh ? 'Bật sấy kính / A/C hút ẩm' : 'Điều hòa & Độ ẩm ổn định',
            desc: isHumHigh
                ? 'Độ ẩm ${data.humidity.toStringAsFixed(0)}% dễ làm mờ kính lái ban đêm hoặc khi trời mưa.'
                : 'Độ ẩm và nhiệt độ ở dải thoải mái lý tưởng.',
            isWarning: isHumHigh,
          ),
          const SizedBox(height: 10),
          _buildTipItem(
            icon: Icons.warning_amber_rounded,
            title: isTempHigh ? 'CẢNH BÁO SỐC NHIỆT CABIN' : 'An toàn hành khách & Thiết bị',
            desc: isTempHigh
                ? 'Tuyệt đối không để trẻ nhỏ, thú cưng hoặc pin dự phòng trên xe!'
                : 'Khoang xe đạt nhiệt độ an toàn, không có nguy cơ sốc nhiệt.',
            isWarning: isTempHigh,
          ),
        ],
      ),
    );
  }

  Widget _buildTipItem({
    required IconData icon,
    required String title,
    required String desc,
    required bool isWarning,
  }) {
    final bgColor = isWarning ? const Color(0xFFFFAB00).withOpacity(0.08) : const Color(0xFF19202C);
    final borderColor = isWarning ? const Color(0xFFFFAB00).withOpacity(0.4) : const Color(0xFF232C3D);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF232D3D),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: isWarning ? const Color(0xFFFFAB00) : const Color(0xFF00E5FF)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isWarning ? const Color(0xFFFFAB00) : Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
