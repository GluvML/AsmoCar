/**
 * hardware-bridge.js
 * Cầu nối giao tiếp phần cứng ESP32 (Telaire T6703 + Sensirion SHT35) cho AtmoCar
 */

class HardwareBridge {
    constructor() {
        this.SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
        this.CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

        this.bleDevice = null;
        this.bleServer = null;
        this.bleChar = null;

        this.ws = null;
        this.pollTimer = null;
        this.connectedSource = null; // 'BLE' | 'WIFI' | null
    }

    isBleSupported() {
        return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
    }

    async connectBle() {
        if (!this.isBleSupported()) {
            throw new Error('Trình duyệt không hỗ trợ Web Bluetooth. Hãy dùng Chrome hoặc Edge trên Android/PC.');
        }

        const device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'CarAir' },
                { services: [this.SERVICE_UUID] }
            ],
            optionalServices: [this.SERVICE_UUID]
        });

        device.addEventListener('gattserverdisconnected', () => {
            this.connectedSource = null;
            if (window.App && window.App._instance) {
                window.App._instance.isHardwareActive = false;
                window.App._instance.updateConnectionStatus(false);
            }
            if (window.AlertManager) {
                window.AlertManager.showToast('Đã ngắt kết nối Bluetooth', 'info');
            }
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(this.SERVICE_UUID);
        const characteristic = await service.getCharacteristic(this.CHAR_UUID);

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (e) => {
            this._handleData(e.target.value, 'BLE');
        });

        this.bleDevice = device;
        this.bleServer = server;
        this.bleChar = characteristic;
        this.connectedSource = 'BLE';

        return device.name || 'CarAir_ESP32';
    }

    connectWifi(ip = '192.168.4.1') {
        this.disconnect();
        const targetIp = ip.trim() || '192.168.4.1';

        try {
            this.ws = new WebSocket(`ws://${targetIp}:81/`);
            this.ws.onopen = () => {
                this.connectedSource = 'WIFI';
                if (window.App && window.App._instance) {
                    window.App._instance.isHardwareActive = true;
                    window.App._instance.updateConnectionStatus(true);
                }
                if (window.AlertManager) {
                    window.AlertManager.showToast(`Đã kết nối Wi-Fi: ${targetIp}`, 'success');
                }
            };
            this.ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (window.App && window.App._instance) {
                        window.App._instance.onHardwareData(data.co2, data.temp, data.hum, 'Wi-Fi');
                    }
                } catch (_) {}
            };
            this.ws.onerror = () => {
                this._fallbackHttp(targetIp);
            };
        } catch (_) {
            this._fallbackHttp(targetIp);
        }
    }

    _fallbackHttp(ip) {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            try {
                const res = await fetch(`http://${ip}/data`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    this.connectedSource = 'WIFI';
                    if (window.App && window.App._instance) {
                        window.App._instance.onHardwareData(data.co2, data.temp, data.hum, 'Wi-Fi');
                        window.App._instance.updateConnectionStatus(true);
                    }
                }
            } catch (_) {}
        }, 2000);
    }

    disconnect() {
        if (this.bleDevice && this.bleDevice.gatt.connected) {
            this.bleDevice.gatt.disconnect();
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.connectedSource = null;
        if (window.App && window.App._instance) {
            window.App._instance.isHardwareActive = false;
            window.App._instance.updateConnectionStatus(false);
        }
    }

    _handleData(dataView, source) {
        try {
            const decoder = new TextDecoder('utf-8');
            const jsonStr = decoder.decode(dataView);
            const data = JSON.parse(jsonStr);

            if (window.App && window.App._instance) {
                window.App._instance.onHardwareData(data.co2, data.temp, data.hum, source);
            }
        } catch (err) {
            console.warn('Lỗi đọc dữ liệu BLE:', err);
        }
    }
}

window.HardwareBridge = new HardwareBridge();
