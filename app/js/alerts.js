// ============================================================
// AlertManager - Threshold Alerts & Toast Notifications
// ============================================================

class AlertManager {
    constructor() {
        this._lastAlertTimes = new Map(); // debounce: "roomId-type-direction" → timestamp
        this._outOfRangeState = new Map(); // continuous tracking: key → { startTime, lastViolation, alerted }
        this._toastContainer = null;
        this._debounceMs = 30000; // 30 seconds
        this._lastVoiceAlertTime = 0;
        this._audioCtx = null;
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------
    init() {
        this._toastContainer = document.getElementById('toast-container');
        this.updateBadge();

        // Resume AudioContext on first user interaction to satisfy autoplay policy
        const resumeAudio = () => {
            if (this._audioCtx && this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
        };
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
    }

    // ----------------------------------------------------------
    // Check and Alert (Chỉ cảnh báo khi ngoài vùng đủ thời gian quy định - Mặc định 10 phút)
    // ----------------------------------------------------------
    checkAndAlert(reading, roomId, roomName) {
        const violations = window.DataManager.checkThresholds(reading);
        const currentKeys = new Set(violations.map(v => `${roomId}-${v.type}-${v.direction}`));
        const now = Date.now();

        // 1. Tự động reset bộ đếm khi chỉ số quay trở lại vùng an toàn
        for (const [key, state] of this._outOfRangeState.entries()) {
            if (key.startsWith(`${roomId}-`) && !currentKeys.has(key)) {
                this._outOfRangeState.delete(key);
            }
        }

        // 2. Theo dõi thời gian ngoài vùng liên tục
        const settings = window.DataManager.getSettings();
        const delayMin = settings.alertDelayMinutes !== undefined ? settings.alertDelayMinutes : 10;
        const requiredDelayMs = delayMin * 60 * 1000;

        violations.forEach(v => {
            const key = `${roomId}-${v.type}-${v.direction}`;

            if (!this._outOfRangeState.has(key)) {
                this._outOfRangeState.set(key, {
                    startTime: now,
                    lastViolation: v,
                    alerted: false
                });
            }

            const state = this._outOfRangeState.get(key);
            state.lastViolation = v;
            const elapsedMs = now - state.startTime;

            // ĐIỀU KIỆN CỐT LÕI: Phải ngoài vùng đủ 10 phút (hoặc delayMin đã cấu hình) mới phát cảnh báo
            if (elapsedMs >= requiredDelayMs) {
                const lastTime = this._lastAlertTimes.get(key) || 0;
                // Thời gian giãn cách giữa các lần nhắc lại (3 phút hoặc 30s với chế độ tức thì)
                const alertCooldown = delayMin === 0 ? 30000 : 180000;

                if (now - lastTime >= alertCooldown) {
                    this._lastAlertTimes.set(key, now);
                    state.alerted = true;

                    // Xác định mức độ (Warning hay Danger)
                    const level = this._getAlertLevel(v);

                    // Tạo bản ghi lưu trữ
                    const alert = {
                        id: `alert-${now}-${Math.random().toString(36).substr(2, 6)}`,
                        type: v.type,
                        value: v.value,
                        threshold: v.threshold,
                        direction: v.direction,
                        roomId,
                        roomName,
                        timestamp: now,
                        read: false,
                        level,
                        durationMinutes: Math.max(delayMin, Math.round(elapsedMs / 60000))
                    };

                    window.DataManager.addAlert(alert);

                    // Hiển thị Toast cảnh báo buồng lái basic nhưng dễ nhận diện
                    const message = this._buildAlertMessage(v, roomName, delayMin, elapsedMs);
                    this.showToast(message, level);

                    // Âm thanh cảnh báo buồng lái (Cockpit Harmonic Chime)
                    this.playAlarmSound(level);

                    // Cập nhật huy hiệu
                    this.updateBadge();
                }
            }
        });
    }

    // ----------------------------------------------------------
    // Trạng thái theo dõi ngoài vùng cho giao diện buồng lái
    // ----------------------------------------------------------
    getOutOfRangeStatus(roomId = 'my-car') {
        const now = Date.now();
        const settings = window.DataManager.getSettings();
        const delayMin = settings.alertDelayMinutes !== undefined ? settings.alertDelayMinutes : 10;
        const requiredDelayMs = delayMin * 60 * 1000;

        let hasAlerted = false;
        let hasPending = false;
        let maxElapsedMs = 0;
        let primaryViolation = null;

        this._outOfRangeState.forEach((state, key) => {
            if (key.startsWith(`${roomId}-`)) {
                const elapsed = now - state.startTime;
                if (elapsed > maxElapsedMs) {
                    maxElapsedMs = elapsed;
                    primaryViolation = state.lastViolation;
                }
                if (elapsed >= requiredDelayMs) {
                    hasAlerted = true;
                } else {
                    hasPending = true;
                }
            }
        });

        return {
            hasAlerted,
            hasPending,
            delayMin,
            requiredDelayMs,
            maxElapsedMs,
            primaryViolation
        };
    }

    // ----------------------------------------------------------
    // Âm thanh cảnh báo buồng lái (Refined Cockpit Harmonic Chime)
    // Tối giản, êm ái nhưng độ nhận diện âm sắc ô tô cực chuẩn
    // ----------------------------------------------------------
    // Âm thanh cảnh báo buồng lái (Authentic Automotive Electronic Warning Alarm)
    // Mô phỏng còi chip cảnh báo nguy hiểm / radar va chạm chuyên dụng trên ô tô
    // Tần số cao đanh thép, dồn dập, sắc sảo, độ xuyên thấu âm thanh cao trong cabin
    // ----------------------------------------------------------
    playAlarmSound(level, force = false) {
        const settings = window.DataManager.getSettings();
        if (!force && settings.voiceAlerts === false) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            if (!this._audioCtx) {
                this._audioCtx = new AudioContext();
            }
            
            if (this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }

            const now = this._audioCtx.currentTime;
            const isDanger = (level === 'danger' || level === 'error');

            // Danger (Khẩn cấp / Nguy hiểm vượt ngưỡng): 
            // 2 cụm dồn dập [TÍT-TÍT-TÍT] ... [TÍT-TÍT-TÍT] đanh thép chuẩn cảnh báo va chạm xe hơi
            // Warning (Cảnh báo vừa): 2 tiếng [TÍT - TÍT] dứt khoát
            const pulseTimes = isDanger
                ? [
                    0.00, 0.11, 0.22,  // Cụm 1: 3 nhịp dồn dập
                    0.40, 0.51, 0.62   // Cụm 2: 3 nhịp dồn dập tiếp theo
                  ]
                : [
                    0.00, 0.15         // 2 nhịp cảnh báo mức vừa
                  ];

            const pulseDuration = isDanger ? 0.075 : 0.09; // Thời lượng mỗi tiếng tít (75ms - 90ms)
            const baseFreq = isDanger ? 1046.5 : 880;     // C6 (1046Hz) cho nguy hiểm, A5 (880Hz) cho cảnh báo

            pulseTimes.forEach(offset => {
                const startTime = now + offset;
                const stopTime = startTime + pulseDuration;

                // 1. Dao động chính: Còi chip điện tử Piezo Buzzer (Square wave filtered)
                const osc1 = this._audioCtx.createOscillator();
                const gain1 = this._audioCtx.createGain();
                osc1.type = 'square';
                // Attack transient: hơi vút nhẹ ở 6ms đầu tạo tiếng gõ click đanh như còi taplo
                osc1.frequency.setValueAtTime(baseFreq * 1.05, startTime);
                osc1.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.008);

                // 2. Dao động phụ: Hài âm căng thẳng (Triangle harmonic ở quãng năm 1.5x)
                // Tạo độ dày và tính khẩn cấp nhận diện tức thì trong môi trường xe ô tô
                const osc2 = this._audioCtx.createOscillator();
                const gain2 = this._audioCtx.createGain();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(baseFreq * 1.5, startTime);

                // Lowpass filter: Giúp âm sắc đanh, giòn nhưng không bị chói gắt méo loa
                const filter = this._audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(isDanger ? 3200 : 2600, startTime);
                filter.Q.setValueAtTime(1.2, startTime);

                // Envelope: Đánh tức thì (2ms), giữ đỉnh và ngắt dứt khoát
                const peakVol = isDanger ? 0.26 : 0.16;
                gain1.gain.setValueAtTime(0.0001, startTime);
                gain1.gain.linearRampToValueAtTime(peakVol, startTime + 0.002);
                gain1.gain.setValueAtTime(peakVol * 0.9, startTime + pulseDuration - 0.015);
                gain1.gain.exponentialRampToValueAtTime(0.0001, stopTime);

                gain2.gain.setValueAtTime(0.0001, startTime);
                gain2.gain.linearRampToValueAtTime(peakVol * 0.45, startTime + 0.002);
                gain2.gain.setValueAtTime(peakVol * 0.38, startTime + pulseDuration - 0.015);
                gain2.gain.exponentialRampToValueAtTime(0.0001, stopTime);

                osc1.connect(gain1);
                gain1.connect(filter);
                osc2.connect(gain2);
                gain2.connect(filter);

                filter.connect(this._audioCtx.destination);

                osc1.start(startTime);
                osc1.stop(stopTime + 0.01);
                osc2.start(startTime);
                osc2.stop(stopTime + 0.01);
            });
        } catch (e) {
            console.warn('Could not play cockpit warning alarm:', e);
        }
    }

    _getAlertLevel(violation) {
        const t = window.DataManager.getThresholds();
        if (violation.type === 'co2') {
            return violation.value >= t.co2.max ? 'danger' : 'warning';
        }
        if (violation.type === 'temp') {
            return (violation.value > t.temp.max + 3 || violation.value < t.temp.min - 3) ? 'danger' : 'warning';
        }
        if (violation.type === 'humidity') {
            return (violation.value > t.humidity.max + 10 || violation.value < t.humidity.min - 10) ? 'danger' : 'warning';
        }
        return 'warning';
    }

    _buildAlertMessage(violation, roomName, delayMin = 10, elapsedMs = 0) {
        const typeName = window.i18n.t('metric_' + violation.type);
        const dirText = violation.direction === 'above' ? window.i18n.t('alert_direction_above') : window.i18n.t('alert_direction_below');
        
        // Format temp value and threshold if unit is F
        const unitSetting = window.DataManager.getSettings().unit || 'C';
        let val = violation.value;
        let thresh = violation.threshold;
        let unit = '';
        if (violation.type === 'co2') {
            unit = 'ppm';
        } else if (violation.type === 'humidity') {
            unit = '%';
        } else if (violation.type === 'temp') {
            unit = unitSetting === 'F' ? '°F' : '°C';
            if (unitSetting === 'F') {
                val = (val * 9 / 5) + 32;
                thresh = (thresh * 9 / 5) + 32;
            }
        }
        val = Math.round(val * 10) / 10;
        thresh = Math.round(thresh * 10) / 10;

        if (delayMin > 0) {
            const timeLabel = `${delayMin} phút`;
            return window.i18n.t('alert_msg_10m', {
                car: roomName,
                metric: typeName,
                time: timeLabel,
                value: val,
                unit: unit
            });
        }

        return window.i18n.t('alert_msg_format', {
            car: roomName,
            metric: typeName,
            direction: dirText,
            value: val,
            threshold: thresh,
            unit: unit
        });
    }

    // ----------------------------------------------------------
    // Toast Notifications (CarPlay / Floating Dynamic Island style)
    // ----------------------------------------------------------
    showToast(message, level = 'warning', opt1, opt2) {
        if (!this._toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${level}`;

        let icon = '⚠️';
        let title = window.i18n ? window.i18n.t('alert_toast_title') : 'Cảnh báo buồng lái';

        if (level === 'danger' || level === 'error') {
            icon = '🚨';
        } else if (level === 'success') {
            icon = '✅';
            title = (window.i18n && window.i18n.lang === 'zh') ? '座舱通知' : 
                    ((window.i18n && window.i18n.lang === 'en') ? 'Cockpit Notice' : 'Thông báo buồng lái');
        } else if (level === 'info') {
            icon = 'ℹ️';
            title = (window.i18n && window.i18n.lang === 'zh') ? '座舱信息' : 
                    ((window.i18n && window.i18n.lang === 'en') ? 'Cockpit Info' : 'Thông tin buồng lái');
        }

        let duration = 4800;
        if (typeof opt2 === 'number') {
            duration = opt2;
        } else if (typeof opt1 === 'number' && opt1 > 100) {
            duration = opt1;
        }

        toast.innerHTML = `
            <div class="toast-icon-wrap">
                <span class="toast-icon">${icon}</span>
            </div>
            <div class="toast-body">
                <div class="toast-header-line">
                    <span class="toast-title">${title}</span>
                </div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Đóng">✕</button>
        `;

        // Dismiss on click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this._removeToast(toast);
        });

        // Dismiss older toasts if more than 2 are visible to prevent cluttering
        while (this._toastContainer.children.length >= 2) {
            this._removeToast(this._toastContainer.firstElementChild);
        }

        this._toastContainer.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-dismiss
        setTimeout(() => {
            this._removeToast(toast);
        }, duration);
    }

    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.remove('show');

        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }

    // ----------------------------------------------------------
    // Render Alerts List
    // ----------------------------------------------------------
    renderAlertsList() {
        const container = document.getElementById('alerts-list');
        if (!container) return;

        const alerts = window.DataManager.getAlerts();

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔔</div>
                    <div class="empty-title">${window.i18n.t('alerts_empty_title')}</div>
                    <div class="empty-desc">${window.i18n.t('alerts_empty_desc')}</div>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alert => {
            const typeIcons = { co2: '💨', temp: '🌡️', humidity: '💧' };
            const typeName = window.i18n.t('metric_' + alert.type);
            const dirText = alert.direction === 'above' ? window.i18n.t('alert_direction_above') : window.i18n.t('alert_direction_below');
            
            // Format temp value and threshold if unit is F
            const unitSetting = window.DataManager.getSettings().unit || 'C';
            let val = alert.value;
            let thresh = alert.threshold;
            let unit = '';
            if (alert.type === 'co2') {
                unit = 'ppm';
            } else if (alert.type === 'humidity') {
                unit = '%';
            } else if (alert.type === 'temp') {
                unit = unitSetting === 'F' ? '°F' : '°C';
                if (unitSetting === 'F') {
                    val = (val * 9 / 5) + 32;
                    thresh = (thresh * 9 / 5) + 32;
                }
            }
            val = Math.round(val * 10) / 10;
            thresh = Math.round(thresh * 10) / 10;

            const alertTitleText = window.i18n.t('alert_' + alert.type + '_' + alert.direction);
            const alertDescText = window.i18n.t('alert_msg_format', {
                car: alert.roomName,
                metric: typeName,
                direction: dirText,
                value: val,
                threshold: thresh,
                unit: unit
            });

            return `
                <div class="alert-item ${alert.read ? '' : 'unread'} ${alert.level}" data-alert-id="${alert.id}">
                    <div class="alert-icon-wrapper alert-icon-${alert.level}">
                        <span class="alert-icon">${typeIcons[alert.type] || '⚠️'}</span>
                    </div>
                    <div class="alert-content">
                        <div class="alert-title">
                            ${alertTitleText}
                            ${!alert.read ? '<span class="alert-unread-dot"></span>' : ''}
                        </div>
                        <div class="alert-desc">
                            ${alertDescText}
                        </div>
                        <div class="alert-time">${this.formatTimeAgo(alert.timestamp)}</div>
                    </div>
                    <button class="alert-dismiss" data-alert-id="${alert.id}" title="${window.i18n.t('btn_delete')}">✕</button>
                </div>
            `;
        }).join('');

        // Bind events
        container.querySelectorAll('.alert-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.alert-dismiss')) return;
                const id = el.dataset.alertId;
                window.DataManager.markAlertRead(id);
                el.classList.remove('unread');
                el.querySelector('.alert-unread-dot')?.remove();
                this.updateBadge();
            });
        });

        container.querySelectorAll('.alert-dismiss').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.alertId;
                window.DataManager.clearAlert(id);
                this.renderAlertsList();
                this.updateBadge();
            });
        });

        // Setup clear all button
        const clearAllBtn = document.getElementById('clear-all-alerts');
        if (clearAllBtn) {
            // Remove old listeners by cloning
            const newBtn = clearAllBtn.cloneNode(true);
            clearAllBtn.parentNode.replaceChild(newBtn, clearAllBtn);
            newBtn.addEventListener('click', () => {
                window.DataManager.clearAllAlerts();
                this.renderAlertsList();
                this.updateBadge();
            });
        }
    }

    // ----------------------------------------------------------
    // Badge
    // ----------------------------------------------------------
    updateBadge() {
        const count = window.DataManager.getUnreadAlertCount();
        const displayVal = count > 0 ? (count > 99 ? '99+' : count) : '';

        const badge = document.getElementById('alerts-badge');
        if (badge) {
            badge.style.display = count > 0 ? 'flex' : 'none';
            badge.textContent = displayVal;
        }

        const menuBadge = document.getElementById('menu-alerts-badge');
        if (menuBadge) {
            menuBadge.style.display = count > 0 ? 'inline-flex' : 'none';
            menuBadge.textContent = displayVal;
        }

        const menuDot = document.getElementById('menu-alert-dot');
        if (menuDot) {
            menuDot.style.display = count > 0 ? 'block' : 'none';
        }
    }

    // ----------------------------------------------------------
    // Vietnamese Relative Time
    // ----------------------------------------------------------
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 30) return window.i18n.t('time_just_now');
        if (seconds < 60) return window.i18n.t('time_seconds_ago', { n: seconds });
        if (minutes < 60) return window.i18n.t('time_minutes_ago', { n: minutes });
        if (hours < 24) return window.i18n.t('time_hours_ago', { n: hours });
        if (days < 7) return window.i18n.t('time_days_ago', { n: days });

        const date = new Date(timestamp);
        const locale = window.i18n.lang === 'vi' ? 'vi-VN' : window.i18n.lang === 'zh' ? 'zh-CN' : 'en-US';
        return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

window.AlertManager = new AlertManager();
