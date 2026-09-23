/**
 * ble-service.js
 * Kết nối ESP32 qua Web Bluetooth API (BLE GATT)
 */
class BleService {
  constructor(onDataCallback, onStatusChangeCallback) {
    this.onData = onDataCallback;
    this.onStatusChange = onStatusChangeCallback;

    this.device = null;
    this.server = null;
    this.characteristic = null;

    // UUID chuẩn khớp với Firmware ESP32
    this.SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
    this.CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  }

  isSupported() {
    return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API. Hãy sử dụng Chrome, Edge (trên Windows/Android) hoặc trình duyệt Bluefy (trên iOS).');
    }

    try {
      this.notifyStatus('connecting', 'Đang quét thiết bị BLE...');

      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'CarAir' },
          { services: [this.SERVICE_UUID] }
        ],
        optionalServices: [this.SERVICE_UUID]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.notifyStatus('disconnected', 'Đã ngắt kết nối BLE');
      });

      this.notifyStatus('connecting', `Đang kết nối tới ${this.device.name || 'ESP32'}...`);
      this.server = await this.device.gatt.connect();

      const service = await this.server.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = await service.getCharacteristic(this.CHAR_UUID);

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', (e) => {
        this.handleData(e.target.value);
      });

      this.notifyStatus('connected', `Đã kết nối BLE: ${this.device.name}`);
      return true;
    } catch (err) {
      this.notifyStatus('disconnected', `Lỗi kết nối: ${err.message}`);
      throw err;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.notifyStatus('disconnected', 'Đã ngắt kết nối');
  }

  handleData(dataView) {
    try {
      const decoder = new TextDecoder('utf-8');
      const jsonStr = decoder.decode(dataView);
      const data = JSON.parse(jsonStr);

      if (this.onData) {
        this.onData({
          source: 'BLE (Bluetooth)',
          co2: Number(data.co2),
          temp: Number(data.temp),
          hum: Number(data.hum),
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.warn('Lỗi giải mã gói tin BLE:', err);
    }
  }

  notifyStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }
}
