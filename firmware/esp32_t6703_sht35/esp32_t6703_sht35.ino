/**
 * ==============================================================================
 * DỰ ÁN: GIÁM SÁT KHÔNG KHÍ CABIN Ô TÔ (ESP32 + T6703 + SHT35)
 * ==============================================================================
 * Phần cứng:
 * 1. Vi điều khiển: ESP32 Dev Module (WROOM-32)
 * 2. Cảm biến CO2: Telaire T6703 NDIR (I2C: 0x15)
 * 3. Cảm biến Nhiệt độ / Độ ẩm: Sensirion SHT35 (I2C: 0x44)
 * 
 * SƠ ĐỒ ĐẤU DÂY (ESP32 I2C):
 * ------------------------------------------------------------------
 * ESP32 Pin        Telaire T6703 Pin        Sensirion SHT35 Pin
 * ------------------------------------------------------------------
 * 3V3 / 5V         VCC / VIN                VIN (3.3V)
 * GND              GND                      GND
 * GPIO 21 (SDA)    SDA                      SDA
 * GPIO 22 (SCL)    SCL                      SCL
 * ------------------------------------------------------------------
 * (Lưu ý: T6703 khuyên dùng nguồn 5V ổn định hoặc 3.3V tùy phiên bản module,
 *  chân SDA/SCL chung bus I2C kéo lên 3.3V bằng trở 4.7k nếu module chưa tích hợp)
 * 
 * Thư viện cần cài trong Arduino IDE:
 * - ArduinoJson (by Benoit Blanchon)
 * - WebSockets (by Markus Sattler) [Tùy chọn cho WebSocket port 81]
 * ==============================================================================
 */

#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- CẤU HÌNH ĐỊA CHỈ I2C ---
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define SHT35_ADDR  0x44
#define T6703_ADDR  0x15

// --- CẤU HÌNH WI-FI ACCESS POINT NỘI BỘ TRÊN XE ---
const char* AP_SSID = "CarAir_ESP32";
const char* AP_PASS = "12345678"; // Mật khẩu tối thiểu 8 ký tự

// --- CẤU HÌNH BLE GATT ---
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// WebServer phục vụ API REST HTTP
WebServer server(80);

// Biến lưu trữ số liệu cảm biến
float currentTemp = 25.0;
float currentHum = 50.0;
int currentCo2 = 450;
unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 1500; // Đọc cảm biến mỗi 1.5 giây

// --- BLE CALLBACKS ---
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println(">>> [BLE] Khách đã kết nối!");
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println(">>> [BLE] Khách đã ngắt kết nối!");
  }
};

// ==============================================================================
// 1. ĐỌC CẢM BIẾN SENSIRION SHT35 (I2C)
// ==============================================================================
bool readSHT35(float &temp, float &hum) {
  Wire.beginTransmission(SHT35_ADDR);
  Wire.write(0x24); // High repeatability, clock stretching disabled
  Wire.write(0x00);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  delay(16); // Đợi phép đo hoàn tất (~15ms)

  Wire.requestFrom((uint8_t)SHT35_ADDR, (uint8_t)6);
  if (Wire.available() == 6) {
    uint8_t data[6];
    for (int i = 0; i < 6; i++) {
      data[i] = Wire.read();
    }

    uint16_t rawTemp = (data[0] << 8) | data[1];
    uint16_t rawHum  = (data[3] << 8) | data[4];

    temp = -45.0 + (175.0 * ((float)rawTemp / 65535.0));
    hum  = 100.0 * ((float)rawHum / 65535.0);
    return true;
  }
  return false;
}

// ==============================================================================
// 2. ĐỌC CẢM BIẾN CO2 TELAIRE T6703 (I2C Modbus Protocol)
// ==============================================================================
bool readT6703(int &co2) {
  // Chuỗi lệnh Modbus I2C đọc thanh ghi khí 5003 (0x138B):
  // 0x04: Read Input Registers, 0x13, 0x8B: Register Address, 0x00, 0x01: 1 Word
  uint8_t cmd[5] = {0x04, 0x13, 0x8B, 0x00, 0x01};

  Wire.beginTransmission(T6703_ADDR);
  Wire.write(cmd, 5);
  if (Wire.endTransmission() != 0) {
    return false;
  }

  delay(20); // Đợi T6703 chuẩn bị dữ liệu

  Wire.requestFrom((uint8_t)T6703_ADDR, (uint8_t)4);
  if (Wire.available() == 4) {
    uint8_t resp[4];
    for (int i = 0; i < 4; i++) {
      resp[i] = Wire.read();
    }

    // resp[0] = Function code (0x04)
    // resp[1] = Byte count (0x02)
    // resp[2] = MSB của Gas PPM
    // resp[3] = LSB của Gas PPM
    if (resp[0] == 0x04 && resp[1] == 0x02) {
      co2 = (resp[2] << 8) | resp[3];
      return true;
    }
  }
  return false;
}

// ==============================================================================
// 3. TẠO JSON PAYLOAD VÀ XỬ LÝ HTTP API
// ==============================================================================
String getJsonPayload() {
  String json = "{";
  json += "\"co2\":" + String(currentCo2) + ",";
  json += "\"temp\":" + String(currentTemp, 1) + ",";
  json += "\"hum\":" + String(currentHum, 1) + ",";
  json += "\"status\":\"OK\"";
  json += "}";
  return json;
}

void handleHttpData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", getJsonPayload());
}

void handleRoot() {
  server.send(200, "text/plain", "Car Air Monitor ESP32 Server is running! Endpoint: /data");
}

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n--- KHỞI ĐỘNG HỆ THỐNG GIÁM SÁT KHÔNG KHÍ XE Ô TÔ ---");

  // Khởi tạo bus I2C
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 100000); // 100kHz I2C clock

  // 1. Cấu hình Wi-Fi SoftAP
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress IP = WiFi.softAPIP();
  Serial.print(">>> [Wi-Fi] Phát AP thành công: ");
  Serial.println(AP_SSID);
  Serial.print(">>> [Wi-Fi] Địa chỉ IP máy chủ: ");
  Serial.println(IP);

  // Cấu hình HTTP Server
  server.on("/", handleRoot);
  server.on("/data", handleHttpData);
  server.begin();
  Serial.println(">>> [HTTP] WebServer cổng 80 đã sẵn sàng.");

  // 2. Cấu hình Bluetooth Low Energy (BLE)
  BLEDevice::init("CarAir_ESP32");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  pCharacteristic->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println(">>> [BLE] Đang phát quảng bá Bluetooth: CarAir_ESP32");
}

// ==============================================================================
// LOOP CHÍNH
// ==============================================================================
void loop() {
  // Xử lý các yêu cầu HTTP Web Server
  server.handleClient();

  // Đọc dữ liệu cảm biến định kỳ
  unsigned long now = millis();
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    float t = 0.0, h = 0.0;
    int co2Val = 0;

    // Đọc SHT35
    if (readSHT35(t, h)) {
      currentTemp = t;
      currentHum  = h;
    } else {
      Serial.println("[CẢNH BÁO] Không đọc được cảm biến SHT35!");
    }

    // Đọc T6703
    if (readT6703(co2Val)) {
      currentCo2 = co2Val;
    } else {
      Serial.println("[CẢNH BÁO] Không đọc được cảm biến T6703!");
    }

    String payload = getJsonPayload();
    Serial.print(">>> Cảm biến: ");
    Serial.println(payload);

    // Phát thông báo qua BLE nếu có thiết bị kết nối
    if (deviceConnected && pCharacteristic != NULL) {
      pCharacteristic->setValue(payload.c_str());
      pCharacteristic->notify();
    }
  }

  // Quản lý trạng thái kết nối lại của BLE Advertising
  if (!deviceConnected && oldDeviceConnected) {
    delay(500); // Cho BLE stack ổn định
    pServer->startAdvertising();
    Serial.println(">>> [BLE] Bắt đầu phát lại quảng bá...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
