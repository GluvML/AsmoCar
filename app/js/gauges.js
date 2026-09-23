// ============================================================
// GaugeRenderer - Hypercar Cockpit SVG Gauges & Splines
// ============================================================

class GaugeRenderer {
    constructor() {
        this._animationFrames = new Map();
        this._currentValues = new Map();

        this.colors = {
            co2: { main: '#14b8a6', glow: 'rgba(20, 184, 166, 0.25)', gradient: ['#2dd4bf', '#0d9488'] },
            temp: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.22)', gradient: ['#fbbf24', '#d97706'] },
            humidity: { main: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.22)', gradient: ['#38bdf8', '#0284c7'] }
        };
    }

    // ----------------------------------------------------------
    // Render Radial Graduation Ticks
    // ----------------------------------------------------------
    _renderTicks(percentage, activeColor) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const totalTicks = 28;
        let ticksSvg = '';
        const rInner = 48;
        
        for (let i = 0; i <= totalTicks; i++) {
            // Bỏ vạch cực trị đầu và cuối (i = 0 và i = totalTicks) để tạo khoảng thở và tránh đè/cắt qua số min/max
            if (i === 0 || i === totalTicks) continue;

            const frac = i / totalTicks;
            const angleDeg = 135 + 270 * frac;
            const rad = angleDeg * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const isMajor = (i % 4 === 0);
            const rOuter = isMajor ? 55 : 52;
            const x1 = (70 + rInner * cos).toFixed(2);
            const y1 = (70 + rInner * sin).toFixed(2);
            const x2 = (70 + rOuter * cos).toFixed(2);
            const y2 = (70 + rOuter * sin).toFixed(2);

            const isActive = (frac * 100) <= percentage;
            const inactiveColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.09)';
            const strokeColor = isActive ? activeColor : inactiveColor;
            const opacity = isActive ? (isMajor ? '1' : '0.8') : (isMajor ? (isLight ? '0.5' : '0.35') : (isLight ? '0.28' : '0.18'));
            const strokeWidth = isMajor ? '1.5' : '1';

            ticksSvg += `<line class="gauge-tick" data-frac="${frac}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="${opacity}" />`;
        }
        return ticksSvg;
    }

    // ----------------------------------------------------------
    // Render a full gauge (first time)
    // ----------------------------------------------------------
    renderGauge(containerId, options) {
        const { value, min, max, color, glowColor, label, unit, type } = options;
        const container = document.getElementById(containerId);
        if (!container) return;

        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        const radius = 60;
        const activeLength = 282.74 * (percentage / 100);
        const strokeOpacity = percentage > 0 ? 1 : 0;

        const statusClass = this._getStatusForValue(type, value);
        const isDanger = statusClass === 'danger';

        let colorSet;
        if (type === 'co2') {
            colorSet = this._getCo2Colors(value);
        } else {
            colorSet = this.colors[type] || { main: color, glow: glowColor, gradient: [color, color] };
        }
        const gradientId = `gradient-${containerId}`;
        const filterId = `glow-${containerId}`;
        const blurFilterId = `bloom-${containerId}`;
        const centerGlowId = `center-glow-${containerId}`;

        const statusRingColor = statusClass === 'danger' ? '#ff3b30' : statusClass === 'warning' ? '#ff9f0a' : colorSet.main;

        // Calculate progress tip coordinates (sweep starts at 135 deg and spans 270 deg)
        const sweepAngle = 135 + 270 * (percentage / 100);
        const sweepAngleRad = sweepAngle * Math.PI / 180;
        const dotX = 70 + radius * Math.cos(sweepAngleRad);
        const dotY = 70 + radius * Math.sin(sweepAngleRad);

        const ticksHtml = this._renderTicks(percentage, statusRingColor);
        const trackColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
        const rimColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
        const unitColor = isLight ? '#475569' : 'rgba(255,255,255,0.55)';
        const rangeColor = isLight ? '#64748b' : 'rgba(255,255,255,0.35)';

        const svg = `
            <svg viewBox="0 0 140 140" class="gauge-svg ${isDanger ? 'flash-danger' : ''}">
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${colorSet.gradient[0]};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${colorSet.gradient[1]};stop-opacity:1" />
                    </linearGradient>
                    <radialGradient id="${centerGlowId}" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style="stop-color:${colorSet.gradient[0]};stop-opacity:${isLight ? '0.12' : '0.18'}" />
                        <stop offset="80%" style="stop-color:${colorSet.gradient[0]};stop-opacity:0.03" />
                        <stop offset="100%" style="stop-color:${colorSet.gradient[0]};stop-opacity:0" />
                    </radialGradient>
                    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="${blurFilterId}" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="6" />
                    </filter>
                </defs>

                <!-- Cockpit Ambient Center Glow -->
                <circle cx="70" cy="70" r="46"
                    fill="url(#${centerGlowId})"
                    class="gauge-center-glow" />

                <!-- Dial Outer Border Rim -->
                <circle cx="70" cy="70" r="66.5"
                    class="gauge-rim"
                    fill="none"
                    stroke="${rimColor}"
                    stroke-width="1" />

                <!-- Background Track -->
                <circle cx="70" cy="70" r="${radius}"
                    class="gauge-bg-track"
                    fill="none"
                    stroke="${trackColor}"
                    stroke-width="7"
                    stroke-linecap="round"
                    stroke-dasharray="282.74 377"
                    transform="rotate(135 70 70)" />

                <!-- Radial Graduations / Instrument Ticks -->
                <g class="gauge-ticks-group">
                    ${ticksHtml}
                </g>

                <!-- Dual-layer Neon Bloom Arc (Diffusion Layer) -->
                <circle cx="70" cy="70" r="${radius}"
                    fill="none"
                    stroke="url(#${gradientId})"
                    stroke-width="12"
                    stroke-linecap="round"
                    stroke-dasharray="${activeLength} 377"
                    stroke-opacity="${strokeOpacity * (isLight ? 0.25 : 0.35)}"
                    transform="rotate(135 70 70)"
                    filter="url(#${blurFilterId})"
                    class="gauge-bloom" />

                <!-- Core Laser Beam Progress Arc -->
                <circle cx="70" cy="70" r="${radius}"
                    fill="none"
                    stroke="url(#${gradientId})"
                    stroke-width="6.5"
                    stroke-linecap="round"
                    stroke-dasharray="${activeLength} 377"
                    stroke-opacity="${strokeOpacity}"
                    transform="rotate(135 70 70)"
                    filter="url(#${filterId})"
                    class="gauge-progress" />

                <!-- Needle Tip Diamond / Glowing Bead Indicator -->
                <g class="gauge-pointer-group" transform="translate(0, 0)">
                    <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="8"
                        fill="${statusRingColor}" opacity="${isLight ? 0.2 : 0.3}" class="gauge-dot-halo" />
                    <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="4.5"
                        fill="#ffffff"
                        stroke="${statusRingColor}"
                        stroke-width="2"
                        class="gauge-dot" />
                </g>

                <!-- Center Value Display (Modern Clean Typography) -->
                <text x="70" y="60" text-anchor="middle" dominant-baseline="middle"
                    class="gauge-value-text"
                    fill="${statusRingColor}"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    font-size="24" font-weight="700" letter-spacing="-0.5px">
                    ${this._formatValue(value, type)}
                </text>

                <!-- Unit Label with Precision Tech Vibe -->
                <text x="70" y="80" text-anchor="middle" dominant-baseline="middle"
                    class="gauge-unit-text"
                    fill="${unitColor}"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    font-size="9.5" font-weight="600" letter-spacing="1px" text-transform="uppercase">
                    ${unit}
                </text>

                <!-- Min/Max Range Markers (Được đặt thông thoáng ở cung đáy mở, không bị vạch hay kim đè) -->
                <text x="44" y="114" text-anchor="middle" dominant-baseline="central"
                    class="gauge-range-marker gauge-range-min"
                    fill="${rangeColor}"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    font-size="9.5" font-weight="600">
                    ${min}
                </text>
                <text x="96" y="114" text-anchor="middle" dominant-baseline="central"
                    class="gauge-range-marker gauge-range-max"
                    fill="${rangeColor}"
                    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                    font-size="9.5" font-weight="600">
                    ${max}
                </text>
            </svg>
        `;

        container.innerHTML = svg;
        this._currentValues.set(containerId, { value, min, max, type, unit, color, glowColor });
    }

    // ----------------------------------------------------------
    // Update gauge with animation
    // ----------------------------------------------------------
    updateGauge(containerId, newValue, options) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const prev = this._currentValues.get(containerId);

        if (!prev || prev.type !== options.type) {
            this.renderGauge(containerId, { ...options, value: newValue });
            return;
        }

        if (this._animationFrames.has(containerId)) {
            cancelAnimationFrame(this._animationFrames.get(containerId));
            this._animationFrames.delete(containerId);
        }

        const oldValue = prev ? prev.value : (options.min || 0);
        const { min, max, type, unit } = { ...prev, ...options };

        // Keep internal state updated immediately
        this._currentValues.set(containerId, { value: oldValue, min, max, type, unit });

        // Update labels if needed
        const unitEl = container.querySelector('.gauge-unit-text');
        if (unitEl && unit) unitEl.textContent = unit;
        const minEl = container.querySelector('.gauge-range-min');
        if (minEl && min !== undefined) minEl.textContent = min;
        const maxEl = container.querySelector('.gauge-range-max');
        if (maxEl && max !== undefined) maxEl.textContent = max;

        const duration = 650; // ms
        const startTime = performance.now();
        const radius = 60;

        const progressEl = container.querySelector('.gauge-progress');
        const bloomEl = container.querySelector('.gauge-bloom');
        const valueTextEl = container.querySelector('.gauge-value-text');
        const dotEl = container.querySelector('.gauge-dot');
        const dotHaloEl = container.querySelector('.gauge-dot-halo');
        const centerGlowStop = container.querySelector(`#center-glow-${containerId} stop[offset="0%"]`);
        const ticks = container.querySelectorAll('.gauge-tick');

        if (!progressEl || !valueTextEl) {
            this.renderGauge(containerId, { ...options, value: newValue });
            return;
        }

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            const currentVal = oldValue + (newValue - oldValue) * eased;
            const percentage = Math.max(0, Math.min(100, ((currentVal - min) / (max - min)) * 100));
            const activeLength = 282.74 * (percentage / 100);
            const strokeOpacity = percentage > 0 ? 1 : 0;

            progressEl.setAttribute('stroke-dasharray', `${activeLength} 377`);
            progressEl.setAttribute('stroke-opacity', strokeOpacity);

            if (bloomEl) {
                bloomEl.setAttribute('stroke-dasharray', `${activeLength} 377`);
                bloomEl.setAttribute('stroke-opacity', strokeOpacity * 0.35);
            }

            let activeColorSet;
            if (type === 'co2') {
                activeColorSet = this._getCo2Colors(currentVal);
                const stop0 = container.querySelector(`#gradient-${containerId} stop[offset="0%"]`);
                const stop1 = container.querySelector(`#gradient-${containerId} stop[offset="100%"]`);
                if (stop0) stop0.style.stopColor = activeColorSet.gradient[0];
                if (stop1) stop1.style.stopColor = activeColorSet.gradient[1];
            } else {
                activeColorSet = this.colors[type] || { main: '#ffffff', gradient: ['#ffffff', '#ffffff'] };
            }

            if (centerGlowStop) {
                centerGlowStop.style.stopColor = activeColorSet.gradient[0];
            }

            const statusClass = this._getStatusForValue(type, currentVal);
            const statusColor = statusClass === 'danger' ? '#ff3b30' : statusClass === 'warning' ? '#ff9f0a' : activeColorSet.main;
            valueTextEl.setAttribute('fill', statusColor);
            valueTextEl.textContent = this._formatValue(Math.round(currentVal * 10) / 10, type);

            // Update needle tip pointer
            const sweepAngle = 135 + 270 * (percentage / 100);
            const sweepAngleRad = sweepAngle * Math.PI / 180;
            const dotX = (70 + radius * Math.cos(sweepAngleRad)).toFixed(2);
            const dotY = (70 + radius * Math.sin(sweepAngleRad)).toFixed(2);

            if (dotEl) {
                dotEl.setAttribute('cx', dotX);
                dotEl.setAttribute('cy', dotY);
                dotEl.setAttribute('stroke', statusColor);
            }
            if (dotHaloEl) {
                dotHaloEl.setAttribute('cx', dotX);
                dotHaloEl.setAttribute('cy', dotY);
                dotHaloEl.setAttribute('fill', statusColor);
            }

            // Update radial ticks
            if (ticks && ticks.length > 0) {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                const inactiveColor = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.09)';
                ticks.forEach((tick, idx) => {
                    const fracAttr = tick.getAttribute('data-frac');
                    const tickFrac = fracAttr !== null ? parseFloat(fracAttr) : (idx / (ticks.length - 1));
                    const isTickActive = (tickFrac * 100) <= percentage;
                    const isMajor = tick.getAttribute('stroke-width') === '1.5';
                    tick.setAttribute('stroke', isTickActive ? statusColor : inactiveColor);
                    tick.setAttribute('opacity', isTickActive ? (isMajor ? '1' : '0.8') : (isMajor ? (isLight ? '0.5' : '0.35') : (isLight ? '0.28' : '0.18')));
                });
            }

            const svgEl = container.querySelector('.gauge-svg');
            if (svgEl) {
                if (statusClass === 'danger') {
                    svgEl.classList.add('flash-danger');
                } else {
                    svgEl.classList.remove('flash-danger');
                }
            }

            if (progress < 1) {
                this._animationFrames.set(containerId, requestAnimationFrame(animate));
            } else {
                this._currentValues.set(containerId, { value: newValue, min, max, type, unit });
                this._animationFrames.delete(containerId);
            }
        };

        this._animationFrames.set(containerId, requestAnimationFrame(animate));
    }

    // ----------------------------------------------------------
    // Ultra-Smooth Cubic Bezier Spline Sparkline
    // ----------------------------------------------------------
    renderSparkline(containerId, data, color) {
        const container = document.getElementById(containerId);
        if (!container || !data || data.length === 0) return;

        const points = data.slice(-20);
        if (points.length < 2) return;

        const width = container.clientWidth || 120;
        const height = 44;
        const paddingX = 4;
        const paddingY = 5;

        const values = points.map(p => (typeof p === 'number' ? p : p));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const stepX = (width - paddingX * 2) / (values.length - 1);

        const pts = values.map((v, i) => {
            return {
                x: paddingX + i * stepX,
                y: height - paddingY - ((v - min) / range) * (height - paddingY * 2)
            };
        });

        // Compute Cubic Bezier Spline path from Catmull-Rom tangents
        let pathD = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
        }

        const lastPt = pts[pts.length - 1];
        const fillPath = `${pathD} L ${lastPt.x.toFixed(1)},${height} L ${pts[0].x.toFixed(1)},${height} Z`;

        const sparklineId = `sparkline-grad-${containerId}`;
        const sparklineGlowId = `sparkline-glow-${containerId}`;

        const svg = `
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="sparkline-svg">
                <defs>
                    <linearGradient id="${sparklineId}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.35" />
                        <stop offset="70%" style="stop-color:${color};stop-opacity:0.08" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                    </linearGradient>
                    <filter id="${sparklineGlowId}" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                <!-- Spline area gradient -->
                <path d="${fillPath}" fill="url(#${sparklineId})" />
                
                <!-- Spline glowing stroke -->
                <path d="${pathD}"
                    fill="none"
                    stroke="${color}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    filter="url(#${sparklineGlowId})"
                    vector-effect="non-scaling-stroke" />

                <!-- Head live laser indicator -->
                <g class="sparkline-head">
                    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="5.5"
                        fill="${color}" opacity="0.35" class="sparkline-pulse-ring" />
                    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="2.8"
                        fill="#ffffff" stroke="${color}" stroke-width="2" />
                </g>
            </svg>
        `;

        container.innerHTML = svg;
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    _getCo2Colors(value) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (!window.DataManager) {
            return isLight
                ? { main: '#0d9488', glow: 'rgba(13, 148, 136, 0.15)', gradient: ['#14b8a6', '#0d9488'] }
                : { main: '#14b8a6', glow: 'rgba(20, 184, 166, 0.25)', gradient: ['#2dd4bf', '#0d9488'] };
        }
        const t = window.DataManager.getThresholds();
        if (value > t.co2.max) {
            return isLight
                ? { main: '#e11d48', glow: 'rgba(225, 29, 72, 0.15)', gradient: ['#f43f5e', '#e11d48'] }
                : { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)', gradient: ['#fb7185', '#f43f5e'] };
        } else if (value > 1000) {
            return isLight
                ? { main: '#d97706', glow: 'rgba(217, 119, 6, 0.15)', gradient: ['#f59e0b', '#d97706'] }
                : { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)', gradient: ['#fbbf24', '#d97706'] };
        } else {
            return isLight
                ? { main: '#0d9488', glow: 'rgba(13, 148, 136, 0.15)', gradient: ['#14b8a6', '#0d9488'] }
                : { main: '#14b8a6', glow: 'rgba(20, 184, 166, 0.25)', gradient: ['#2dd4bf', '#0d9488'] };
        }
    }

    _formatValue(value, type) {
        if (type === 'co2') return Math.round(value).toString();
        return value.toFixed(1);
    }

    _getStatusForValue(type, value) {
        if (!window.DataManager) return 'good';
        const t = window.DataManager.getThresholds();

        if (type === 'co2') {
            if (value > t.co2.max) return 'danger';
            if (value > 1000) return 'warning';
            return 'good';
        } else if (type === 'temp') {
            if (value > t.temp.max + 3 || value < t.temp.min - 3) return 'danger';
            if (value > t.temp.max || value < t.temp.min) return 'warning';
        } else if (type === 'humidity') {
            if (value > t.humidity.max + 10 || value < t.humidity.min - 10) return 'danger';
            if (value > t.humidity.max || value < t.humidity.min) return 'warning';
        }
        return 'good';
    }
}

window.GaugeRenderer = new GaugeRenderer();

