import 'dart:math';
import 'package:flutter/material.dart';

class GaugeWidget extends StatelessWidget {
  final String title;
  final String sensorModel;
  final String value;
  final String unit;
  final String statusText;
  final Color accentColor;
  final double progress; // 0.0 to 1.0
  final Widget? footer;
  final List<double>? history;

  const GaugeWidget({
    super.key,
    required this.title,
    required this.sensorModel,
    required this.value,
    required this.unit,
    required this.statusText,
    required this.accentColor,
    required this.progress,
    this.footer,
    this.history,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131822),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF232C3D)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF00E5FF).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  sensorModel,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00E5FF),
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: 170,
            height: 150,
            child: Stack(
              children: [
                if (history != null && history!.isNotEmpty)
                  Positioned(
                    bottom: 0,
                    left: 20,
                    right: 20,
                    height: 50,
                    child: CustomPaint(
                      painter: _SparklinePainter(
                        data: history!,
                        color: accentColor.withOpacity(0.3),
                      ),
                    ),
                  ),
                CustomPaint(
                  painter: _GaugePainter(
                    progress: progress.clamp(0.0, 1.0),
                    accentColor: accentColor,
                  ),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          value,
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: accentColor,
                            fontFamily: 'monospace',
                            letterSpacing: -1,
                          ),
                        ),
                        Text(
                          unit,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: accentColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            statusText,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: accentColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (footer != null) ...[
            const Divider(color: Color(0xFF1E2636), height: 16),
            footer!,
          ],
        ],
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<double> data;
  final Color color;

  _SparklinePainter({required this.data, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    if (data.length < 2) return;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeJoin = StrokeJoin.round;

    final maxVal = data.reduce(max);
    final minVal = data.reduce(min);
    final range = maxVal - minVal == 0 ? 1 : maxVal - minVal;

    final path = Path();
    final dx = size.width / (data.length - 1);

    for (int i = 0; i < data.length; i++) {
      final x = i * dx;
      final y = size.height - ((data[i] - minVal) / range) * size.height;
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) => true;
}

class _GaugePainter extends CustomPainter {
  final double progress;
  final Color accentColor;

  _GaugePainter({required this.progress, required this.accentColor});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 + 10);
    final radius = min(size.width / 2, size.height / 2) - 8;

    const startAngle = 135 * (pi / 180);
    const sweepTotal = 270 * (pi / 180);

    final bgPaint = Paint()
      ..color = const Color(0xFF1E2636)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepTotal,
      false,
      bgPaint,
    );

    final activePaint = Paint()
      ..color = accentColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepTotal * progress,
      false,
      activePaint,
    );
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.accentColor != accentColor;
}
