// ============================================================
// App - Main Application Controller
// ============================================================

class App {
    constructor() {
        App._instance = this;
        window.app = this;
        this.currentScreen = 'dashboard';
        this.updateTimer = null;
        this.activeMetric = 'co2';
        this.isNavigating = false;
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------
    init() {
        // Store instance reference for cross-module access
        App._instance = this;

        // 1. Initialize DataManager (generates mock data)
        window.DataManager.init();

        // Translate UI
        this.translateStaticUI();

        // 2. GaugeRenderer is ready (no init needed)

        // 3. Initialize AlertManager
        window.AlertManager.init();

        // 4. Initialize ChartManager
        window.ChartManager.init();

        // 5. Setup navigation & gestures
        this.setupNavigation();
        this.setupSwipeGestures();
        this.setupMetricCarousel();

        // 6. Setup room selector (Disabled in single vehicle mode)

        // 7. Initial navigation to dashboard or URL hash (#settings, etc.)
        const hashScreen = window.location.hash.replace('#', '');
        const validScreens = ['dashboard', 'charts', 'alerts', 'settings', 'reports'];
        if (validScreens.includes(hashScreen)) {
            this.navigate(hashScreen);
        } else {
            this.navigate('dashboard');
        }

        window.addEventListener('hashchange', () => {
            const h = window.location.hash.replace('#', '');
            if (validScreens.includes(h)) {
                this.navigate(h);
            }
        });

        // 8. Start realtime updates
        this.startRealtimeUpdates();

        // 9. Update connection status based on Bluetooth
        const isConnected = localStorage.getItem('co2app_bluetooth_connected') === 'true';
        this.updateConnectionStatus(isConnected);

        // 10. Day & Night Theme Manager
        this.initTheme();

        // 11. Click vào status ở header để mở Trung tâm kết nối phần cứng trong Cài đặt
        const connStatusEl = document.getElementById('connection-status');
        if (connStatusEl) {
            connStatusEl.style.cursor = 'pointer';
            connStatusEl.title = 'Nhấn để xem hoặc kết nối phần cứng ESP32';
            connStatusEl.addEventListener('click', () => {
                this.navigate('settings');
                setTimeout(() => {
                    const hwCard = document.getElementById('hardware-connection-group');
                    if (hwCard) {
                        hwCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        hwCard.classList.remove('pulse-highlight');
                        void hwCard.offsetWidth; // force reflow
                        hwCard.classList.add('pulse-highlight');
                    }
                }, 100);
            });
        }

        // 12. Menu điều hướng 3 gạch ở góc (Corner Menu Popover)
        this.setupCornerMenu();

        // 13. Tự động dọn dẹp bộ nhớ chế độ khung điện thoại cũ (nếu có)
        try {
            localStorage.removeItem('atmocar_view_mode');
            document.body.classList.remove('view-mobile-frame');
        } catch (_) {}

        // 14. Giữ màn hình luôn sáng khi lái xe (Screen Wake Lock)
        if ('wakeLock' in navigator) {
            try { navigator.wakeLock.request('screen'); } catch (_) {}
        }

        // 15. Unregister stale Service Worker to guarantee fresh assets
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (let r of regs) r.unregister();
            });
        }

        console.log('🌿 AtmoCar initialized successfully with Hardware Bridge & Theme Engine');
    }

    // ----------------------------------------------------------
    // Light / Dark Background Theme Management
    // ----------------------------------------------------------
    initTheme() {
        const savedTheme = localStorage.getItem('atmocar_theme');
        const initialTheme = savedTheme || 'dark'; // Default to Dark Background
        this.setTheme(initialTheme, false);

        // Header theme switcher buttons (Nền Sáng / Nền Tối trên thanh bar trên cùng)
        const headerSwitch = document.getElementById('theme-switch-header');
        if (headerSwitch) {
            headerSwitch.addEventListener('click', (e) => {
                e.stopPropagation();
                const btn = e.target.closest('[data-theme-btn]');
                if (btn) {
                    const target = btn.getAttribute('data-theme-btn');
                    if (target) {
                        this.setTheme(target, true);
                        return;
                    }
                }
                // Nếu click vào vỏ viên nang kén, tự động đảo giao diện
                this.toggleTheme();
            });
        }
        // Fallback for single toggle button if present
        const toggleBtn = document.getElementById('theme-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTheme();
            });
        }

        // Click badge to open settings
        const vehicleBadge = document.getElementById('vehicle-title');
        if (vehicleBadge) {
            vehicleBadge.addEventListener('click', () => {
                this.navigate('settings');
            });
        }
    }

    setTheme(theme, save = true) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        if (save) {
            localStorage.setItem('atmocar_theme', theme);
        }

        // Sync header theme buttons
        document.querySelectorAll('#theme-switch-header [data-theme-btn]').forEach(btn => {
            const btnTheme = btn.getAttribute('data-theme-btn');
            if (btnTheme === theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Notify charts
        if (window.ChartManager && typeof window.ChartManager.updateTheme === 'function') {
            window.ChartManager.updateTheme(theme);
        }

        // Refresh current gauge in dashboard safely without crashing
        if (this.currentScreen === 'dashboard') {
            this.renderDashboard();
        }
    }

    toggleTheme() {
        const next = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(next, true);
    }

    updateLanguage() {
        this.translateStaticUI();
        this.navigate(this.currentScreen);
    }

    translateStaticUI() {
        // App title in header (preserve brand styling)
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle && !headerTitle.querySelector('.brand-atmo')) {
            headerTitle.innerHTML = '<span class="brand-atmo">Atmo</span><span class="brand-car">Car</span>';
        }

        // Header vehicle badge / edition
        const vehicleBadge = document.getElementById('vehicle-title');
        if (vehicleBadge) {
            const customName = localStorage.getItem('co2app_vehicle_name');
            const textEl = vehicleBadge.querySelector('.edition-text');
            const title = customName || 'AtmoCar Cockpit';
            if (textEl) {
                textEl.textContent = title;
            } else {
                vehicleBadge.textContent = title;
            }
        }

        // Nav tabs (Cập nhật đúng text cho cả menu popover và menu ngang, không làm hỏng icon)
        const updateNavTexts = (screenKey, translationKey) => {
            const translated = window.i18n.t(translationKey);
            document.querySelectorAll(`.nav-item[data-screen="${screenKey}"]`).forEach(item => {
                const titleEl = item.querySelector('.nav-text') ||
                                item.querySelector('.menu-item-title') ||
                                item.querySelector(':scope > span:not(.nav-badge):not(.menu-badge):not(.menu-item-desc):not(.menu-item-indicator):not(.nav-icon)');
                if (titleEl) titleEl.textContent = translated;
            });
        };
        updateNavTexts('dashboard', 'nav_dashboard');
        updateNavTexts('charts', 'nav_charts');
        updateNavTexts('alerts', 'nav_alerts');
        updateNavTexts('settings', 'nav_settings');
        updateNavTexts('reports', 'nav_reports');

        // Header connection status
        const statusText = document.querySelector('.connection-status .status-text');
        if (statusText) {
            const isOnline = document.getElementById('connection-status').classList.contains('online');
            statusText.textContent = isOnline ? window.i18n.t('status_online') : window.i18n.t('status_offline');
        }

        // Alerts page title
        const alertsTitle = document.querySelector('.alerts-title');
        if (alertsTitle) alertsTitle.textContent = window.i18n.t('alerts_title');
        const clearAllAlertsBtn = document.getElementById('clear-all-alerts');
        if (clearAllAlertsBtn) clearAllAlertsBtn.textContent = window.i18n.t('alerts_clear_all');

        // Update charts toggles text
        const toggleTemp = document.querySelector('.chart-toggle[data-metric="temp"]');
        if (toggleTemp) toggleTemp.textContent = window.i18n.t('metric_temp');
        const toggleHumidity = document.querySelector('.chart-toggle[data-metric="humidity"]');
        if (toggleHumidity) toggleHumidity.textContent = window.i18n.t('metric_humidity');

        // Time tabs in charts
        const timeTab24h = document.querySelector('.time-tab[data-range="24h"]');
        if (timeTab24h) timeTab24h.textContent = window.i18n.t('range_24h');
        const timeTab7d = document.querySelector('.time-tab[data-range="7d"]');
        if (timeTab7d) timeTab7d.textContent = window.i18n.t('range_7d');
        const timeTab30d = document.querySelector('.time-tab[data-range="30d"]');
        if (timeTab30d) timeTab30d.textContent = window.i18n.t('range_30d');
    }

    // ----------------------------------------------------------
    // Navigation with Smooth Slide Transitions
    // ----------------------------------------------------------
    navigate(screenId, forcedDirection = null) {
        if (this.isNavigating) return;
        const screens = ['dashboard', 'charts', 'alerts', 'settings', 'reports'];
        if (!screens.includes(screenId)) return;

        const oldScreenId = this.currentScreen;
        const oldScreen = document.getElementById(`screen-${oldScreenId}`);
        const newScreen = document.getElementById(`screen-${screenId}`);
        if (!newScreen) return;

        if (screenId === oldScreenId && newScreen.classList.contains('active')) {
            return;
        }

        const oldIdx = screens.indexOf(oldScreenId);
        const newIdx = screens.indexOf(screenId);
        const direction = forcedDirection || (newIdx >= oldIdx ? 'next' : 'prev');

        this.currentScreen = screenId;

        // Update nav active states
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenId);
        });

        // Position the sliding nav indicator pill
        const pill = document.getElementById('nav-indicator-pill');
        if (pill && typeof newIdx === 'number' && newIdx >= 0) {
            pill.style.transform = `translateX(${newIdx * 100}%)`;
        }

        // Trigger screen-specific renders immediately
        this.triggerScreenRender(screenId);

        // Slide transition between screens
        if (oldScreen && oldScreen !== newScreen && oldScreen.classList.contains('active')) {
            this.isNavigating = true;

            const outAnim = direction === 'next' ? 'slide-out-to-left' : 'slide-out-to-right';
            const inAnim = direction === 'next' ? 'slide-in-from-right' : 'slide-in-from-left';

            oldScreen.classList.remove('slide-in-from-right', 'slide-in-from-left', 'slide-out-to-left', 'slide-out-to-right');
            newScreen.classList.remove('slide-in-from-right', 'slide-in-from-left', 'slide-out-to-left', 'slide-out-to-right');

            oldScreen.classList.add('sliding-out', outAnim);
            newScreen.classList.add('sliding-in', inAnim);

            setTimeout(() => {
                oldScreen.classList.remove('active', 'sliding-out', 'slide-out-to-left', 'slide-out-to-right');
                newScreen.classList.remove('sliding-in', 'slide-in-from-right', 'slide-in-from-left');
                newScreen.classList.add('active');
                this.isNavigating = false;

                // Extra render pass for charts if entering charts screen
                if (screenId === 'charts' && window.ChartManager) {
                    window.ChartManager.renderLineChart(
                        'main-chart',
                        window.DataManager.currentRoomId,
                        window.ChartManager.activeRange
                    );
                }
            }, 260);
        } else {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'sliding-out', 'sliding-in'));
            newScreen.classList.add('active');
        }
    }

    triggerScreenRender(screenId) {
        switch (screenId) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'charts':
                setTimeout(() => {
                    if (window.ChartManager) {
                        window.ChartManager.renderLineChart(
                            'main-chart',
                            window.DataManager.currentRoomId,
                            window.ChartManager.activeRange
                        );
                        window.ChartManager.updateStats();
                    }
                }, 50);
                break;
            case 'alerts':
                if (window.AlertManager) window.AlertManager.renderAlertsList();
                break;
            case 'settings':
                if (window.SettingsManager) window.SettingsManager.renderSettings();
                break;
            case 'reports':
                setTimeout(() => {
                    if (window.ReportManager) window.ReportManager.renderReports();
                }, 50);
                break;
        }
    }

    cycleScreen(direction) {
        const screens = ['dashboard', 'charts', 'alerts', 'settings', 'reports'];
        const currentIdx = screens.indexOf(this.currentScreen);
        if (currentIdx === -1) return;

        let targetIdx;
        if (direction === 'next') {
            if (currentIdx < screens.length - 1) {
                targetIdx = currentIdx + 1;
            } else {
                return;
            }
        } else {
            if (currentIdx > 0) {
                targetIdx = currentIdx - 1;
            } else {
                return;
            }
        }
        this.navigate(screens[targetIdx], direction);
    }

    // ----------------------------------------------------------
    // Metric Carousel Switching (CO2 <-> Temp <-> Humidity)
    // ----------------------------------------------------------
    // ----------------------------------------------------------
    // Metric Carousel Switching (CO2 <-> Temp <-> Humidity)
    // ----------------------------------------------------------
    switchMetric(type, direction = 'next') {
        const metrics = ['co2', 'temp', 'humidity'];
        if (!metrics.includes(type)) return;
        if (type === this.activeMetric) return;

        const animClass = direction === 'next' ? 'metric-slide-left' : 'metric-slide-right';
        const gaugeSvg = document.getElementById('main-gauge-svg-container');
        const gaugeDesc = document.getElementById('main-gauge-desc');
        const sparkline = document.getElementById('main-gauge-sparkline');
        const gaugeTitleWrap = document.querySelector('.gauge-header-title-wrap');

        this.activeMetric = type;

        // Update metric pagination dots
        document.querySelectorAll('.metric-dot').forEach(dot => {
            dot.classList.toggle('active', dot.getAttribute('data-metric') === type);
        });

        // Re-render dashboard with new active metric
        this.renderDashboard();

        // Trigger smooth entry animation on updated content
        [gaugeTitleWrap, gaugeSvg, gaugeDesc, sparkline].forEach(el => {
            if (el) {
                el.classList.remove('metric-slide-left', 'metric-slide-right');
                void el.offsetWidth; // Trigger reflow for re-animation
                el.classList.add(animClass);
            }
        });
    }

    cycleMetric(direction = 'next') {
        const metrics = ['co2', 'temp', 'humidity'];
        const currentIdx = metrics.indexOf(this.activeMetric);
        const nextIdx = direction === 'next'
            ? (currentIdx + 1) % metrics.length
            : (currentIdx - 1 + metrics.length) % metrics.length;
        this.switchMetric(metrics[nextIdx], direction);
    }

    setupMetricCarousel() {
        const dots = document.querySelectorAll('.metric-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetMetric = dot.getAttribute('data-metric');
                const metrics = ['co2', 'temp', 'humidity'];
                const currentIdx = metrics.indexOf(this.activeMetric);
                const nextIdx = metrics.indexOf(targetMetric);
                const dir = nextIdx >= currentIdx ? 'next' : 'prev';
                this.switchMetric(targetMetric, dir);
            });
        });
    }

    // ----------------------------------------------------------
    // Touch Swipe Gestures for Mobile (Live Gauge Drag & Clean Screen Swipe)
    // ----------------------------------------------------------
    setupSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchLastX = 0;
        let touchLastY = 0;
        let touchStartTime = 0;
        let isTouching = false;
        let touchTargetGauge = false;
        let gestureMode = null; // 'horizontal' | 'vertical' | null
        let draggedGauge = null;

        const onTouchStart = (e) => {
            if (this.isNavigating) return;
            const touch = (e.touches && e.touches[0]) || e;
            if (!touch) return;

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchLastX = touch.clientX;
            touchLastY = touch.clientY;
            touchStartTime = Date.now();
            isTouching = true;
            gestureMode = null;

            const targetEl = e.target || touch.target;
            touchTargetGauge = !!(targetEl && targetEl.closest && targetEl.closest('#main-gauge-card'));

            if (touchTargetGauge && this.currentScreen === 'dashboard') {
                draggedGauge = document.getElementById('main-gauge-card');
            } else {
                draggedGauge = null;
            }
        };

        const onTouchMove = (e) => {
            if (!isTouching || this.isNavigating) return;
            const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
            if (!touch || typeof touch.clientX !== 'number') return;

            touchLastX = touch.clientX;
            touchLastY = touch.clientY;
            const diffX = touchLastX - touchStartX;
            const diffY = touchLastY - touchStartY;

            // Determine gesture orientation
            if (!gestureMode) {
                if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
                    if (Math.abs(diffX) >= Math.abs(diffY) * 1.15) {
                        gestureMode = 'horizontal';
                    } else {
                        gestureMode = 'vertical';
                    }
                }
            }

            // Live tactile feedback when dragging inside the gauge card
            if (gestureMode === 'horizontal' && draggedGauge) {
                const translateX = diffX * 0.28;
                draggedGauge.style.transform = `translate3d(${translateX}px, 0, 0)`;
                draggedGauge.style.transition = 'none';
            }
        };

        const onTouchEnd = (e) => {
            if (!isTouching) return;
            isTouching = false;

            const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
            const endX = (touch && typeof touch.clientX === 'number' && touch.clientX !== 0) ? touch.clientX : touchLastX;
            const deltaX = endX - touchStartX;
            const deltaTime = Math.max(Date.now() - touchStartTime, 1);
            const velocity = Math.abs(deltaX) / deltaTime; // px/ms

            const activeGauge = draggedGauge;
            const isGauge = touchTargetGauge;
            draggedGauge = null;

            if (gestureMode === 'horizontal') {
                const minDistance = 35; // px
                const isFlick = Math.abs(deltaX) > 20 && velocity > 0.3;

                if (Math.abs(deltaX) >= minDistance || isFlick) {
                    // Successful swipe! Clear drag transform before playing transition
                    if (activeGauge) {
                        activeGauge.style.transform = '';
                        activeGauge.style.transition = '';
                    }
                    const direction = deltaX < 0 ? 'next' : 'prev';
                    if (isGauge && this.currentScreen === 'dashboard') {
                        this.cycleMetric(direction);
                    } else {
                        this.cycleScreen(direction);
                    }
                } else {
                    // Elastic snap back to center for gauge card
                    if (activeGauge) {
                        activeGauge.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
                        activeGauge.style.transform = 'translate3d(0, 0, 0)';
                        setTimeout(() => {
                            if (activeGauge) {
                                activeGauge.style.transform = '';
                                activeGauge.style.transition = '';
                            }
                        }, 220);
                    }
                }
            } else if (activeGauge) {
                activeGauge.style.transform = '';
                activeGauge.style.transition = '';
            }

            gestureMode = null;
            touchTargetGauge = false;
        };

        const frame = document.querySelector('.phone-frame') || document.body;
        frame.addEventListener('touchstart', onTouchStart, { passive: true });
        frame.addEventListener('touchmove', onTouchMove, { passive: true });
        frame.addEventListener('touchend', onTouchEnd, { passive: true });

        // Pointer event support for desktop / mouse / simulator testing
        frame.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.target.closest('button, a, input, select, textarea, .nav-item, .time-tab, .chart-toggle, .theme-pill-btn, .metric-dot')) return;
            onTouchStart(e);
        });
        window.addEventListener('pointermove', (e) => {
            onTouchMove(e);
        });
        window.addEventListener('pointerup', (e) => {
            onTouchEnd(e);
        });
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                if (screen) {
                    this.navigate(screen);
                }
            });
        });

        // Event listener for swappable metrics on preview cards
        const container = document.querySelector('.preview-cards-container');
        if (container) {
            container.addEventListener('click', (e) => {
                const card = e.target.closest('.preview-card');
                if (card) {
                    const type = card.getAttribute('data-type');
                    if (type) {
                        const metrics = ['co2', 'temp', 'humidity'];
                        const currentIdx = metrics.indexOf(this.activeMetric);
                        const nextIdx = metrics.indexOf(type);
                        const dir = nextIdx >= currentIdx ? 'next' : 'prev';
                        this.switchMetric(type, dir);
                    }
                }
            });
        }
    }

    setupCornerMenu() {
        const btnToggle = document.getElementById('menu-toggle-btn');
        const popover = document.getElementById('corner-menu-popover');
        const backdrop = document.getElementById('corner-menu-backdrop');
        const btnClose = document.getElementById('corner-menu-close');

        if (!btnToggle || !popover) return;

        const openMenu = () => {
            btnToggle.classList.add('active');
            popover.classList.add('open');
            if (backdrop) backdrop.classList.add('open');
        };

        const closeMenu = () => {
            btnToggle.classList.remove('active');
            popover.classList.remove('open');
            if (backdrop) backdrop.classList.remove('open');
        };

        btnToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (popover.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        if (btnClose) {
            btnClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMenu();
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                closeMenu();
            });
        }

        // Tự động đóng menu khi chọn bất kỳ mục nào
        popover.querySelectorAll('.corner-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Đóng khi bấm phím Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && popover.classList.contains('open')) {
                closeMenu();
            }
        });
    }



    // ----------------------------------------------------------
    // Dashboard Rendering
    // ----------------------------------------------------------
    renderDashboard() {
        const data = window.DataManager.getCurrentData();
        if (!data) return;

        const thresholds = window.DataManager.getThresholds();

        // Update phone frame status glow classes
        const status = window.DataManager.getStatus(data);
        const frame = document.querySelector('.phone-frame');
        if (frame) {
            frame.classList.remove('status-good', 'status-warning', 'status-danger');
            frame.classList.add(`status-${status}`);
        }

        // Setup metric configurations
        const unitSetting = window.DataManager.getSettings().unit || 'C';
        const metricConfigs = {
            co2: {
                min: 0,
                max: 5000,
                color: data.co2 > thresholds.co2.max ? '#e74c3c' : (data.co2 > 1000 ? '#ffa502' : '#2ecc71'),
                glowColor: data.co2 > thresholds.co2.max ? 'rgba(231, 76, 60, 0.3)' : (data.co2 > 1000 ? 'rgba(255, 165, 2, 0.3)' : 'rgba(46, 204, 113, 0.3)'),
                label: window.i18n.t('metric_co2'),
                unit: 'ppm',
                type: 'co2',
                icon: '💨'
            },
            temp: {
                min: 0,
                max: 50,
                color: '#f39c12',
                glowColor: 'rgba(243, 156, 18, 0.3)',
                label: window.i18n.t('metric_temp'),
                unit: '°C',
                type: 'temp',
                icon: '🌡️'
            },
            humidity: {
                min: 0,
                max: 100,
                color: '#3498db',
                glowColor: 'rgba(52, 152, 219, 0.3)',
                label: window.i18n.t('metric_humidity'),
                unit: '%',
                type: 'humidity',
                icon: '💧'
            }
        };

        if (unitSetting === 'F') {
            metricConfigs.temp.min = 32;
            metricConfigs.temp.max = 122;
            metricConfigs.temp.unit = '°F';
        }

        const getDisplayValue = (type) => {
            const val = data[type];
            if (type === 'temp' && unitSetting === 'F') {
                return (val * 9 / 5) + 32;
            }
            return val;
        };

        // Render main gauge card
        const mainCard = document.getElementById('main-gauge-card');
        const mainIcon = document.getElementById('main-gauge-icon');
        const mainTitle = document.getElementById('main-gauge-title');
        
        const outStatus = window.AlertManager ? window.AlertManager.getOutOfRangeStatus('my-car') : null;
        const isThisMetricAlerted = outStatus && outStatus.hasAlerted && outStatus.primaryViolation && outStatus.primaryViolation.type === this.activeMetric;
        const isThisMetricPending = outStatus && outStatus.hasPending && outStatus.primaryViolation && outStatus.primaryViolation.type === this.activeMetric;

        if (mainCard) {
            mainCard.setAttribute('data-type', this.activeMetric);
            mainCard.classList.remove('status-danger', 'status-warning', 'status-good');
            if (isThisMetricAlerted) {
                mainCard.classList.add('status-danger');
            } else if (isThisMetricPending) {
                mainCard.classList.add('status-warning');
            } else {
                mainCard.classList.add('status-good');
            }
        }
        if (mainIcon) mainIcon.textContent = metricConfigs[this.activeMetric].icon;
        if (mainTitle) mainTitle.textContent = metricConfigs[this.activeMetric].label;

        // Sync metric pagination dots
        document.querySelectorAll('.metric-dot').forEach(dot => {
            dot.classList.toggle('active', dot.getAttribute('data-metric') === this.activeMetric);
        });

        const mainConfig = metricConfigs[this.activeMetric];
        const mainVal = getDisplayValue(this.activeMetric);

        window.GaugeRenderer.updateGauge('main-gauge-svg-container', mainVal, {
            min: mainConfig.min,
            max: mainConfig.max,
            color: mainConfig.color,
            glowColor: mainConfig.glowColor,
            label: mainConfig.label,
            unit: mainConfig.unit,
            type: mainConfig.type
        });

        // Determine health advice description under the main gauge
        let descKey = '';
        if (this.activeMetric === 'co2') {
            if (isThisMetricAlerted) {
                descKey = 'desc_co2_danger';
            } else if (isThisMetricPending || data.co2 > 1000) {
                descKey = 'desc_co2_warning';
            } else {
                descKey = 'desc_co2_good';
            }
        } else if (this.activeMetric === 'temp') {
            if (isThisMetricAlerted) {
                descKey = 'desc_temp_danger';
            } else if (isThisMetricPending || data.temp > thresholds.temp.max || data.temp < thresholds.temp.min) {
                descKey = 'desc_temp_warning';
            } else {
                descKey = 'desc_temp_good';
            }
        } else if (this.activeMetric === 'humidity') {
            if (isThisMetricAlerted) {
                descKey = 'desc_humidity_danger';
            } else if (isThisMetricPending || data.humidity > thresholds.humidity.max || data.humidity < thresholds.humidity.min) {
                descKey = 'desc_humidity_warning';
            } else {
                descKey = 'desc_humidity_good';
            }
        }

        const gaugeDescEl = document.getElementById('main-gauge-desc');
        if (gaugeDescEl) {
            gaugeDescEl.textContent = window.i18n.t(descKey);
        }

        // Render main gauge sparkline
        const history = window.DataManager.getHistory(window.DataManager.currentRoomId, '24h');
        const recentHistory = history.slice(-20);
        const activeHistory = this.activeMetric === 'temp' && unitSetting === 'F'
            ? recentHistory.map(d => (d.temp * 9 / 5) + 32)
            : recentHistory.map(d => d[this.activeMetric]);
        
        window.GaugeRenderer.renderSparkline('main-gauge-sparkline', activeHistory, mainConfig.color);

        // Render preview cards for the other two metrics
        const allMetrics = ['co2', 'temp', 'humidity'];
        const previewMetrics = allMetrics.filter(m => m !== this.activeMetric);

        const renderPreviewCard = (elId, type) => {
            const card = document.getElementById(elId);
            if (!card) return;

            const config = metricConfigs[type];
            const val = getDisplayValue(type);
            const valFormatted = type === 'temp' ? `${val.toFixed(1)}${config.unit}` : `${Math.round(val)}${config.unit}`;

            card.setAttribute('data-type', type);
            const isCardAlerted = outStatus && outStatus.hasAlerted && outStatus.primaryViolation && outStatus.primaryViolation.type === type;
            const isCardPending = outStatus && outStatus.hasPending && outStatus.primaryViolation && outStatus.primaryViolation.type === type;
            card.classList.remove('status-danger', 'status-warning', 'status-good');
            if (isCardAlerted) {
                card.classList.add('status-danger');
            } else if (isCardPending) {
                card.classList.add('status-warning');
            } else {
                card.classList.add('status-good');
            }

            card.innerHTML = `
                <div class="preview-card-icon">${config.icon}</div>
                <div class="preview-card-info">
                    <span class="preview-card-label">${config.label}</span>
                    <span class="preview-card-value">${valFormatted}</span>
                </div>
            `;
        };

        renderPreviewCard('preview-card-left', previewMetrics[0]);
        renderPreviewCard('preview-card-right', previewMetrics[1]);

        // Update Smart Assistant on Desktop & Widescreen
        this.renderAssistantTips(data, thresholds);

        // Update last-update time
        const lastUpdate = document.getElementById('last-update');
        if (lastUpdate) {
            const now = new Date();
            const locale = window.i18n.lang === 'vi' ? 'vi-VN' : window.i18n.lang === 'zh' ? 'zh-CN' : 'en-US';
            const timeStr = now.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            lastUpdate.textContent = `${window.i18n.t('last_update')}: ${timeStr}`;
        }
    }

    renderAssistantTips(data, thresholds) {
        const ventTitle = document.getElementById('tip-vent-title');
        const ventDesc = document.getElementById('tip-vent-desc');
        const humTitle = document.getElementById('tip-hum-title');
        const humDesc = document.getElementById('tip-hum-desc');
        const thermalTitle = document.getElementById('tip-thermal-title');
        const thermalDesc = document.getElementById('tip-thermal-desc');

        if (!ventTitle) return;

        const tipVent = document.getElementById('tip-ventilation');
        const tipHum = document.getElementById('tip-humidity');
        const tipThermal = document.getElementById('tip-thermal');

        // 1. CO2 Cabin Ventilation Advice
        if (tipVent) {
            tipVent.classList.remove('warn-active', 'danger-active');
            if (data.co2 > thresholds.co2.max) {
                tipVent.classList.add('danger-active');
                ventTitle.textContent = 'Khẩn cấp: Bật lấy gió ngoài ngay';
                ventDesc.textContent = `CO₂ đạt ${Math.round(data.co2)} ppm. Nguy cơ buồn ngủ và giảm tập trung. Hãy hạ kính hoặc bật gió ngoài.`;
            } else if (data.co2 > 1200) {
                tipVent.classList.add('warn-active');
                ventTitle.textContent = 'Khuyên dùng: Chuyển sang lấy gió ngoài';
                ventDesc.textContent = `CO₂ đang tích tụ (${Math.round(data.co2)} ppm). Khoang xe đang ngột ngạt, hãy cấp thêm khí tươi.`;
            } else {
                ventTitle.textContent = 'Chế độ gió: Tự động / Lấy gió trong';
                ventDesc.textContent = `Nồng độ CO₂ an toàn (${Math.round(data.co2)} ppm). Không khí trong lành, tài xế hoàn toàn tỉnh táo.`;
            }
        }

        // 2. Humidity & AC Defrost Advice
        if (tipHum) {
            tipHum.classList.remove('warn-active', 'danger-active');
            if (data.humidity > 75) {
                tipHum.classList.add('warn-active');
                humTitle.textContent = 'Nguy cơ mờ kính lái (Độ ẩm cao)';
                humDesc.textContent = `Độ ẩm buồng lái ${Math.round(data.humidity)}%. Bật sấy kính (Defrost) và AC để chống đọng hơi nước.`;
            } else if (data.humidity < 35) {
                tipHum.classList.add('warn-active');
                humTitle.textContent = 'Không khí khô trong cabin';
                humDesc.textContent = `Độ ẩm ${Math.round(data.humidity)}%. Điều hòa làm khô khoang xe, có thể gây khô rát mắt đường dài.`;
            } else {
                humTitle.textContent = 'Điều hòa & Độ ẩm tối ưu';
                humDesc.textContent = `Độ ẩm ${Math.round(data.humidity)}% và nhiệt độ ${data.temp.toFixed(1)}°C ở dải thoải mái lý tưởng.`;
            }
        }

        // 3. Thermal Comfort & Dew Point
        const T = data.temp;
        const RH = data.humidity;
        // Magnus formula for Dew Point:
        const a = 17.27, b = 237.7;
        const alpha = ((a * T) / (b + T)) + Math.log(Math.max(1, RH) / 100);
        const dewPoint = (b * alpha) / (a - alpha);

        // Heat Index calculation (Rothfusz formula):
        const Tf = (T * 9 / 5) + 32;
        let hiF;
        if (Tf < 80) {
            hiF = 0.5 * (Tf + 61.0 + ((Tf - 68.0) * 1.2) + (RH * 0.094));
        } else {
            hiF = -42.379 + 2.04901523 * Tf + 10.14333127 * RH - 0.22475541 * Tf * RH 
                - 0.00683783 * Tf * Tf - 0.05481717 * RH * RH + 0.00122874 * Tf * Tf * RH 
                + 0.00085282 * Tf * RH * RH - 0.00000199 * Tf * Tf * RH * RH;
        }
        const heatIndexC = (hiF - 32) * 5 / 9;

        if (tipThermal && thermalTitle && thermalDesc) {
            tipThermal.classList.remove('warn-active', 'danger-active');
            if (T > 32) {
                tipThermal.classList.add('danger-active');
                thermalTitle.textContent = 'Cảnh báo buồng lái quá nóng';
                thermalDesc.textContent = `Nhiệt độ ${T.toFixed(1)}°C (Cảm giác: ${heatIndexC.toFixed(1)}°C) • Điểm sương: ${dewPoint.toFixed(1)}°C. Khuyến cáo giảm nhiệt độ điều hòa.`;
            } else if (T < 16) {
                tipThermal.classList.add('warn-active');
                thermalTitle.textContent = 'Nhiệt độ cabin thấp';
                thermalDesc.textContent = `Nhiệt độ ${T.toFixed(1)}°C (Cảm giác: ${heatIndexC.toFixed(1)}°C) • Điểm sương: ${dewPoint.toFixed(1)}°C. Khuyến cáo tăng nhiệt sưởi ấm.`;
            } else {
                thermalTitle.textContent = 'Cân bằng nhiệt & Điểm sương';
                thermalDesc.textContent = `Cảm giác nhiệt thực tế: ${heatIndexC.toFixed(1)}°C • Điểm sương buồng lái: ${dewPoint.toFixed(1)}°C`;
            }
        }
    }

    // ----------------------------------------------------------
    // Realtime Updates
    // ----------------------------------------------------------
    startRealtimeUpdates() {
        const interval = window.DataManager.getSettings().updateInterval || 3000;

        this.updateTimer = setInterval(() => {
            // Nếu phần cứng ESP32 đang gửi dữ liệu thật, không tạo dữ liệu giả lập ngẫu nhiên
            if (this.isHardwareActive) return;

            // Generate new readings for all rooms
            window.DataManager.getRooms().forEach(room => {
                const reading = window.DataManager.generateReading(room.id);

                // Check thresholds for current room
                if (reading) {
                    window.AlertManager.checkAndAlert(reading, room.id, room.name);
                }
            });

            // Update phone frame status glow globally in background
            const currentReading = window.DataManager.getCurrentData();
            if (currentReading) {
                const globalStatus = window.DataManager.getStatus(currentReading);
                const globalFrame = document.querySelector('.phone-frame');
                if (globalFrame) {
                    globalFrame.classList.remove('status-good', 'status-warning', 'status-danger');
                    globalFrame.classList.add(`status-${globalStatus}`);
                }
            }

            // Update current screen
            if (this.currentScreen === 'dashboard') {
                this.renderDashboard();
            } else if (this.currentScreen === 'charts') {
                // Update chart with new data
                window.ChartManager.renderLineChart(
                    'main-chart',
                    window.DataManager.currentRoomId,
                    window.ChartManager.activeRange
                );
                window.ChartManager.updateStats();
            } else if (this.currentScreen === 'alerts') {
                window.AlertManager.renderAlertsList();
            }
        }, interval);
    }

    restartRealtimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        this.startRealtimeUpdates();
    }

    onHardwareData(co2, temp, hum, source = 'BLE') {
        this.isHardwareActive = true;
        this.updateConnectionStatus(true);

        const reading = window.DataManager.setHardwareReading(co2, temp, hum);
        if (!reading) return;

        // Cảnh báo ngưỡng nguy hiểm & giọng nói
        window.AlertManager.checkAndAlert(reading, 'my-car', window.i18n.t('default_car_single'));

        // Cập nhật quầng sáng màu xe trên khung điện thoại
        const globalStatus = window.DataManager.getStatus(reading);
        const globalFrame = document.querySelector('.phone-frame');
        if (globalFrame) {
            globalFrame.classList.remove('status-good', 'status-warning', 'status-danger');
            globalFrame.classList.add(`status-${globalStatus}`);
        }

        // Cập nhật màn hình hiện tại
        if (this.currentScreen === 'dashboard') {
            this.renderDashboard();
        } else if (this.currentScreen === 'charts') {
            window.ChartManager.renderLineChart(
                'main-chart',
                window.DataManager.currentRoomId,
                window.ChartManager.activeRange
            );
            window.ChartManager.updateStats();
        } else if (this.currentScreen === 'alerts') {
            window.AlertManager.renderAlertsList();
        }
    }

    // ----------------------------------------------------------
    // Room Selector
    // ----------------------------------------------------------
    setupRoomSelector() {
        // Disabled in single vehicle mode
    }

    // ----------------------------------------------------------
    // Connection Status
    // ----------------------------------------------------------
    updateConnectionStatus(online = true) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        if (online) {
            statusEl.classList.add('online');
            statusEl.classList.remove('offline');
            statusEl.querySelector('.status-text').textContent = 'Online';
        } else {
            statusEl.classList.remove('online');
            statusEl.classList.add('offline');
            statusEl.querySelector('.status-text').textContent = 'Offline';
        }
    }
}

// ----------------------------------------------------------
// Bootstrap
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    App._instance = app;
    window.app = app;
    app.init();
});

window.App = App;
