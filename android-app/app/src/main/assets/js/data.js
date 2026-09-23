// ============================================================
// DataManager - Mock Data Generator & State Management
// ============================================================

class DataManager {
    constructor() {
        this.rooms = [
            { id: 'my-car', name: 'Xe của tôi', icon: '🚗' }
        ];
        this.currentRoomId = 'my-car';
        this.sensorData = new Map();
        this.thresholds = {
            co2: { min: 400, max: 3000 },
            temp: { min: 18, max: 28 },
            humidity: { min: 40, max: 70 }
        };
        this.alerts = [];
        this.settings = {
            unit: 'C',
            updateInterval: 3000,
            voiceAlerts: true,
            alertDelayMinutes: 10 // Mặc định: Sau 10 phút ngoài vùng mới kích hoạt cảnh báo
        };
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------
    init() {
        // Restore settings
        const savedSettings = localStorage.getItem('co2app_settings');
        if (savedSettings) {
            try { this.settings = { ...this.settings, ...JSON.parse(savedSettings) }; } catch (e) { /* use defaults */ }
        }

        // Restore thresholds
        const savedThresholds = localStorage.getItem('co2app_thresholds');
        if (savedThresholds) {
            try { this.thresholds = JSON.parse(savedThresholds); } catch (e) { /* use defaults */ }
        }

        // Restore alerts
        const savedAlerts = localStorage.getItem('co2app_alerts');
        if (savedAlerts) {
            try { this.alerts = JSON.parse(savedAlerts); } catch (e) { this.alerts = []; }
        }

        // For single vehicle mode, we always force the single room 'my-car' and clear any multi-room local cache
        localStorage.removeItem('co2app_rooms');
        this.rooms = [
            { id: 'my-car', name: window.i18n.t('default_car_single'), icon: '🚗' }
        ];
        this.currentRoomId = 'my-car';

        // Generate history for the vehicle
        this.generateHistoryData('my-car', 30);
    }

    // ----------------------------------------------------------
    // History Data Generation
    // ----------------------------------------------------------
    generateHistoryData(roomId, days = 30) {
        const history = [];
        const now = Date.now();
        const interval = 15 * 60 * 1000; // 15 minutes
        const totalPoints = (days * 24 * 60) / 15;

        // Room-specific base offsets for variety
        const roomIndex = this.rooms.findIndex(r => r.id === roomId);
        const co2BaseOffset = (roomIndex % 4) * 30;        // 0, 30, 60, 90
        const tempBaseOffset = (roomIndex % 4) * 0.5 - 1;  // -1, -0.5, 0, 0.5
        const humidityBaseOffset = (roomIndex % 4) * 2 - 3; // -3, -1, 1, 3

        let prevCo2 = 500 + co2BaseOffset;
        let prevTemp = 24 + tempBaseOffset;
        let prevHumidity = 55 + humidityBaseOffset;

        for (let i = totalPoints; i >= 0; i--) {
            const timestamp = now - (i * interval);
            const date = new Date(timestamp);
            const hour = date.getHours();

            // Daily CO2 pattern: higher during midday/afternoon (people active)
            const co2DailyFactor = this._getDailyCo2Factor(hour);
            const co2Base = (450 + co2BaseOffset) + co2DailyFactor * 200;
            prevCo2 = this._randomWalk(prevCo2, co2Base, 15, 300, 1500);

            // Occasional CO2 spikes (cooking, many people, etc.)
            if (Math.random() < 0.005) {
                prevCo2 = Math.min(prevCo2 + 200 + Math.random() * 300, 2000);
            }

            // Daily Temp pattern: warmer in afternoon
            const tempDailyFactor = this._getDailyTempFactor(hour);
            const tempBase = (23 + tempBaseOffset) + tempDailyFactor * 3;
            prevTemp = this._randomWalk(prevTemp, tempBase, 0.3, 15, 40);

            // Humidity: somewhat inverse to temperature
            const humidityDailyFactor = 1 - tempDailyFactor * 0.3;
            const humidityBase = (55 + humidityBaseOffset) * humidityDailyFactor;
            prevHumidity = this._randomWalk(prevHumidity, humidityBase, 1.5, 20, 95);

            history.push({
                co2: Math.round(prevCo2),
                temp: Math.round(prevTemp * 10) / 10,
                humidity: Math.round(prevHumidity * 10) / 10,
                timestamp
            });
        }

        // Set current reading as the last history point
        const current = history[history.length - 1];

        this.sensorData.set(roomId, { current: { ...current }, history });
    }

    // Daily CO2 factor: 0 at night, peaks ~0.8-1.0 midday
    _getDailyCo2Factor(hour) {
        if (hour >= 0 && hour < 6) return 0.1 + Math.random() * 0.05;
        if (hour >= 6 && hour < 9) return 0.3 + (hour - 6) * 0.15;
        if (hour >= 9 && hour < 12) return 0.7 + (hour - 9) * 0.1;
        if (hour >= 12 && hour < 14) return 1.0; // peak at lunch
        if (hour >= 14 && hour < 18) return 0.8 - (hour - 14) * 0.05;
        if (hour >= 18 && hour < 21) return 0.6 + (hour - 18) * 0.05; // evening activity
        return 0.3 - (hour - 21) * 0.07;
    }

    // Daily Temp factor: 0 at night, peaks ~1.0 at 14:00-16:00
    _getDailyTempFactor(hour) {
        if (hour >= 0 && hour < 6) return 0.0;
        if (hour >= 6 && hour < 10) return (hour - 6) * 0.15;
        if (hour >= 10 && hour < 14) return 0.6 + (hour - 10) * 0.1;
        if (hour >= 14 && hour < 17) return 1.0;
        if (hour >= 17 && hour < 21) return 1.0 - (hour - 17) * 0.2;
        return 0.2 - (hour - 21) * 0.07;
    }

    // Random walk towards a base value
    _randomWalk(current, base, stepSize, min, max) {
        const pull = (base - current) * 0.05; // mean reversion
        const noise = (Math.random() - 0.5) * 2 * stepSize;
        let next = current + pull + noise;
        return Math.max(min, Math.min(max, next));
    }

    // ----------------------------------------------------------
    // Live Reading Generation
    // ----------------------------------------------------------
    generateReading(roomId) {
        const rid = roomId || this.currentRoomId;
        const data = this.sensorData.get(rid);
        if (!data) return null;

        const prev = data.current;
        const now = Date.now();
        const hour = new Date(now).getHours();

        // Small random walk from previous
        let co2 = this._randomWalk(prev.co2, 450 + this._getDailyCo2Factor(hour) * 200, 15, 300, 2000);
        let temp = this._randomWalk(prev.temp, 23 + this._getDailyTempFactor(hour) * 3, 0.3, 15, 40);
        let humidity = this._randomWalk(prev.humidity, 55, 1.5, 20, 95);

        // 5% chance of spike
        if (Math.random() < 0.05) {
            const spikeType = Math.floor(Math.random() * 3);
            if (spikeType === 0) co2 = Math.min(co2 + 150 + Math.random() * 200, 2500);
            else if (spikeType === 1) temp = Math.min(temp + 2 + Math.random() * 3, 42);
            else humidity = Math.min(humidity + 8 + Math.random() * 10, 98);
        }

        const reading = {
            co2: Math.round(co2),
            temp: Math.round(temp * 10) / 10,
            humidity: Math.round(humidity * 10) / 10,
            timestamp: now
        };

        data.current = { ...reading };
        data.history.push(reading);

        // Keep history to max ~30 days (2880 points/day × 30 = 86400)
        if (data.history.length > 90000) {
            data.history = data.history.slice(-86400);
        }

        return reading;
    }

    setHardwareReading(co2, temp, humidity, roomId) {
        const rid = roomId || this.currentRoomId;
        const data = this.sensorData.get(rid);
        if (!data) return null;

        const now = Date.now();
        const reading = {
            co2: Math.round(Number(co2) || 450),
            temp: Math.round((Number(temp) || 25.0) * 10) / 10,
            humidity: Math.round((Number(humidity) || 50.0) * 10) / 10,
            timestamp: now
        };

        data.current = { ...reading };
        data.history.push(reading);

        if (data.history.length > 90000) {
            data.history = data.history.slice(-86400);
        }

        return reading;
    }

    // ----------------------------------------------------------
    // Data Access
    // ----------------------------------------------------------
    getCurrentData(roomId) {
        const rid = roomId || this.currentRoomId;
        const data = this.sensorData.get(rid);
        return data ? data.current : null;
    }

    getHistory(roomId, timeRange = '24h') {
        const rid = roomId || this.currentRoomId;
        const data = this.sensorData.get(rid);
        if (!data) return [];

        const now = Date.now();
        let cutoff;
        switch (timeRange) {
            case '24h': cutoff = now - 24 * 60 * 60 * 1000; break;
            case '7d':  cutoff = now - 7 * 24 * 60 * 60 * 1000; break;
            case '30d': cutoff = now - 30 * 24 * 60 * 60 * 1000; break;
            default:    cutoff = now - 24 * 60 * 60 * 1000;
        }

        return data.history.filter(d => d.timestamp >= cutoff);
    }

    // ----------------------------------------------------------
    // Thresholds
    // ----------------------------------------------------------
    getThresholds() {
        return { ...this.thresholds };
    }

    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        localStorage.setItem('co2app_thresholds', JSON.stringify(this.thresholds));
    }

    checkThresholds(reading) {
        const violations = [];
        const t = this.thresholds;

        if (reading.co2 > t.co2.max) {
            violations.push({ type: 'co2', value: reading.co2, threshold: t.co2.max, direction: 'above' });
        } else if (reading.co2 < t.co2.min) {
            violations.push({ type: 'co2', value: reading.co2, threshold: t.co2.min, direction: 'below' });
        }
        if (reading.temp > t.temp.max) {
            violations.push({ type: 'temp', value: reading.temp, threshold: t.temp.max, direction: 'above' });
        }
        if (reading.temp < t.temp.min) {
            violations.push({ type: 'temp', value: reading.temp, threshold: t.temp.min, direction: 'below' });
        }
        if (reading.humidity > t.humidity.max) {
            violations.push({ type: 'humidity', value: reading.humidity, threshold: t.humidity.max, direction: 'above' });
        }
        if (reading.humidity < t.humidity.min) {
            violations.push({ type: 'humidity', value: reading.humidity, threshold: t.humidity.min, direction: 'below' });
        }

        return violations;
    }

    // ----------------------------------------------------------
    // Alerts
    // ----------------------------------------------------------
    addAlert(alert) {
        this.alerts.unshift(alert);
        // Keep max 200 alerts
        if (this.alerts.length > 200) {
            this.alerts = this.alerts.slice(0, 200);
        }
        localStorage.setItem('co2app_alerts', JSON.stringify(this.alerts));
    }

    getAlerts() {
        return [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
    }

    markAlertRead(id) {
        const alert = this.alerts.find(a => a.id === id);
        if (alert) {
            alert.read = true;
            localStorage.setItem('co2app_alerts', JSON.stringify(this.alerts));
        }
    }

    clearAlert(id) {
        this.alerts = this.alerts.filter(a => a.id !== id);
        localStorage.setItem('co2app_alerts', JSON.stringify(this.alerts));
    }

    clearAllAlerts() {
        this.alerts = [];
        localStorage.setItem('co2app_alerts', JSON.stringify(this.alerts));
    }

    getUnreadAlertCount() {
        return this.alerts.filter(a => !a.read).length;
    }

    // ----------------------------------------------------------
    // Rooms
    // ----------------------------------------------------------
    getRooms() {
        return [...this.rooms];
    }

    addRoom(name) {
        return null;
    }

    removeRoom(id) {
        return false;
    }

    renameRoom(id, name) {
    }

    setCurrentRoom(id) {
        this.currentRoomId = 'my-car';
    }

    // ----------------------------------------------------------
    // Settings
    // ----------------------------------------------------------
    getSettings() {
        return { ...this.settings };
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('co2app_settings', JSON.stringify(this.settings));
    }

    // ----------------------------------------------------------
    // Stats & Status
    // ----------------------------------------------------------
    getStats(roomId, timeRange = '24h') {
        const history = this.getHistory(roomId, timeRange);
        if (history.length === 0) {
            return {
                co2:      { min: 0, max: 0, avg: 0 },
                temp:     { min: 0, max: 0, avg: 0 },
                humidity: { min: 0, max: 0, avg: 0 }
            };
        }

        const calc = (arr, key) => {
            const values = arr.map(d => d[key]);
            return {
                min: Math.round(Math.min(...values) * 10) / 10,
                max: Math.round(Math.max(...values) * 10) / 10,
                avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
            };
        };

        return {
            co2: calc(history, 'co2'),
            temp: calc(history, 'temp'),
            humidity: calc(history, 'humidity')
        };
    }

    getStatus(reading) {
        if (!reading) return 'good';
        const t = this.thresholds;

        // Check for danger first (exceeds thresholds)
        if (reading.co2 > t.co2.max) return 'danger';
        if (reading.temp > t.temp.max + 3 || reading.temp < t.temp.min - 3) return 'danger';
        if (reading.humidity > t.humidity.max + 10 || reading.humidity < t.humidity.min - 10) return 'danger';

        // Check for warning (exceeds thresholds)
        if (reading.co2 > 1000) return 'warning';
        if (reading.temp > t.temp.max || reading.temp < t.temp.min) return 'warning';
        if (reading.humidity > t.humidity.max || reading.humidity < t.humidity.min) return 'warning';

        return 'good';
    }

    // Get daily averages for a date range (for reports)
    getDailyAverages(roomId, startDate, endDate) {
        const rid = roomId || this.currentRoomId;
        const data = this.sensorData.get(rid);
        if (!data) return [];

        const start = new Date(startDate).setHours(0, 0, 0, 0);
        const end = new Date(endDate).setHours(23, 59, 59, 999);

        const filtered = data.history.filter(d => d.timestamp >= start && d.timestamp <= end);

        // Group by day
        const days = new Map();
        filtered.forEach(d => {
            const dayKey = new Date(d.timestamp).toISOString().split('T')[0];
            if (!days.has(dayKey)) days.set(dayKey, []);
            days.get(dayKey).push(d);
        });

        const result = [];
        days.forEach((points, dayKey) => {
            const calc = (key) => {
                const vals = points.map(p => p[key]);
                return {
                    min: Math.round(Math.min(...vals) * 10) / 10,
                    max: Math.round(Math.max(...vals) * 10) / 10,
                    avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
                };
            };
            result.push({
                date: dayKey,
                co2: calc('co2'),
                temp: calc('temp'),
                humidity: calc('humidity')
            });
        });

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }
}

window.DataManager = new DataManager();
