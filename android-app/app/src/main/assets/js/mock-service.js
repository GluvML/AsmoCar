/**
 * mock-service.js
 * Bộ giả lập dữ liệu cảm biến (ESP32 + T6703 + SHT35) cho xe ô tô
 */
class MockService {
  constructor(onDataCallback) {
    this.onData = onDataCallback;
    this.timer = null;
    this.active = false;

    // Trạng thái hiện tại
    this.co2 = 650;
    this.temp = 24.2;
    this.hum = 52.0;

    // Kịch bản tự động
    this.scenario = 'normal'; // 'normal' | 'recirc_buildup' | 'parked_sun' | 'fresh_air'
  }

  start() {
    this.active = true;
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tick();
    }, 1000);

    this.tick();
  }

  stop() {
    this.active = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setScenario(name) {
    this.scenario = name;
    if (name === 'normal') {
      this.co2 = 620;
      this.temp = 23.8;
      this.hum = 52;
    } else if (name === 'recirc_buildup') {
      this.co2 = 1100;
      this.temp = 24.5;
    } else if (name === 'parked_sun') {
      this.temp = 36.5;
      this.hum = 35;
    } else if (name === 'fresh_air') {
      this.co2 = 800;
    }
    this.tick();
  }

  setManualValues(co2, temp, hum) {
    this.scenario = 'manual';
    if (co2 !== undefined) this.co2 = Number(co2);
    if (temp !== undefined) this.temp = Number(temp);
    if (hum !== undefined) this.hum = Number(hum);
    this.tick();
  }

  tick() {
    if (!this.active) return;

    // Mô phỏng diễn biến vật lý trong xe
    if (this.scenario === 'recirc_buildup') {
      // Đóng kín xe & lấy gió trong: CO2 tăng dần do hành khách thở ra
      this.co2 = Math.min(2600, this.co2 + (Math.random() * 25 + 10));
      this.temp = Math.min(26, this.temp + 0.05);
      this.hum = Math.min(68, this.hum + 0.1);
    } else if (this.scenario === 'parked_sun') {
      // Đậu xe ngoài trời nắng: nhiệt độ tăng vọt
      this.temp = Math.min(52.0, this.temp + 0.35);
      this.hum = Math.max(25, this.hum - 0.2);
    } else if (this.scenario === 'fresh_air') {
      // Mở gió ngoài / hạ kính: CO2 hạ nhanh về mức khí quyển
      this.co2 = Math.max(430, this.co2 - (Math.random() * 50 + 20));
      this.temp = this.temp > 24 ? this.temp - 0.1 : this.temp + 0.1;
    } else if (this.scenario === 'normal') {
      // Ổn định dao động nhẹ
      this.co2 += (Math.random() - 0.5) * 6;
      this.co2 = Math.max(480, Math.min(780, this.co2));
      this.temp += (Math.random() - 0.5) * 0.1;
      this.hum += (Math.random() - 0.5) * 0.2;
    }

    // Làm tròn số
    const payload = {
      source: 'MOCK (Giả lập)',
      co2: Math.round(this.co2),
      temp: parseFloat(this.temp.toFixed(1)),
      hum: parseFloat(this.hum.toFixed(1)),
      timestamp: Date.now()
    };

    if (this.onData) {
      this.onData(payload);
    }
  }
}
