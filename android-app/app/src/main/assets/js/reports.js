// ============================================================
// ReportManager - Report Generation & Export
// ============================================================

class ReportManager {
    constructor() {
        this._rendered = false;
    }

    // ----------------------------------------------------------
    // Render Reports Screen
    // ----------------------------------------------------------
    renderReports() {
        const container = document.getElementById('reports-content');
        if (!container) return;

        // Default date range: last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const formatDate = (d) => d.toISOString().split('T')[0];

        container.innerHTML = `
            <!-- Date Range Picker -->
            <div class="report-section">
                <div class="report-date-picker">
                    <div class="date-field">
                        <label class="date-label" for="report-start-date">${window.i18n.t('report_from')}</label>
                        <input type="date" class="date-input" id="report-start-date" 
                            value="${formatDate(startDate)}">
                    </div>
                    <div class="date-separator">→</div>
                    <div class="date-field">
                        <label class="date-label" for="report-end-date">${window.i18n.t('report_to')}</label>
                        <input type="date" class="date-input" id="report-end-date" 
                            value="${formatDate(endDate)}">
                    </div>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="report-section">
                <div class="report-summary-cards">
                    <div class="report-summary-card">
                        <div class="report-card-icon">💨</div>
                        <div class="report-card-value" id="report-avg-co2">--</div>
                        <div class="report-card-label">${window.i18n.t('report_avg_co2')}</div>
                    </div>
                    <div class="report-summary-card">
                        <div class="report-card-icon">🌡️</div>
                        <div class="report-card-value" id="report-avg-temp">--</div>
                        <div class="report-card-label">${window.i18n.t('report_avg_temp')}</div>
                    </div>
                    <div class="report-summary-card">
                        <div class="report-card-icon">💧</div>
                        <div class="report-card-value" id="report-avg-humidity">--</div>
                        <div class="report-card-label">${window.i18n.t('report_avg_humidity')}</div>
                    </div>
                    <div class="report-summary-card">
                        <div class="report-card-icon">🔔</div>
                        <div class="report-card-value" id="report-total-alerts">--</div>
                        <div class="report-card-label">${window.i18n.t('report_total_alerts')}</div>
                    </div>
                </div>
            </div>

            <!-- Bar Chart -->
            <div class="report-section">
                <h3 class="report-section-title">${window.i18n.t('report_chart_title')}</h3>
                <div class="report-chart-wrapper">
                    <canvas id="report-bar-chart"></canvas>
                </div>
            </div>

            <!-- Daily Stats Table -->
            <div class="report-section">
                <h3 class="report-section-title">${window.i18n.t('report_table_title')}</h3>
                <div class="report-table-wrapper">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>${window.i18n.t('report_col_date')}</th>
                                <th>${window.i18n.t('report_col_co2')}</th>
                                <th>${window.i18n.t('report_col_temp')}</th>
                                <th>${window.i18n.t('report_col_humidity')}</th>
                            </tr>
                        </thead>
                        <tbody id="report-table-body">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Export Button -->
            <div class="report-section report-export-section">
                <button class="btn btn-export" id="btn-export-report">
                    <span class="btn-icon">📥</span>
                    ${window.i18n.t('report_export')}
                </button>
            </div>
        `;

        // Setup event listeners
        this._setupListeners();

        // Initial render
        this.updateReport(formatDate(startDate), formatDate(endDate));
    }

    // ----------------------------------------------------------
    // Setup Listeners
    // ----------------------------------------------------------
    _setupListeners() {
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');

        const onDateChange = () => {
            if (startInput.value && endInput.value) {
                this.updateReport(startInput.value, endInput.value);
            }
        };

        if (startInput) startInput.addEventListener('change', onDateChange);
        if (endInput) endInput.addEventListener('change', onDateChange);

        // Export button
        const exportBtn = document.getElementById('btn-export-report');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (window.AlertManager) {
                    window.AlertManager.showToast(window.i18n.t('report_export_success'), 'warning', 3000);
                }
            });
        }
    }

    // ----------------------------------------------------------
    // Update Report Data
    // ----------------------------------------------------------
    updateReport(startDate, endDate) {
        const dailyData = window.DataManager.getDailyAverages(
            window.DataManager.currentRoomId,
            startDate,
            endDate
        );

        this._updateSummaryCards(dailyData, startDate, endDate);
        this._updateTable(dailyData);
        this._updateBarChart(dailyData);
    }

    // ----------------------------------------------------------
    // Summary Cards
    // ----------------------------------------------------------
    _updateSummaryCards(dailyData, startDate, endDate) {
        if (dailyData.length === 0) {
            document.getElementById('report-avg-co2').textContent = '--';
            document.getElementById('report-avg-temp').textContent = '--';
            document.getElementById('report-avg-humidity').textContent = '--';
            document.getElementById('report-total-alerts').textContent = '0';
            return;
        }

        const avgCo2 = Math.round(dailyData.reduce((sum, d) => sum + d.co2.avg, 0) / dailyData.length);
        const avgTemp = Math.round(dailyData.reduce((sum, d) => sum + d.temp.avg, 0) / dailyData.length * 10) / 10;
        const avgHumidity = Math.round(dailyData.reduce((sum, d) => sum + d.humidity.avg, 0) / dailyData.length * 10) / 10;

        // Count alerts in date range
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        const alerts = window.DataManager.getAlerts().filter(a => a.timestamp >= start && a.timestamp <= end);

        // Convert Temperature if unit is F
        const unitSetting = window.DataManager.getSettings().unit || 'C';
        let displayTemp = avgTemp;
        let tempUnit = '°C';
        if (unitSetting === 'F') {
            displayTemp = Math.round(((avgTemp * 9 / 5) + 32) * 10) / 10;
            tempUnit = '°F';
        }

        document.getElementById('report-avg-co2').textContent = avgCo2;
        document.getElementById('report-avg-temp').textContent = `${displayTemp}${tempUnit}`;
        document.getElementById('report-avg-humidity').textContent = `${avgHumidity}%`;
        document.getElementById('report-total-alerts').textContent = alerts.length;
    }

    // ----------------------------------------------------------
    // Table
    // ----------------------------------------------------------
    _updateTable(dailyData) {
        const tbody = document.getElementById('report-table-body');
        if (!tbody) return;

        if (dailyData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="table-empty">${window.i18n.t('report_empty')}</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.generateTableRows(dailyData);
    }

    generateTableRows(data) {
        const unitSetting = window.DataManager.getSettings().unit || 'C';
        const locale = window.i18n.lang === 'vi' ? 'vi-VN' : window.i18n.lang === 'zh' ? 'zh-CN' : 'en-US';

        return data.map(d => {
            const date = new Date(d.date);
            const dateStr = date.toLocaleDateString(locale, {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });

            let tempAvg = d.temp.avg;
            let tempMin = d.temp.min;
            let tempMax = d.temp.max;

            if (unitSetting === 'F') {
                tempAvg = Math.round(((d.temp.avg * 9 / 5) + 32) * 10) / 10;
                tempMin = Math.round(((d.temp.min * 9 / 5) + 32) * 10) / 10;
                tempMax = Math.round(((d.temp.max * 9 / 5) + 32) * 10) / 10;
            }

            return `
                <tr>
                    <td class="table-date">${dateStr}</td>
                    <td>
                        <span class="table-metric-avg">${Math.round(d.co2.avg)}</span>
                        <span class="table-metric-range">${Math.round(d.co2.min)} ~ ${Math.round(d.co2.max)}</span>
                    </td>
                    <td>
                        <span class="table-metric-avg">${tempAvg}</span>
                        <span class="table-metric-range">${tempMin} ~ ${tempMax}</span>
                    </td>
                    <td>
                        <span class="table-metric-avg">${d.humidity.avg}</span>
                        <span class="table-metric-range">${d.humidity.min} ~ ${d.humidity.max}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ----------------------------------------------------------
    // Bar Chart
    // ----------------------------------------------------------
    _updateBarChart(dailyData) {
        if (window.ChartManager) {
            window.ChartManager.renderBarChart('report-bar-chart', dailyData);
        }
    }
}

window.ReportManager = new ReportManager();
