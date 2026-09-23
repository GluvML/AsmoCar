// ============================================================
// SettingsManager - Settings UI & Room Management
// ============================================================

class SettingsManager {
    constructor() {
        this._bound = false;
    }

    // ----------------------------------------------------------
    // Render Settings Screen
    // ----------------------------------------------------------
    renderSettings() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        const thresholds = window.DataManager.getThresholds();
        const settings = window.DataManager.getSettings();

        const isHwConnected = localStorage.getItem('co2app_bluetooth_connected') === 'true';
        const connectedDevice = localStorage.getItem('co2app_bluetooth_device') || 'ESP32 AtmoCar';
        const isWifiConn = connectedDevice.includes('Wi-Fi') || connectedDevice.includes('192.');

        container.innerHTML = `
            <!-- Hardware Connection Status -->
            <div class="settings-group" id="hardware-connection-group">
                <div class="settings-group-header" style="justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                        <span class="settings-group-icon-badge">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                                <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </span>
                        <h3 class="settings-group-title" style="margin-bottom: 0;">${window.i18n.t('settings_bluetooth')}</h3>
                    </div>
                    <div class="connection-status-pill ${isHwConnected ? 'connected' : 'disconnected'}">
                        <span class="status-pulse-dot"></span>
                        <span class="status-pill-text">${isHwConnected ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
                
                ${isHwConnected 
                  ? `<!-- Connected Status Card -->
                     <div class="ble-connected-card">
                         <div class="ble-card-top">
                             <div class="ble-device-info-main">
                                 <div class="ble-logo-badge ble-connected-badge">
                                     ${isWifiConn ? `
                                         <svg class="wifi-ip-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                             <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                             <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                             <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                             <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                         </svg>
                                     ` : `
                                         <svg class="ble-bluetooth-svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                             <path d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5" stroke="#00d2ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                                         </svg>
                                     `}
                                 </div>
                                 <div class="ble-device-text-main">
                                     <span class="ble-device-name-bold">${connectedDevice}</span>
                                     <span class="ble-device-status-connected">● ${window.i18n.lang === 'vi' ? 'Đang nhận dữ liệu trực tiếp' : window.i18n.lang === 'zh' ? '实时传输数据' : 'Live data streaming'}</span>
                                 </div>
                             </div>
                         </div>
                         <div class="ble-card-details">
                             <div class="ble-detail-row">
                                 <span class="ble-detail-lbl">${window.i18n.lang === 'vi' ? 'Cảm biến CO₂ (NDIR)' : 'CO₂ Sensor (NDIR)'}</span>
                                 <span class="ble-detail-val val-green">✓ ${window.i18n.lang === 'vi' ? 'Sẵn sàng' : 'Ready'}</span>
                             </div>
                             <div class="ble-detail-row">
                                 <span class="ble-detail-lbl">${window.i18n.lang === 'vi' ? 'Cảm biến Nhiệt / Ẩm' : 'Temp / Humidity Sensor'}</span>
                                 <span class="ble-detail-val val-green">✓ ${window.i18n.lang === 'vi' ? 'Sẵn sàng' : 'Ready'}</span>
                             </div>
                             <div class="ble-detail-row">
                                 <span class="ble-detail-lbl">${window.i18n.lang === 'vi' ? 'Phương thức' : 'Protocol'}</span>
                                 <span class="ble-detail-val">${isWifiConn ? 'Wi-Fi Socket' : 'Bluetooth BLE'}</span>
                             </div>
                         </div>
                         <div class="ble-card-actions">
                             <button class="btn btn-danger btn-sm" id="btn-bluetooth-disconnect" style="width: 100%; border-radius: var(--radius-12); padding: 10px; font-weight: 600;">${window.i18n.t('bluetooth_btn_disconnect')}</button>
                         </div>
                     </div>`
                  : `<!-- Direct Hardware Connect Card -->
                     <div class="hw-direct-connect-card">
                         <!-- Bluetooth Web BLE Direct Connect -->
                         <button class="btn-ble-scan-direct" id="btn-ble-scan-direct" type="button">
                             <div class="ble-logo-badge">
                                 <svg class="ble-bluetooth-svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                                     <defs>
                                         <linearGradient id="ble-brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                             <stop offset="0%" stop-color="#00d2ff" />
                                             <stop offset="100%" stop-color="#3b82f6" />
                                         </linearGradient>
                                     </defs>
                                     <path d="M6.5 6.5L17.5 17.5L12 23V1L17.5 6.5L6.5 17.5" 
                                           stroke="url(#ble-brand-gradient)" 
                                           stroke-width="2.2" 
                                           stroke-linecap="round" 
                                           stroke-linejoin="round" />
                                 </svg>
                             </div>
                             <div class="btn-text-block">
                                 <span class="btn-title">${window.i18n.lang === 'vi' ? 'Quét Bluetooth' : window.i18n.lang === 'zh' ? '搜索蓝牙' : 'Scan Bluetooth'}</span>
                                 <span class="btn-subtitle">${window.i18n.lang === 'vi' ? 'Ghép đôi cảm biến' : window.i18n.lang === 'zh' ? '自动配对传感器' : 'Pair sensors'}</span>
                             </div>
                             <div class="btn-ble-action-tag">
                                 <span class="btn-ble-action-label">${window.i18n.lang === 'vi' ? 'Quét' : window.i18n.lang === 'zh' ? '搜索' : 'Scan'}</span>
                                 <svg class="btn-ble-action-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                     <polyline points="9 18 15 12 9 6"></polyline>
                                 </svg>
                             </div>
                         </button>

                         <!-- Divider -->
                         <div class="hw-divider">
                             <span>${window.i18n.lang === 'vi' ? 'HOẶC QUA WI-FI' : window.i18n.lang === 'zh' ? '或通过 WI-FI' : 'OR VIA WI-FI'}</span>
                         </div>

                         <!-- Wi-Fi IP input & Connect -->
                         <div class="wifi-input-row">
                             <div class="wifi-ip-wrap">
                                 <span class="wifi-ip-icon">
                                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                         <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                         <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                         <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                     </svg>
                                 </span>
                                 <input type="text" id="wifi-ip-input-direct" value="192.168.4.1" placeholder="192.168.4.1" class="wifi-ip-input" />
                             </div>
                             <button class="btn-wifi-connect-direct" id="btn-wifi-connect-direct" type="button">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                     <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                                     <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                                     <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                                     <line x1="12" y1="20" x2="12.01" y2="20"></line>
                                 </svg>
                                 <span>${window.i18n.lang === 'vi' ? 'Kết nối Wi-Fi' : window.i18n.lang === 'zh' ? '连接 Wi-Fi' : 'Connect Wi-Fi'}</span>
                             </button>
                         </div>

                         <!-- Demo Presets -->
                         <div class="demo-section">
                             <span class="demo-section-label">${window.i18n.lang === 'vi' ? 'Dữ liệu mô phỏng (Demo):' : window.i18n.lang === 'zh' ? '模拟演示数据:' : 'Simulated Demo:'}</span>
                             <div class="demo-btn-group">
                                 <button class="btn-demo-pill" type="button" data-name="CarAir_ESP32 (Demo Mạch)">
                                     <svg class="demo-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"></path>
                                         <circle cx="7" cy="17" r="2"></circle>
                                         <path d="M9 17h6"></path>
                                         <circle cx="17" cy="17" r="2"></circle>
                                     </svg>
                                     <span>CarAir ESP32 (Demo)</span>
                                 </button>
                                 <button class="btn-demo-pill" type="button" data-name="AtmoCar Mobile (Demo)">
                                     <svg class="demo-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                                     </svg>
                                     <span>AtmoCar Mobile</span>
                                 </button>
                             </div>
                         </div>
                     </div>`
                }
            </div>

            <!-- Threshold Settings -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">⚙️</span>
                    <h3 class="settings-group-title">${window.i18n.t('settings_thresholds')}</h3>
                </div>

                <!-- CO2 Thresholds -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-co2-min">💨</span>
                        <span>${window.i18n.t('settings_co2_min')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-co2-min"
                            min="200" max="800" step="50" value="${thresholds.co2.min}">
                        <span class="setting-value" id="value-co2-min">${thresholds.co2.min} ppm</span>
                    </div>
                </div>
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-co2-max">💨</span>
                        <span>${window.i18n.t('settings_co2_max')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-co2-max"
                            min="200" max="5000" step="50" value="${thresholds.co2.max}">
                        <span class="setting-value" id="value-co2-max">${thresholds.co2.max} ppm</span>
                    </div>
                </div>

                <!-- Temp Thresholds -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-temp-min">🌡️</span>
                        <span>${window.i18n.t('settings_temp_min')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-temp-min"
                            min="0" max="25" step="1" value="${thresholds.temp.min}">
                        <span class="setting-value" id="value-temp-min">${thresholds.temp.min}°C</span>
                    </div>
                </div>
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-temp-max">🌡️</span>
                        <span>${window.i18n.t('settings_temp_max')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-temp-max"
                            min="20" max="50" step="1" value="${thresholds.temp.max}">
                        <span class="setting-value" id="value-temp-max">${thresholds.temp.max}°C</span>
                    </div>
                </div>

                <!-- Humidity Thresholds -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-humidity-min">💧</span>
                        <span>${window.i18n.t('settings_humidity_min')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-humidity-min"
                            min="0" max="60" step="5" value="${thresholds.humidity.min}">
                        <span class="setting-value" id="value-humidity-min">${thresholds.humidity.min}%</span>
                    </div>
                </div>
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-humidity-max">💧</span>
                        <span>${window.i18n.t('settings_humidity_max')}</span>
                    </div>
                    <div class="setting-control setting-slider-control">
                        <input type="range" class="setting-slider" id="slider-humidity-max"
                            min="50" max="100" step="5" value="${thresholds.humidity.max}">
                        <span class="setting-value" id="value-humidity-max">${thresholds.humidity.max}%</span>
                    </div>
                </div>
            </div>

            <!-- General Settings -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🔧</span>
                    <h3 class="settings-group-title">${window.i18n.t('settings_general')}</h3>
                </div>

                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-interval">⏱️</span>
                        <span>${window.i18n.t('settings_interval')}</span>
                    </div>
                    <div class="setting-control">
                        <select class="setting-select" id="select-interval">
                            <option value="3000" ${settings.updateInterval === 3000 ? 'selected' : ''}>3s</option>
                            <option value="5000" ${settings.updateInterval === 5000 ? 'selected' : ''}>5s</option>
                            <option value="10000" ${settings.updateInterval === 10000 ? 'selected' : ''}>10s</option>
                        </select>
                    </div>
                </div>

                <!-- Alert Delay Setting (10 minutes default) -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-time" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⏳</span>
                        <span>${window.i18n.t('settings_alert_delay')}</span>
                    </div>
                    <div class="setting-control">
                        <select class="setting-select" id="select-alert-delay">
                            <option value="10" ${(settings.alertDelayMinutes === undefined || settings.alertDelayMinutes === 10) ? 'selected' : ''}>${window.i18n.t('alert_delay_10m')}</option>
                            <option value="5" ${settings.alertDelayMinutes === 5 ? 'selected' : ''}>${window.i18n.t('alert_delay_5m')}</option>
                            <option value="3" ${settings.alertDelayMinutes === 3 ? 'selected' : ''}>${window.i18n.t('alert_delay_3m')}</option>
                            <option value="1" ${settings.alertDelayMinutes === 1 ? 'selected' : ''}>${window.i18n.t('alert_delay_1m')}</option>
                            <option value="0" ${settings.alertDelayMinutes === 0 ? 'selected' : ''}>${window.i18n.t('alert_delay_0m')}</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-unit">🌡️</span>
                        <span>${window.i18n.t('settings_unit')}</span>
                    </div>
                    <div class="setting-control">
                        <div class="toggle-group" id="unit-toggle">
                            <button class="toggle-btn ${settings.unit === 'C' ? 'active' : ''}" data-unit="C">°C</button>
                            <button class="toggle-btn ${settings.unit === 'F' ? 'active' : ''}" data-unit="F">°F</button>
                        </div>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-lang">🌐</span>
                        <span>${window.i18n.t('settings_lang')}</span>
                    </div>
                    <div class="setting-control">
                        <select class="setting-select" id="select-lang">
                            <option value="vi" ${window.i18n.lang === 'vi' ? 'selected' : ''}>${window.i18n.t('settings_lang_vi')}</option>
                            <option value="en" ${window.i18n.lang === 'en' ? 'selected' : ''}>${window.i18n.t('settings_lang_en')}</option>
                            <option value="zh" ${window.i18n.lang === 'zh' ? 'selected' : ''}>${window.i18n.t('settings_lang_zh')}</option>
                        </select>
                    </div>
                </div>

                <!-- Font Style Setting -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-font" style="background: rgba(20, 184, 166, 0.15); color: #14b8a6;">🔤</span>
                        <span>${window.i18n.lang === 'vi' ? 'Kiểu phông chữ' : window.i18n.lang === 'zh' ? '字体风格' : 'Font Style'}</span>
                    </div>
                    <div class="setting-control">
                        <select class="setting-select" id="select-font-family">
                            <option value="plus-jakarta-sans" ${(localStorage.getItem('co2app_font') || 'plus-jakarta-sans') === 'plus-jakarta-sans' ? 'selected' : ''}>Plus Jakarta Sans</option>
                            <option value="inter" ${localStorage.getItem('co2app_font') === 'inter' ? 'selected' : ''}>Inter (Apple UI)</option>
                            <option value="be-vietnam-pro" ${localStorage.getItem('co2app_font') === 'be-vietnam-pro' ? 'selected' : ''}>Be Vietnam Pro</option>
                            <option value="outfit" ${localStorage.getItem('co2app_font') === 'outfit' ? 'selected' : ''}>Outfit</option>
                            <option value="system" ${localStorage.getItem('co2app_font') === 'system' ? 'selected' : ''}>Segoe UI (Hệ thống)</option>
                        </select>
                    </div>
                </div>

                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-alerts">🔊</span>
                        <span>${window.i18n.t('settings_voice_alerts')}</span>
                    </div>
                    <div class="setting-control" style="display: flex; align-items: center; gap: 10px;">
                        <button class="btn btn-secondary btn-xs" id="btn-test-sound" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 600; border-radius: var(--radius-8); border: 1px solid var(--color-border); background: var(--color-bg-card); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s ease;" title="Nghe thử tiếng chuông">Thử tiếng</button>
                        <div class="toggle-switch ${settings.voiceAlerts ? 'active' : ''}" id="toggle-voice-alerts"></div>
                    </div>
                </div>

                <!-- Custom Vehicle / Cockpit Name -->
                <div class="setting-item">
                    <div class="setting-label">
                        <span class="setting-icon-wrapper icon-car">🚗</span>
                        <span>${window.i18n.t('settings_vehicle_name')}</span>
                    </div>
                    <div class="setting-control">
                        <input type="text" class="setting-input" id="input-vehicle-name" 
                            placeholder="AtmoCar Cockpit" 
                            value="${localStorage.getItem('co2app_vehicle_name') || 'AtmoCar Cockpit'}">
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">ℹ️</span>
                    <h3 class="settings-group-title">${window.i18n.t('settings_about')}</h3>
                </div>
                <div class="about-info">
                    <div class="about-row">
                        <span class="about-label">${window.i18n.t('settings_app')}</span>
                        <span class="about-value">AtmoCar Monitor</span>
                    </div>
                    <div class="about-row">
                        <span class="about-label">${window.i18n.t('settings_version')}</span>
                        <span class="about-value">1.0.0</span>
                    </div>
                    <div class="about-row">
                        <span class="about-label">${window.i18n.t('settings_desc')}</span>
                        <span class="about-value">${window.i18n.t('settings_desc_val')}</span>
                    </div>
                </div>
            </div>
        `;

        this.setupSliderListeners();
        this.setupBluetoothListeners();
        this.setupGeneralListeners();
    }

    // ----------------------------------------------------------
    // Slider Event Listeners
    // ----------------------------------------------------------
    updateSliderTrackFill(slider) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
        const fillColor = isLight ? '#059669' : '#10b981';
        const trackBg = isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.12)';
        slider.style.background = `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${percentage}%, ${trackBg} ${percentage}%, ${trackBg} 100%)`;
    }

    setupSliderListeners() {
        const sliderMap = {
            'slider-co2-min': { key: 'co2', prop: 'min', unit: ' ppm', valueId: 'value-co2-min' },
            'slider-co2-max': { key: 'co2', prop: 'max', unit: ' ppm', valueId: 'value-co2-max' },
            'slider-temp-min': { key: 'temp', prop: 'min', unit: '°C', valueId: 'value-temp-min' },
            'slider-temp-max': { key: 'temp', prop: 'max', unit: '°C', valueId: 'value-temp-max' },
            'slider-humidity-min': { key: 'humidity', prop: 'min', unit: '%', valueId: 'value-humidity-min' },
            'slider-humidity-max': { key: 'humidity', prop: 'max', unit: '%', valueId: 'value-humidity-max' }
        };

        Object.entries(sliderMap).forEach(([sliderId, config]) => {
            const slider = document.getElementById(sliderId);
            if (!slider) return;

            // Initial fill calculation
            this.updateSliderTrackFill(slider);

            slider.addEventListener('input', () => {
                const val = parseInt(slider.value);
                document.getElementById(config.valueId).textContent = `${val}${config.unit}`;

                const thresholds = window.DataManager.getThresholds();
                thresholds[config.key][config.prop] = val;
                window.DataManager.setThresholds(thresholds);

                // Update track progress fill dynamically
                this.updateSliderTrackFill(slider);
            });
        });
    }

    setupRoomListeners() {
        // Disabled in single vehicle mode
    }

    // ----------------------------------------------------------
    // Bluetooth & Hardware Settings Listeners (ESP32 Direct)
    // ----------------------------------------------------------
    setupBluetoothListeners() {
        // 1. Nút ngắt kết nối (khi đang kết nối)
        const btnDisconnect = document.getElementById('btn-bluetooth-disconnect');
        if (btnDisconnect) {
            btnDisconnect.addEventListener('click', () => {
                if (window.HardwareBridge) {
                    window.HardwareBridge.disconnect();
                }
                localStorage.removeItem('co2app_bluetooth_connected');
                localStorage.removeItem('co2app_bluetooth_device');
                
                if (window.AlertManager) {
                    window.AlertManager.showToast(
                        window.i18n.lang === 'vi' ? 'Đã ngắt kết nối phần cứng' : window.i18n.lang === 'zh' ? '已断开硬件连接' : 'Hardware disconnected',
                        'warning'
                    );
                }
                
                this.renderSettings();
                
                if (window.App && window.App._instance) {
                    window.App._instance.updateConnectionStatus(false);
                }
            });
        }

        // 2. Nút quét Bluetooth ESP32 trực tiếp (Web BLE)
        const btnBleScan = document.getElementById('btn-ble-scan-direct');
        if (btnBleScan) {
            btnBleScan.addEventListener('click', async () => {
                try {
                    btnBleScan.disabled = true;
                    btnBleScan.style.opacity = '0.7';
                    if (window.HardwareBridge) {
                        const devName = await window.HardwareBridge.connectBle();
                        localStorage.setItem('co2app_bluetooth_connected', 'true');
                        localStorage.setItem('co2app_bluetooth_device', devName || 'ESP32 AtmoCar');
                        if (window.AlertManager) {
                            window.AlertManager.showToast(
                                window.i18n.lang === 'vi' ? `Đã kết nối Bluetooth: ${devName}` : `Connected Bluetooth: ${devName}`,
                                'success'
                            );
                        }
                        this.renderSettings();
                        if (window.App && window.App._instance) {
                            window.App._instance.updateConnectionStatus(true);
                        }
                    }
                } catch (err) {
                    btnBleScan.disabled = false;
                    btnBleScan.style.opacity = '1';
                    if (window.AlertManager) {
                        window.AlertManager.showToast(err.message || 'Không thể kết nối Bluetooth', 'error');
                    } else {
                        alert(err.message);
                    }
                }
            });
        }

        // 3. Nút kết nối Wi-Fi trực tiếp
        const btnWifi = document.getElementById('btn-wifi-connect-direct');
        if (btnWifi) {
            btnWifi.addEventListener('click', () => {
                const ipInput = document.getElementById('wifi-ip-input-direct');
                const ip = (ipInput && ipInput.value.trim()) || '192.168.4.1';
                if (window.HardwareBridge) {
                    window.HardwareBridge.connectWifi(ip);
                }
                localStorage.setItem('co2app_bluetooth_connected', 'true');
                localStorage.setItem('co2app_bluetooth_device', `ESP32 Wi-Fi (${ip})`);
                if (window.AlertManager) {
                    window.AlertManager.showToast(
                        window.i18n.lang === 'vi' ? `Đã kết nối Wi-Fi ESP32: ${ip}` : `Connected to ESP32 Wi-Fi: ${ip}`,
                        'success'
                    );
                }
                this.renderSettings();
                if (window.App && window.App._instance) {
                    window.App._instance.updateConnectionStatus(true);
                }
            });
        }

        // 4. Các nút chọn nhanh thiết bị giả lập (Demo)
        document.querySelectorAll('.btn-demo-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const devName = btn.dataset.name || 'CarAir_ESP32 (Demo Mạch)';
                localStorage.setItem('co2app_bluetooth_connected', 'true');
                localStorage.setItem('co2app_bluetooth_device', devName);
                if (window.AlertManager) {
                    window.AlertManager.showToast(
                        window.i18n.lang === 'vi' ? `Đã kích hoạt nguồn mẫu: ${devName}` : `Demo active: ${devName}`,
                        'success'
                    );
                }
                this.renderSettings();
                if (window.App && window.App._instance) {
                    window.App._instance.updateConnectionStatus(true);
                }
            });
        });
    }

    // Điều hướng nhanh đến khối kết nối phần cứng trong Cài đặt
    openBleScanModal() {
        if (window.App && window.App._instance) {
            window.App._instance.navigate('settings');
        }
        setTimeout(() => {
            const hwCard = document.getElementById('hardware-connection-group');
            if (hwCard) {
                hwCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hwCard.classList.remove('pulse-highlight');
                void hwCard.offsetWidth;
                hwCard.classList.add('pulse-highlight');
            }
        }, 100);
    }

    connectToDevice(name, id) {
        localStorage.setItem('co2app_bluetooth_connected', 'true');
        localStorage.setItem('co2app_bluetooth_device', name);
        if (window.AlertManager) {
            window.AlertManager.showToast(
                window.i18n.lang === 'vi' ? `Đã kết nối: ${name}` : `Connected: ${name}`,
                'success'
            );
        }
        this.renderSettings();
        if (window.App && window.App._instance) {
            window.App._instance.updateConnectionStatus(true);
        }
    }

    // ----------------------------------------------------------
    // General Settings Listeners
    // ----------------------------------------------------------
    setupGeneralListeners() {
        // Update interval
        const intervalSelect = document.getElementById('select-interval');
        if (intervalSelect) {
            intervalSelect.addEventListener('change', () => {
                const interval = parseInt(intervalSelect.value);
                window.DataManager.saveSettings({ updateInterval: interval });
                // Notify app to restart interval
                if (window.App && window.App._instance) {
                    window.App._instance.restartRealtimeUpdates();
                }
            });
        }

        // Alert delay selector (Thời gian ngoài ngưỡng để cảnh báo)
        const alertDelaySelect = document.getElementById('select-alert-delay');
        if (alertDelaySelect) {
            alertDelaySelect.addEventListener('change', () => {
                const delayMin = parseInt(alertDelaySelect.value);
                window.DataManager.saveSettings({ alertDelayMinutes: delayMin });
                if (window.AlertManager && typeof window.AlertManager.showToast === 'function') {
                    const msg = delayMin > 0 
                        ? (window.i18n.lang === 'vi' ? `Đã đặt thời gian cảnh báo ngoài vùng: ${delayMin} phút` : `Alert delay set to: ${delayMin} minutes`)
                        : (window.i18n.lang === 'vi' ? 'Đã bật chế độ cảnh báo tức thì (Thử nghiệm)' : 'Immediate alert mode enabled (Test)');
                    window.AlertManager.showToast(msg, 'success', 0, 3000);
                }
            });
        }

        // Unit toggle
        const unitToggle = document.getElementById('unit-toggle');
        if (unitToggle) {
            unitToggle.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    unitToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    window.DataManager.saveSettings({ unit: btn.dataset.unit });
                    // Refresh dashboard to apply unit immediately
                    if (window.App && window.App._instance && window.App._instance.currentScreen === 'dashboard') {
                        window.App._instance.renderDashboard();
                    }
                });
            });
        }

        // Language Selector listener
        const langSelect = document.getElementById('select-lang');
        if (langSelect) {
            langSelect.addEventListener('change', () => {
                const lang = langSelect.value;
                window.i18n.setLanguage(lang);
                // Call App to update language across the entire application
                if (window.App && window.App._instance) {
                    window.App._instance.updateLanguage();
                }
            });
        }

        // Font Family Selector listener
        const fontSelect = document.getElementById('select-font-family');
        if (fontSelect) {
            fontSelect.addEventListener('change', () => {
                const font = fontSelect.value;
                document.documentElement.setAttribute('data-font', font);
                localStorage.setItem('co2app_font', font);
                if (window.AlertManager && typeof window.AlertManager.showToast === 'function') {
                    const fontNames = {
                        'plus-jakarta-sans': 'Plus Jakarta Sans',
                        'inter': 'Inter',
                        'be-vietnam-pro': 'Be Vietnam Pro',
                        'outfit': 'Outfit',
                        'system': 'Segoe UI'
                    };
                    window.AlertManager.showToast(
                        window.i18n.lang === 'vi' ? `Đã đổi phông: ${fontNames[font] || font}` : `Font changed: ${fontNames[font] || font}`,
                        'success',
                        0,
                        2500
                    );
                }
            });
        }

        // Voice alerts toggle switch & Test sound button
        const voiceToggle = document.getElementById('toggle-voice-alerts');
        if (voiceToggle) {
            voiceToggle.addEventListener('click', () => {
                const isActive = voiceToggle.classList.toggle('active');
                window.DataManager.saveSettings({ voiceAlerts: isActive });
                if (isActive && window.AlertManager) {
                    window.AlertManager.playAlarmSound('danger', true);
                }
            });
        }

        const btnTestSound = document.getElementById('btn-test-sound');
        if (btnTestSound) {
            btnTestSound.addEventListener('click', () => {
                if (window.AlertManager) {
                    window.AlertManager.playAlarmSound('danger', true);
                    window.AlertManager.showToast(
                        window.i18n.lang === 'vi' ? '🚨 Đang phát: Còi chip & Hiệu ứng cảnh báo vượt ngưỡng' : '🚨 Simulating: Warning alarm & alert animation',
                        'danger',
                        0,
                        3500
                    );
                }

                // Mô phỏng hiệu ứng quầng sáng viền cảnh báo khẩn cấp trong 3.5 giây
                const viewport = document.getElementById('screens-viewport');
                if (viewport) {
                    viewport.classList.add('has-emergency-alert');
                    setTimeout(() => {
                        viewport.classList.remove('has-emergency-alert');
                    }, 3500);
                }
            });
        }

        // Vehicle Name Input listener
        const vehicleInput = document.getElementById('input-vehicle-name');
        if (vehicleInput) {
            vehicleInput.addEventListener('input', () => {
                const name = vehicleInput.value.trim();
                if (name) {
                    localStorage.setItem('co2app_vehicle_name', name);
                } else {
                    localStorage.removeItem('co2app_vehicle_name');
                }
                const badgeText = document.querySelector('#vehicle-title .edition-text');
                if (badgeText) {
                    badgeText.textContent = name || 'AtmoCar Cockpit';
                }
            });
        }
    }

    // ----------------------------------------------------------
    // Modals
    // ----------------------------------------------------------


    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

window.SettingsManager = new SettingsManager();
