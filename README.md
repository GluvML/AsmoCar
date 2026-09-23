# CAR AIR MONITOR - HỆ THỐNG GIÁM SÁT KHÔNG KHÍ CABIN Ô TÔ
> Giải pháp theo dõi nồng độ $CO_2$ (Telaire T6703 NDIR), Nhiệt độ & Độ ẩm (Sensirion SHT35) qua kết nối không dây kép **BLE** & **Wi-Fi** với mạch **ESP32**.

---

## 1. Cấu Trúc Các Phiên Bản Ứng Dụng

Dự án cung cấp đầy đủ các bản cho mọi nhu cầu:

```
car-air-monitor/
├── flutter_mobile_app/               # [MỚI] DỰ ÁN FLUTTER CHO ĐIỆN THOẠI (Android & iOS)
│   ├── pubspec.yaml                  # Cấu hình thư viện BLE, Wi-Fi, TTS tiếng Việt
│   ├── android/                      # Mã nguồn Android & AndroidManifest (quyền BLE)
│   └── lib/                          # Toàn bộ mã nguồn Flutter (Dart)
│       ├── main.dart                 # Điểm khởi chạy app
│       ├── models/sensor_data.dart   # Tính toán Heat Index, Dew Point, phân cấp CO2
│       ├── services/                 # BLE, Wi-Fi WebSocket/HTTP, Giọng nói, Giả lập
│       ├── providers/                # Quản lý trạng thái & WakeLock màn hình xe
│       ├── screens/                  # Màn hình Dashboard buồng lái & hộp thoại kết nối
│       └── widgets/                  # Đồng hồ đo CustomPainter & Thẻ gợi ý an toàn
│
├── android-app/                      # DỰ ÁN ANDROID STUDIO (Java/Gradle)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml       # Quyền Bluetooth BLE, Wi-Fi, WakeLock
│   │   ├── java/.../MainActivity.java# Chế độ Kiosk Fullscreen cho màn hình ô tô & phone
│   │   └── assets/                   # Đóng gói app chạy 100% offline trong file .apk
│
├── app/                              # BẢN WEB / PWA (Dành cho trình duyệt máy tính & xe)
│   ├── index.html                    # Mở trực tiếp hoặc qua trình duyệt ô tô
│   ├── manifest.json                 # Cài đặt PWA một chạm lên điện thoại
│   └── js/                           # Web Bluetooth & WebSocket stream
│
├── firmware/
│   └── esp32_t6703_sht35/
│       └── esp32_t6703_sht35.ino     # Code Arduino nạp cho ESP32 đọc T6703 + SHT35
│
├── server.js                         # Máy chủ Node.js phát app cho điện thoại qua Wi-Fi
└── start_app.bat                     # Nhấp đúp để bật server cho điện thoại
```

---

## 2. Hướng Dẫn Cài Đặt & Chạy Trên Điện Thoại

### Lựa chọn 1: Dùng dự án Flutter (`flutter_mobile_app/`)
Dành cho bạn nào phát triển bằng Flutter:
1. Mở thư mục `flutter_mobile_app` trong **VS Code** hoặc **Android Studio**.
2. Cài đặt các gói thư viện:
   ```bash
   flutter pub get
   ```
3. Cắm điện thoại (hoặc mở máy ảo Android) và chạy:
   ```bash
   flutter run
   ```
4. Để xuất file `.apk` cài trực tiếp lên điện thoại hoặc màn hình Android ô tô:
   ```bash
   flutter build apk --release
   ```
   File APK sẽ được tạo tại: `build/app/outputs/flutter-apk/app-release.apk`. Bạn copy file này sang điện thoại để cài đặt!

---

### Lựa chọn 2: Dùng dự án Android Studio (`android-app/`)
1. Mở phần mềm **Android Studio**.
2. Chọn **Open Project**, trỏ tới thư mục:
   `C:\Users\Lenovo\.gemini\antigravity\scratch\car-air-monitor\android-app`
3. Bấm nút **Run (Tam giác xanh)** để cài thẳng vào điện thoại cắm cáp USB.
4. Hoặc chọn menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** để lấy file `.apk`.

---

### Lựa chọn 3: Mở & Cài thành App ngay trên điện thoại (Không cần cài SDK)
1. Nhấp đúp file **`start_app.bat`** trên máy tính này.
2. Trên điện thoại, mở trình duyệt Chrome và truy cập địa chỉ hiển thị (ví dụ `http://192.168.1.89:3000`).
3. Bấm **3 chấm** > **Thêm vào màn hình chính (Add to Home screen)** để cài app.

---

## 3. Sơ Đồ Đấu Dây Mạch Cảm Biến (ESP32)

Cả **Telaire T6703** và **Sensirion SHT35** dùng chung 2 chân I2C của ESP32:

| Chân ESP32 | Chân Telaire T6703 | Chân Sensirion SHT35 | Ghi chú |
| :--- | :--- | :--- | :--- |
| **5V / VIN** | **VIN / Pin 1** | - | Cấp nguồn 5V cho cảm biến NDIR |
| **3V3** | - | **VIN** | SHT35 dùng nguồn 3.3V |
| **GND** | **GND / Pin 2** | **GND** | Nối chung mass GND |
| **GPIO 21 (SDA)** | **SDA / Pin 4** | **SDA** | Tuyến dữ liệu I2C |
| **GPIO 22 (SCL)** | **SCL / Pin 3** | **SCL** | Xung nhịp I2C |
