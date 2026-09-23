/**
 * wifi-service.js
 * Kết nối ESP32 qua Wi-Fi (WebSocket & HTTP REST fallback)
 */
class WifiService {
  constructor(onDataCallback, onStatusChangeCallback) {
    this.onData = onDataCallback;
    this.onStatusChange = onStatusChangeCallback;

    this.ws = null;
    this.pollInterval = null;
    this.currentIp = '192.168.4.1';
    this.isConnected = false;
    this.manualDisconnect = false;
  }

  connect(ip = '192.168.4.1') {
    this.currentIp = ip.trim();
    this.manualDisconnect = false;
    this.notifyStatus('connecting', `Đang kết nối Wi-Fi tới ${this.currentIp}...`);

    // Thử kết nối WebSocket trước (tốc độ cao, độ trễ thấp)
    try {
      if (this.ws) {
        this.ws.close();
      }

      const wsUrl = `ws://${this.currentIp}:81/`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus('connected', `Đã kết nối Wi-Fi WebSocket: ${this.currentIp}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onData) {
            this.onData({
              source: 'Wi-Fi (WebSocket)',
              co2: Number(data.co2),
              temp: Number(data.temp),
              hum: Number(data.hum),
              timestamp: Date.now()
            });
          }
        } catch (e) {
          console.warn('Lỗi phân tích cú pháp WebSocket JSON:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket lỗi, chuyển sang cơ chế HTTP Polling...', err);
        this.fallbackHttpPolling();
      };

      this.ws.onclose = () => {
        if (!this.manualDisconnect && this.isConnected) {
          this.notifyStatus('connecting', 'Mất kết nối WebSocket, đang thử lại...');
          setTimeout(() => this.connect(this.currentIp), 3000);
        }
      };
    } catch (e) {
      this.fallbackHttpPolling();
    }
  }

  fallbackHttpPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const fetchOnce = async () => {
      if (this.manualDisconnect) return;
      try {
        const response = await fetch(`http://${this.currentIp}/data`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        this.isConnected = true;
        this.notifyStatus('connected', `Đã kết nối Wi-Fi HTTP: ${this.currentIp}`);

        if (this.onData) {
          this.onData({
            source: 'Wi-Fi (HTTP)',
            co2: Number(data.co2),
            temp: Number(data.temp),
            hum: Number(data.hum),
            timestamp: Date.now()
          });
        }
      } catch (err) {
        this.isConnected = false;
        this.notifyStatus('disconnected', `Không thể kết nối Wi-Fi ${this.currentIp}`);
      }
    };

    fetchOnce();
    this.pollInterval = setInterval(fetchOnce, 1500);
  }

  disconnect() {
    this.manualDisconnect = true;
    this.isConnected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.notifyStatus('disconnected', 'Đã ngắt kết nối Wi-Fi');
  }

  notifyStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange(state, message);
    }
  }
}
