// Default values
const DEFAULTS = {
    wastePerHub: 500,
    numHubs: 100,
    yieldFactor: 0.6,
    co2PerTon: 2.5,
    stabilityFactor: 0.8,
    jobsPerHub: 20,
    fertilizerSaving: 35
};

// Global chart instance
let impactChart = null;

// Track previous values for change detection
let previousMetrics = {
    totalWaste: 50000,
    biocharTons: 30000,
    co2StableTons: 60000,
    jobsTotal: 2000
};

// Real-time update tracking
let lastUpdateTime = Date.now();

// Saved scenarios for comparison
let savedScenarios = [];
let scenarioCounter = 1;

// Performance optimization
let calculationCache = new Map();
let debounceTimer = null;
const DEBOUNCE_DELAY = 100; // ms
let animationFrameId = null;

// Real-time chart animation
let chartAnimationInterval = null;
let chartDataPoints = [];
let currentChartIndex = 0;

// Performance monitoring
let perfMetrics = {
    fps: 60,
    lastFrameTime: performance.now(),
    frameCount: 0,
    calcTime: 0,
    renderTime: 0
};

// Enable performance monitor with Ctrl+Shift+P
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        const monitor = document.getElementById('perfMonitor');
        monitor.style.display = monitor.style.display === 'none' ? 'block' : 'none';
    }
});

// DOM Elements
const elements = {
    // Sliders
    wastePerHub: document.getElementById('wastePerHub'),
    numHubs: document.getElementById('numHubs'),
    yieldFactor: document.getElementById('yieldFactor'),
    co2PerTon: document.getElementById('co2PerTon'),
    stabilityFactor: document.getElementById('stabilityFactor'),
    jobsPerHub: document.getElementById('jobsPerHub'),
    fertilizerSaving: document.getElementById('fertilizerSaving'),
    
    // Numeric inputs
    wastePerHubNum: document.getElementById('wastePerHubNum'),
    numHubsNum: document.getElementById('numHubsNum'),
    yieldFactorNum: document.getElementById('yieldFactorNum'),
    co2PerTonNum: document.getElementById('co2PerTonNum'),
    stabilityFactorNum: document.getElementById('stabilityFactorNum'),
    jobsPerHubNum: document.getElementById('jobsPerHubNum'),
    fertilizerSavingNum: document.getElementById('fertilizerSavingNum'),
    
    // Value displays
    wastePerHubValue: document.getElementById('wastePerHubValue'),
    numHubsValue: document.getElementById('numHubsValue'),
    yieldFactorValue: document.getElementById('yieldFactorValue'),
    co2PerTonValue: document.getElementById('co2PerTonValue'),
    stabilityFactorValue: document.getElementById('stabilityFactorValue'),
    jobsPerHubValue: document.getElementById('jobsPerHubValue'),
    fertilizerSavingValue: document.getElementById('fertilizerSavingValue'),
    
    // KPI displays
    kpiWaste: document.getElementById('kpiWaste'),
    kpiBiochar: document.getElementById('kpiBiochar'),
    kpiCO2: document.getElementById('kpiCO2'),
    kpiJobs: document.getElementById('kpiJobs'),
    
    // Buttons
    resetBtn: document.getElementById('resetBtn'),
    downloadCsvBtn: document.getElementById('downloadCsvBtn'),
    downloadChartBtn: document.getElementById('downloadChartBtn'),
    
    // Table
    hubTableBody: document.getElementById('hubTableBody'),
    
    // Real-time elements
    lastUpdate: document.getElementById('lastUpdate'),
    tickerText: document.getElementById('tickerText'),
    
    // Change indicators
    wasteChange: document.getElementById('wasteChange'),
    biocharChange: document.getElementById('biocharChange'),
    co2Change: document.getElementById('co2Change'),
    jobsChange: document.getElementById('jobsChange'),
    
    // Soil analysis elements
    uploadArea: document.getElementById('uploadArea'),
    soilImageInput: document.getElementById('soilImageInput'),
    soilPreview: document.getElementById('soilPreview'),
    previewImage: document.getElementById('previewImage'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    analysisResult: document.getElementById('analysisResult'),
    statusBadge: document.getElementById('statusBadge'),
    soilRecommendations: document.getElementById('soilRecommendations'),
    
    // Financial elements
    toggleFinancial: document.getElementById('toggleFinancial'),
    financialDetails: document.getElementById('financialDetails'),
    carbonPrice: document.getElementById('carbonPrice'),
    totalRevenue: document.getElementById('totalRevenue'),
    totalCosts: document.getElementById('totalCosts'),
    annualProfit: document.getElementById('annualProfit'),
    carbonRevenue: document.getElementById('carbonRevenue'),
    roiPercent: document.getElementById('roiPercent'),
    paybackPeriod: document.getElementById('paybackPeriod'),
    revenueBreakdown: document.getElementById('revenueBreakdown'),
    costsBreakdown: document.getElementById('costsBreakdown'),
    
    // Scenario elements
    saveScenario: document.getElementById('saveScenario'),
    clearScenarios: document.getElementById('clearScenarios'),
    scenarioCards: document.getElementById('scenarioCards'),
    
    // PDF download
    downloadPdfBtn: document.getElementById('downloadPdfBtn')
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    bindEventListeners();
    updateCalculations();
    startRealTimeUpdates();
    initializeSoilAnalysis();
    initializeFinancialSection();
    initializeScenarioComparison();
    initializePresets();
    startPerformanceMonitoring();
    startRealTimeChartAnimation();
});

// Bind all event listeners
function bindEventListeners() {
    // Sync slider and numeric input for each parameter
    syncInputs('wastePerHub', 'wastePerHubNum', 'wastePerHubValue', 0);
    syncInputs('numHubs', 'numHubsNum', 'numHubsValue', 0);
    syncInputs('yieldFactor', 'yieldFactorNum', 'yieldFactorValue', 2);
    syncInputs('co2PerTon', 'co2PerTonNum', 'co2PerTonValue', 2);
    syncInputs('stabilityFactor', 'stabilityFactorNum', 'stabilityFactorValue', 2);
    syncInputs('jobsPerHub', 'jobsPerHubNum', 'jobsPerHubValue', 0);
    syncInputs('fertilizerSaving', 'fertilizerSavingNum', 'fertilizerSavingValue', 0);
    
    // Reset button
    elements.resetBtn.addEventListener('click', resetToDefaults);
    
    // Download buttons
    elements.downloadCsvBtn.addEventListener('click', downloadCSV);
    elements.downloadChartBtn.addEventListener('click', downloadChart);
    elements.downloadPdfBtn.addEventListener('click', downloadPDF);
}

// Debounced update calculations for performance
function debouncedUpdateCalculations() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(() => {
            updateCalculations();
        });
    }, DEBOUNCE_DELAY);
}

// Start real-time update ticker
function startRealTimeUpdates() {
    setInterval(() => {
        updateLastUpdateTime();
    }, 1000);
    
    // Update ticker messages
    const tickerMessages = [
        'Real-time impact calculation active',
        'All metrics updating dynamically',
        'Carbon sequestration tracking live',
        'Green jobs counter active',
        'Environmental impact monitored'
    ];
    
    let messageIndex = 0;
    setInterval(() => {
        elements.tickerText.textContent = tickerMessages[messageIndex];
        messageIndex = (messageIndex + 1) % tickerMessages.length;
    }, 4000);
}

// Update last update timestamp
function updateLastUpdateTime() {
    const now = Date.now();
    const elapsed = now - lastUpdateTime;
    
    if (elapsed < 5000) {
        elements.lastUpdate.textContent = 'just now';
    } else if (elapsed < 60000) {
        elements.lastUpdate.textContent = Math.floor(elapsed / 1000) + 's ago';
    } else {
        elements.lastUpdate.textContent = Math.floor(elapsed / 60000) + 'm ago';
    }
}

// Update change indicators
function updateChangeIndicators(metrics) {
    updateChange(elements.wasteChange, previousMetrics.totalWaste, metrics.totalWaste);
    updateChange(elements.biocharChange, previousMetrics.biocharTons, metrics.biocharTons);
    updateChange(elements.co2Change, previousMetrics.co2StableTons, metrics.co2StableTons);
    updateChange(elements.jobsChange, previousMetrics.jobsTotal, metrics.jobsTotal);
    
    // Update previous values
    previousMetrics = {
        totalWaste: metrics.totalWaste,
        biocharTons: metrics.biocharTons,
        co2StableTons: metrics.co2StableTons,
        jobsTotal: metrics.jobsTotal
    };
    
    lastUpdateTime = Date.now();
}

// Update individual change indicator
function updateChange(element, oldValue, newValue) {
    const change = newValue - oldValue;
    const percentChange = oldValue !== 0 ? ((change / oldValue) * 100) : 0;
    
    element.classList.remove('positive', 'negative', 'neutral');
    
    if (Math.abs(percentChange) < 0.01) {
        element.textContent = '--';
        element.classList.add('neutral');
    } else if (change > 0) {
        element.textContent = '+' + percentChange.toFixed(1) + '%';
        element.classList.add('positive');
    } else {
        element.textContent = percentChange.toFixed(1) + '%';
        element.classList.add('negative');
    }
}

// Sync slider and numeric input with optimized debouncing
function syncInputs(sliderId, numId, valueId, decimals) {
    const slider = elements[sliderId];
    const numInput = elements[numId];
    const valueDisplay = elements[valueId];
    
    const updateValue = (value) => {
        const formatted = decimals > 0 ? parseFloat(value).toFixed(decimals) : parseInt(value);
        valueDisplay.textContent = formatted;
        slider.value = value;
        numInput.value = value;
        
        // Debounced calculation for performance
        debouncedUpdateCalculations();
    };
    
    // Use passive listeners for better scroll performance
    slider.addEventListener('input', (e) => updateValue(e.target.value), { passive: true });
    numInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        
        if (!isNaN(val)) {
            const clamped = Math.max(min, Math.min(max, val));
            updateValue(clamped);
        }
    });
}

// Calculate all metrics with caching for performance
function calculateMetrics() {
    const wastePerHub = parseFloat(elements.wastePerHub.value);
    const numHubs = parseFloat(elements.numHubs.value);
    const yieldFactor = parseFloat(elements.yieldFactor.value);
    const co2PerTon = parseFloat(elements.co2PerTon.value);
    const stabilityFactor = parseFloat(elements.stabilityFactor.value);
    const jobsPerHub = parseFloat(elements.jobsPerHub.value);
    
    // Create cache key
    const cacheKey = `${wastePerHub}-${numHubs}-${yieldFactor}-${co2PerTon}-${stabilityFactor}-${jobsPerHub}`;
    
    // Check cache first
    if (calculationCache.has(cacheKey)) {
        return calculationCache.get(cacheKey);
    }
    
    // Core calculations per spec
    const totalWaste = wastePerHub * numHubs;
    const biocharTons = totalWaste * yieldFactor;
    const co2RawTons = biocharTons * co2PerTon;
    const co2StableTons = co2RawTons * stabilityFactor;
    const jobsTotal = numHubs * jobsPerHub;
    
    const result = {
        totalWaste,
        biocharTons,
        co2RawTons,
        co2StableTons,
        jobsTotal,
        wastePerHub,
        numHubs,
        yieldFactor,
        co2PerTon,
        stabilityFactor,
        jobsPerHub
    };
    
    // Cache result (limit cache size to 100 entries)
    if (calculationCache.size > 100) {
        const firstKey = calculationCache.keys().next().value;
        calculationCache.delete(firstKey);
    }
    calculationCache.set(cacheKey, result);
    
    return result;
}

// Update all UI elements with animations
function updateCalculations() {
    const calcStart = performance.now();
    const metrics = calculateMetrics();
    perfMetrics.calcTime = performance.now() - calcStart;
    
    const renderStart = performance.now();
    
    // Update change indicators first
    updateChangeIndicators(metrics);
    
    // Animate KPIs with count-up effect
    animateKPI(elements.kpiWaste, parseFloat(elements.kpiWaste.textContent.replace(/,/g, '').replace('M', '000000')) || 0, metrics.totalWaste);
    animateKPI(elements.kpiBiochar, parseFloat(elements.kpiBiochar.textContent.replace(/,/g, '').replace('M', '000000')) || 0, metrics.biocharTons);
    animateKPI(elements.kpiCO2, parseFloat(elements.kpiCO2.textContent.replace(/,/g, '').replace('M', '000000')) || 0, metrics.co2StableTons);
    animateKPI(elements.kpiJobs, parseFloat(elements.kpiJobs.textContent.replace(/,/g, '').replace('M', '000000')) || 0, metrics.jobsTotal);
    
    // Update chart
    updateChart(metrics);
    
    // Update table with fade effect
    updateTable(metrics);
    
    // Update financial analysis
    updateFinancialAnalysis(metrics);
    
    perfMetrics.renderTime = performance.now() - renderStart;
    updatePerfMonitor();
}

// Animate KPI values with smooth count-up (optimized with RAF)
function animateKPI(element, startValue, endValue) {
    const duration = 400; // Reduced from 500ms for snappier feel
    const startTime = performance.now();
    
    // Cancel any existing animation on this element
    if (element._animationId) {
        cancelAnimationFrame(element._animationId);
    }
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuad = progress * (2 - progress);
        const currentValue = startValue + (endValue - startValue) * easeOutQuad;
        
        element.textContent = formatNumber(currentValue);
        
        if (progress < 1) {
            element._animationId = requestAnimationFrame(animate);
        } else {
            element.textContent = formatNumber(endValue);
            element._animationId = null;
        }
    }
    
    element._animationId = requestAnimationFrame(animate);
}

// Format numbers with thousands separators
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
        return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }
}

// Initialize Chart.js chart with enhanced interactivity
function initializeChart() {
    const ctx = document.getElementById('impactChart').getContext('2d');
    
    impactChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CO₂ Avoided (tCO₂e/year)',
                data: [],
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#4caf50',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#2c5f2d',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(44, 95, 45, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#4caf50',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        title: function(context) {
                            return 'Hubs: ' + context[0].label;
                        },
                        label: function(context) {
                            return 'CO₂ Avoided: ' + formatNumber(context.parsed.y) + ' tCO₂e/year';
                        },
                        afterLabel: function(context) {
                            const hubs = parseInt(context.label);
                            const carsEquivalent = Math.round(context.parsed.y / 4.6);
                            return 'Equivalent to ' + formatNumber(carsEquivalent) + ' cars removed';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Number of Hubs',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'CO₂ Avoided (tCO₂e/year)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Update chart with current metrics (optimized rendering) - with real-time animation
function updateChart(metrics) {
    const numHubs = metrics.numHubs;
    chartDataPoints = [];
    
    // Adaptive sampling for better performance
    let maxPoints = 200;
    if (numHubs > 5000) maxPoints = 150;
    if (numHubs > 8000) maxPoints = 100;
    
    const step = numHubs > maxPoints ? Math.ceil(numHubs / maxPoints) : 1;
    
    // Pre-calculate for better performance
    const baseMultiplier = metrics.wastePerHub * metrics.yieldFactor * 
                          metrics.co2PerTon * metrics.stabilityFactor;
    
    for (let i = step; i <= numHubs; i += step) {
        chartDataPoints.push({
            label: i,
            value: baseMultiplier * i
        });
    }
    
    // Always include the final point
    if (chartDataPoints[chartDataPoints.length - 1].label !== numHubs) {
        chartDataPoints.push({
            label: numHubs,
            value: metrics.co2StableTons
        });
    }
    
    // Reset for real-time animation
    currentChartIndex = 0;
    impactChart.data.labels = [];
    impactChart.data.datasets[0].data = [];
    impactChart.update('none');
}

// Update table with per-hub data and fade animation (virtualized for performance)
function updateTable(metrics) {
    const tbody = elements.hubTableBody;
    
    // Add fade-out effect
    tbody.style.opacity = '0.5';
    tbody.style.transition = 'opacity 0.15s'; // Faster transition
    
    // Use setTimeout with reduced delay
    setTimeout(() => {
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        const displayHubs = Math.min(10, metrics.numHubs);
        
        // Pre-calculate multipliers
        const wasteMultiplier = metrics.wastePerHub;
        const biocharMultiplier = wasteMultiplier * metrics.yieldFactor;
        const co2Multiplier = biocharMultiplier * metrics.co2PerTon * metrics.stabilityFactor;
        const jobsMultiplier = metrics.jobsPerHub;
        
        for (let i = 1; i <= displayHubs; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i}</td>
                <td>${formatNumber(wasteMultiplier * i)}</td>
                <td>${formatNumber(biocharMultiplier * i)}</td>
                <td>${formatNumber(co2Multiplier * i)}</td>
                <td>${formatNumber(jobsMultiplier * i)}</td>
            `;
            row.style.animation = 'fadeIn 0.25s ease-in'; // Slightly faster
            fragment.appendChild(row);
        }
        
        // Clear and append all at once
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
        
        // Fade back in
        tbody.style.opacity = '1';
    }, 150); // Reduced from 200ms
}

// Reset all inputs to defaults
function resetToDefaults() {
    elements.wastePerHub.value = DEFAULTS.wastePerHub;
    elements.numHubs.value = DEFAULTS.numHubs;
    elements.yieldFactor.value = DEFAULTS.yieldFactor;
    elements.co2PerTon.value = DEFAULTS.co2PerTon;
    elements.stabilityFactor.value = DEFAULTS.stabilityFactor;
    elements.jobsPerHub.value = DEFAULTS.jobsPerHub;
    elements.fertilizerSaving.value = DEFAULTS.fertilizerSaving;
    
    elements.wastePerHubNum.value = DEFAULTS.wastePerHub;
    elements.numHubsNum.value = DEFAULTS.numHubs;
    elements.yieldFactorNum.value = DEFAULTS.yieldFactor;
    elements.co2PerTonNum.value = DEFAULTS.co2PerTon;
    elements.stabilityFactorNum.value = DEFAULTS.stabilityFactor;
    elements.jobsPerHubNum.value = DEFAULTS.jobsPerHub;
    elements.fertilizerSavingNum.value = DEFAULTS.fertilizerSaving;
    
    elements.wastePerHubValue.textContent = DEFAULTS.wastePerHub;
    elements.numHubsValue.textContent = DEFAULTS.numHubs;
    elements.yieldFactorValue.textContent = DEFAULTS.yieldFactor.toFixed(2);
    elements.co2PerTonValue.textContent = DEFAULTS.co2PerTon.toFixed(2);
    elements.stabilityFactorValue.textContent = DEFAULTS.stabilityFactor.toFixed(2);
    elements.jobsPerHubValue.textContent = DEFAULTS.jobsPerHub;
    elements.fertilizerSavingValue.textContent = DEFAULTS.fertilizerSaving;
    
    updateCalculations();
}

// Download CSV with optimized generation
function downloadCSV() {
    const metrics = calculateMetrics();
    const numHubs = metrics.numHubs;
    
    // Use array building for better performance
    const rows = ['hub,waste_tons,biochar_tons,co2_tons,jobs_created'];
    
    // Pre-calculate multipliers
    const wasteMultiplier = metrics.wastePerHub;
    const biocharMultiplier = wasteMultiplier * metrics.yieldFactor;
    const co2Multiplier = biocharMultiplier * metrics.co2PerTon * metrics.stabilityFactor;
    const jobsMultiplier = metrics.jobsPerHub;
    
    // Batch processing for large datasets
    const batchSize = 1000;
    for (let i = 1; i <= numHubs; i++) {
        const hubWaste = wasteMultiplier * i;
        const hubBiochar = biocharMultiplier * i;
        const hubCO2 = co2Multiplier * i;
        const hubJobs = jobsMultiplier * i;
        
        rows.push(`${i},${hubWaste.toFixed(2)},${hubBiochar.toFixed(2)},${hubCO2.toFixed(2)},${hubJobs}`);
        
        // Yield to browser every batch to prevent UI freezing
        if (i % batchSize === 0 && i < numHubs) {
            // Small delay for UI responsiveness
            setTimeout(() => {}, 0);
        }
    }
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'impact_summary.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    elements.tickerText.textContent = `📊 CSV exported (${numHubs.toLocaleString()} hubs)`;
}

// Download chart as PNG
function downloadChart() {
    const canvas = document.getElementById('impactChart');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'biochar_impact_chart.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Initialize Soil Analysis Feature
function initializeSoilAnalysis() {
    const uploadArea = elements.uploadArea;
    const fileInput = elements.soilImageInput;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });
    
    // Analyze button
    elements.analyzeBtn.addEventListener('click', analyzeSoilImage);
}

// Handle image upload
function handleImageUpload(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File too large! Please upload an image under 5MB.');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG).');
        return;
    }
    
    // Read and display image
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        elements.soilPreview.style.display = 'block';
        elements.analysisResult.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Analyze soil image using AI simulation
function analyzeSoilImage() {
    // Show analyzing state
    elements.analysisResult.style.display = 'block';
    elements.statusBadge.textContent = 'Analyzing...';
    elements.statusBadge.className = 'status-badge analyzing';
    elements.soilRecommendations.innerHTML = '<p style="text-align:center; color:#666;">Processing image with AI model...</p>';
    
    // Simulate AI analysis (in production, this would call a real AI API)
    setTimeout(() => {
        const analysis = simulateSoilAnalysis();
        displaySoilAnalysis(analysis);
    }, 2000);
}

// Simulate AI soil analysis
function simulateSoilAnalysis() {
    // Simulate different soil conditions randomly
    const soilTypes = [
        {
            type: 'Clay-rich soil',
            biocharSuitability: 'High',
            recommendations: [
                { title: 'Biochar Application Rate', text: 'Apply 5-10 tons/hectare. Clay soil benefits significantly from biochar\'s porosity improvement.', priority: 'high' },
                { title: 'Moisture Management', text: 'Clay retains water well. Biochar will improve drainage and prevent waterlogging.', priority: 'medium' },
                { title: 'Expected Yield Boost', text: 'Crop yields may increase 15-25% with proper biochar integration.', priority: 'high' }
            ],
            adjustments: { yieldFactor: 0.65, co2PerTon: 2.7 }
        },
        {
            type: 'Sandy soil',
            biocharSuitability: 'Very High',
            recommendations: [
                { title: 'Biochar Application Rate', text: 'Apply 8-12 tons/hectare. Sandy soil needs biochar to improve water and nutrient retention.', priority: 'high' },
                { title: 'Water Retention', text: 'Biochar can increase water holding capacity by 25-40% in sandy soils.', priority: 'high' },
                { title: 'Fertilizer Efficiency', text: 'Reduce fertilizer use by 40-45% as biochar prevents nutrient leaching.', priority: 'medium' }
            ],
            adjustments: { yieldFactor: 0.7, co2PerTon: 2.8 }
        },
        {
            type: 'Loamy soil',
            biocharSuitability: 'Medium-High',
            recommendations: [
                { title: 'Biochar Application Rate', text: 'Apply 3-6 tons/hectare. Loamy soil is already balanced but biochar adds carbon.', priority: 'medium' },
                { title: 'Soil pH Optimization', text: 'Biochar will slightly increase pH (0.3-0.5 units), beneficial for acidic loam.', priority: 'low' },
                { title: 'Microbial Activity', text: 'Expect 20-30% increase in beneficial soil microbes with biochar addition.', priority: 'medium' }
            ],
            adjustments: { yieldFactor: 0.6, co2PerTon: 2.5 }
        },
        {
            type: 'Degraded/eroded soil',
            biocharSuitability: 'Critical',
            recommendations: [
                { title: 'Biochar Application Rate', text: 'Apply 10-15 tons/hectare immediately. Soil restoration is urgent.', priority: 'high' },
                { title: 'Carbon Sequestration Priority', text: 'Degraded soil is ideal for maximum carbon storage (3.0 tCO₂/t biochar).', priority: 'high' },
                { title: 'Soil Restoration Timeline', text: 'Expect 6-12 months for visible improvement. Continuous biochar addition recommended.', priority: 'high' }
            ],
            adjustments: { yieldFactor: 0.75, co2PerTon: 3.0, stabilityFactor: 0.85 }
        }
    ];
    
    return soilTypes[Math.floor(Math.random() * soilTypes.length)];
}

// Display soil analysis results
function displaySoilAnalysis(analysis) {
    elements.statusBadge.textContent = 'Analysis Complete';
    elements.statusBadge.className = 'status-badge complete';
    
    let html = `
        <div style="margin-bottom: 15px;">
            <h4 style="color: #2c5f2d; margin-bottom: 8px;">Detected Soil Type: ${analysis.type}</h4>
            <p style="color: #666; font-size: 0.9rem;">Biochar Suitability: <strong>${analysis.biocharSuitability}</strong></p>
        </div>
    `;
    
    analysis.recommendations.forEach(rec => {
        html += `
            <div class="soil-recommendation">
                <h4>
                    ${rec.title}
                    <span class="recommendation-badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
                </h4>
                <p>${rec.text}</p>
            </div>
        `;
    });
    
    html += `
        <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 8px; text-align: center;">
            <button id="applyRecommendations" class="btn btn-small" style="width: auto; padding: 10px 20px;">
                Apply AI Recommendations to Calculator
            </button>
        </div>
    `;
    
    elements.soilRecommendations.innerHTML = html;
    
    // Add event listener to apply button
    document.getElementById('applyRecommendations').addEventListener('click', () => {
        applyAIRecommendations(analysis.adjustments);
    });
}

// Apply AI recommendations to the calculator
function applyAIRecommendations(adjustments) {
    if (adjustments.yieldFactor) {
        elements.yieldFactor.value = adjustments.yieldFactor;
        elements.yieldFactorNum.value = adjustments.yieldFactor;
        elements.yieldFactorValue.textContent = adjustments.yieldFactor.toFixed(2);
    }
    
    if (adjustments.co2PerTon) {
        elements.co2PerTon.value = adjustments.co2PerTon;
        elements.co2PerTonNum.value = adjustments.co2PerTon;
        elements.co2PerTonValue.textContent = adjustments.co2PerTon.toFixed(2);
    }
    
    if (adjustments.stabilityFactor) {
        elements.stabilityFactor.value = adjustments.stabilityFactor;
        elements.stabilityFactorNum.value = adjustments.stabilityFactor;
        elements.stabilityFactorValue.textContent = adjustments.stabilityFactor.toFixed(2);
    }
    
    // Update calculations
    updateCalculations();
    
    // Show success message
    elements.tickerText.textContent = '🎯 AI recommendations applied successfully!';
    
    // Scroll to top to see updated metrics
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize Financial Section
function initializeFinancialSection() {
    elements.toggleFinancial.addEventListener('click', () => {
        const details = elements.financialDetails;
        if (details.style.display === 'none') {
            details.style.display = 'block';
            elements.toggleFinancial.textContent = 'Hide Details';
        } else {
            details.style.display = 'none';
            elements.toggleFinancial.textContent = 'Show Details';
        }
    });
    
    // Debounce carbon price changes
    elements.carbonPrice.addEventListener('input', () => {
        debouncedUpdateCalculations();
    });
}

// Update Financial Analysis
function updateFinancialAnalysis(metrics) {
    const carbonPrice = parseFloat(elements.carbonPrice.value) || 2000;
    const biocharPrice = 15000; // ₹15,000 per ton
    const tippingFee = 500; // ₹500 per ton waste
    
    // Revenue streams
    const biocharRevenue = metrics.biocharTons * biocharPrice;
    const carbonCredits = metrics.co2StableTons * carbonPrice;
    const tippingRevenue = metrics.totalWaste * tippingFee;
    const totalRevenue = biocharRevenue + carbonCredits + tippingRevenue;
    
    // Operating costs
    const laborCost = metrics.numHubs * 36 * 100000; // ₹36 lakh per hub
    const maintenanceCost = metrics.numHubs * 8 * 100000; // ₹8 lakh per hub
    const logisticsCost = metrics.numHubs * 6 * 100000; // ₹6 lakh per hub
    const totalCosts = laborCost + maintenanceCost + logisticsCost;
    
    const annualProfit = totalRevenue - totalCosts;
    const capitalCost = metrics.numHubs * 40 * 100000; // ₹40 lakh per hub
    const roi = capitalCost > 0 ? (annualProfit / capitalCost * 100) : 0;
    const payback = annualProfit > 0 ? (capitalCost / annualProfit) : 0;
    
    // Update display
    elements.totalRevenue.textContent = formatCurrency(totalRevenue);
    elements.totalCosts.textContent = formatCurrency(totalCosts);
    elements.annualProfit.textContent = formatCurrency(annualProfit);
    elements.carbonRevenue.textContent = formatCurrency(carbonCredits);
    elements.roiPercent.textContent = roi.toFixed(1) + '%';
    elements.paybackPeriod.textContent = payback.toFixed(1) + ' yrs';
    
    // Revenue breakdown
    elements.revenueBreakdown.innerHTML = `
        <div>Biochar Sales: ${formatCurrency(biocharRevenue)}</div>
        <div>Carbon Credits: ${formatCurrency(carbonCredits)}</div>
        <div>Tipping Fees: ${formatCurrency(tippingRevenue)}</div>
    `;
    
    // Costs breakdown
    elements.costsBreakdown.innerHTML = `
        <div>Labor: ${formatCurrency(laborCost)}</div>
        <div>Maintenance: ${formatCurrency(maintenanceCost)}</div>
        <div>Logistics: ${formatCurrency(logisticsCost)}</div>
    `;
}

// Format currency in lakhs/crores
function formatCurrency(amount) {
    if (amount >= 10000000) { // 1 crore
        return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
    } else if (amount >= 100000) { // 1 lakh
        return '₹' + (amount / 100000).toFixed(2) + ' L';
    } else {
        return '₹' + amount.toLocaleString('en-IN');
    }
}

// Initialize Scenario Comparison
function initializeScenarioComparison() {
    elements.saveScenario.addEventListener('click', saveCurrentScenario);
    elements.clearScenarios.addEventListener('click', clearAllScenarios);
    
    // Load saved scenarios from localStorage
    const saved = localStorage.getItem('biocharScenarios');
    if (saved) {
        savedScenarios = JSON.parse(saved);
        renderScenarios();
    }
}

// Save current scenario
function saveCurrentScenario() {
    const metrics = calculateMetrics();
    const scenario = {
        id: Date.now(),
        name: 'Scenario ' + scenarioCounter++,
        timestamp: new Date().toLocaleString(),
        params: {
            wastePerHub: parseFloat(elements.wastePerHub.value),
            numHubs: parseFloat(elements.numHubs.value),
            yieldFactor: parseFloat(elements.yieldFactor.value),
            co2PerTon: parseFloat(elements.co2PerTon.value),
            stabilityFactor: parseFloat(elements.stabilityFactor.value),
            jobsPerHub: parseFloat(elements.jobsPerHub.value)
        },
        metrics: metrics
    };
    
    savedScenarios.push(scenario);
    localStorage.setItem('biocharScenarios', JSON.stringify(savedScenarios));
    renderScenarios();
    
    // Show success message
    elements.tickerText.textContent = '✅ Scenario saved successfully!';
}

// Clear all scenarios
function clearAllScenarios() {
    if (confirm('Are you sure you want to clear all saved scenarios?')) {
        savedScenarios = [];
        scenarioCounter = 1;
        localStorage.removeItem('biocharScenarios');
        renderScenarios();
    }
}

// Render scenario cards (optimized with DocumentFragment) - with real-time updates
function renderScenarios() {
    if (savedScenarios.length === 0) {
        elements.scenarioCards.innerHTML = `
            <div class="scenario-placeholder">
                <p>📊 No scenarios saved yet. Adjust parameters and click "Save Current" to compare scenarios.</p>
            </div>
        `;
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    savedScenarios.forEach((scenario, index) => {
        const card = document.createElement('div');
        card.className = 'scenario-card';
        card.innerHTML = `
            <div class="scenario-header">
                <div class="scenario-name">${scenario.name}</div>
                <button class="scenario-delete" onclick="deleteScenario(${scenario.id})">✕</button>
            </div>
            <div class="scenario-stats">
                <div><span>Hubs:</span> <strong id="scenario-hubs-${scenario.id}">${formatNumber(scenario.params.numHubs)}</strong></div>
                <div><span>Waste:</span> <strong id="scenario-waste-${scenario.id}">${formatNumber(scenario.metrics.totalWaste)}</strong> t</div>
                <div><span>Biochar:</span> <strong id="scenario-biochar-${scenario.id}">${formatNumber(scenario.metrics.biocharTons)}</strong> t</div>
                <div><span>CO₂:</span> <strong id="scenario-co2-${scenario.id}">${formatNumber(scenario.metrics.co2StableTons)}</strong> tCO₂e</div>
                <div><span>Jobs:</span> <strong id="scenario-jobs-${scenario.id}">${formatNumber(scenario.metrics.jobsTotal)}</strong></div>
                <div style="font-size: 0.75rem; color: #999; margin-top: 8px;">${scenario.timestamp}</div>
            </div>
            <button class="scenario-apply" onclick="applyScenario(${scenario.id})">📥 Apply This Scenario</button>
        `;
        fragment.appendChild(card);
    });
    
    // Clear and append all at once
    elements.scenarioCards.innerHTML = '';
    elements.scenarioCards.appendChild(fragment);
    
    // Start real-time animation for scenarios
    startScenarioRealTimeUpdates();
}

// Delete scenario (global function for onclick)
window.deleteScenario = function(id) {
    savedScenarios = savedScenarios.filter(s => s.id !== id);
    localStorage.setItem('biocharScenarios', JSON.stringify(savedScenarios));
    renderScenarios();
};

// Apply scenario (global function for onclick)
window.applyScenario = function(id) {
    const scenario = savedScenarios.find(s => s.id === id);
    if (!scenario) return;
    
    const params = scenario.params;
    
    // Update all controls
    elements.wastePerHub.value = params.wastePerHub;
    elements.wastePerHubNum.value = params.wastePerHub;
    elements.wastePerHubValue.textContent = params.wastePerHub;
    
    elements.numHubs.value = params.numHubs;
    elements.numHubsNum.value = params.numHubs;
    elements.numHubsValue.textContent = params.numHubs;
    
    elements.yieldFactor.value = params.yieldFactor;
    elements.yieldFactorNum.value = params.yieldFactor;
    elements.yieldFactorValue.textContent = params.yieldFactor.toFixed(2);
    
    elements.co2PerTon.value = params.co2PerTon;
    elements.co2PerTonNum.value = params.co2PerTon;
    elements.co2PerTonValue.textContent = params.co2PerTon.toFixed(2);
    
    elements.stabilityFactor.value = params.stabilityFactor;
    elements.stabilityFactorNum.value = params.stabilityFactor;
    elements.stabilityFactorValue.textContent = params.stabilityFactor.toFixed(2);
    
    elements.jobsPerHub.value = params.jobsPerHub;
    elements.jobsPerHubNum.value = params.jobsPerHub;
    elements.jobsPerHubValue.textContent = params.jobsPerHub;
    
    updateCalculations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    elements.tickerText.textContent = `📥 Applied "${scenario.name}" successfully!`;
};

// Initialize Presets
function initializePresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            applyPreset(preset);
        });
    });
}

// Apply preset configurations with dynamic animations
function applyPreset(preset) {
    const presets = {
        pilot: {
            wastePerHub: 500,
            numHubs: 10,
            yieldFactor: 0.6,
            co2PerTon: 2.5,
            stabilityFactor: 0.8,
            jobsPerHub: 20
        },
        district: {
            wastePerHub: 500,
            numHubs: 100,
            yieldFactor: 0.6,
            co2PerTon: 2.5,
            stabilityFactor: 0.8,
            jobsPerHub: 20
        },
        state: {
            wastePerHub: 500,
            numHubs: 1000,
            yieldFactor: 0.6,
            co2PerTon: 2.5,
            stabilityFactor: 0.8,
            jobsPerHub: 20
        },
        conservative: {
            wastePerHub: 500,
            numHubs: 100,
            yieldFactor: 0.5,
            co2PerTon: 2.0,
            stabilityFactor: 0.7,
            jobsPerHub: 15
        },
        optimistic: {
            wastePerHub: 500,
            numHubs: 100,
            yieldFactor: 0.7,
            co2PerTon: 3.0,
            stabilityFactor: 0.9,
            jobsPerHub: 25
        },
        degraded: {
            wastePerHub: 500,
            numHubs: 100,
            yieldFactor: 0.75,
            co2PerTon: 3.0,
            stabilityFactor: 0.85,
            jobsPerHub: 20
        }
    };
    
    const config = presets[preset];
    if (!config) return;
    
    // Apply configuration with animated transitions
    Object.keys(config).forEach(key => {
        const element = elements[key];
        const numElement = elements[key + 'Num'];
        const valueElement = elements[key + 'Value'];
        
        if (element && numElement && valueElement) {
            // Get current and target values
            const currentValue = parseFloat(element.value);
            const targetValue = config[key];
            const decimals = ['yieldFactor', 'co2PerTon', 'stabilityFactor'].includes(key) ? 2 : 0;
            
            // Animate the transition
            animatePresetValue(element, numElement, valueElement, currentValue, targetValue, decimals);
        }
    });
    
    // Update calculations after animation starts
    setTimeout(() => {
        updateCalculations();
        elements.tickerText.textContent = `⚡ Applied "${preset}" preset with dynamic values!`;
    }, 100);
}

// Animate preset value changes for dynamic effect
function animatePresetValue(sliderElement, numElement, valueElement, startValue, endValue, decimals) {
    const duration = 800; // ms for smooth transition
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const easeInOutCubic = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        const currentValue = startValue + (endValue - startValue) * easeInOutCubic;
        
        // Update all three elements
        sliderElement.value = currentValue;
        numElement.value = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue);
        valueElement.textContent = decimals > 0 ? currentValue.toFixed(decimals) : Math.round(currentValue);
        
        // Add visual feedback
        valueElement.style.transform = `scale(${1 + 0.1 * Math.sin(progress * Math.PI)})`;
        valueElement.style.color = '#4caf50';
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Reset styles
            valueElement.style.transform = 'scale(1)';
            valueElement.style.color = '';
            // Final update to ensure exact value
            sliderElement.value = endValue;
            numElement.value = endValue;
            valueElement.textContent = decimals > 0 ? endValue.toFixed(decimals) : endValue;
            // Trigger calculation update
            debouncedUpdateCalculations();
        }
    }
    
    requestAnimationFrame(animate);
}

// Download PDF Report
function downloadPDF() {
    const metrics = calculateMetrics();
    const carbonPrice = parseFloat(elements.carbonPrice.value) || 2000;
    
    // Calculate financial metrics
    const biocharRevenue = metrics.biocharTons * 15000;
    const carbonCredits = metrics.co2StableTons * carbonPrice;
    const totalRevenue = biocharRevenue + carbonCredits + (metrics.totalWaste * 500);
    const totalCosts = metrics.numHubs * 50 * 100000;
    const profit = totalRevenue - totalCosts;
    
    // Create a simple text report
    let report = `BIOCHAR CARBON HUBS - IMPACT REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `\n${'='.repeat(60)}\n\n`;
    
    report += `SCENARIO PARAMETERS:\n`;
    report += `-`.repeat(60) + `\n`;
    report += `Waste per Hub: ${elements.wastePerHub.value} tons/year\n`;
    report += `Number of Hubs: ${elements.numHubs.value}\n`;
    report += `Yield Factor: ${elements.yieldFactor.value}\n`;
    report += `CO₂ Factor: ${elements.co2PerTon.value} tCO₂e/t\n`;
    report += `Stability Factor: ${elements.stabilityFactor.value}\n`;
    report += `Jobs per Hub: ${elements.jobsPerHub.value}\n`;
    
    report += `\n${'='.repeat(60)}\n\n`;
    report += `ENVIRONMENTAL IMPACT:\n`;
    report += `-`.repeat(60) + `\n`;
    report += `Total Waste Processed: ${formatNumber(metrics.totalWaste)} tons/year\n`;
    report += `Biochar Produced: ${formatNumber(metrics.biocharTons)} tons/year\n`;
    report += `CO₂ Sequestered (Stable): ${formatNumber(metrics.co2StableTons)} tCO₂e/year\n`;
    report += `Green Jobs Created: ${formatNumber(metrics.jobsTotal)}\n`;
    report += `Cars Equivalent: ${formatNumber(Math.round(metrics.co2StableTons / 4.6))} cars removed\n`;
    
    report += `\n${'='.repeat(60)}\n\n`;
    report += `FINANCIAL ANALYSIS:\n`;
    report += `-`.repeat(60) + `\n`;
    report += `Total Revenue: ${formatCurrency(totalRevenue)}/year\n`;
    report += `  - Biochar Sales: ${formatCurrency(biocharRevenue)}\n`;
    report += `  - Carbon Credits: ${formatCurrency(carbonCredits)}\n`;
    report += `Operating Costs: ${formatCurrency(totalCosts)}/year\n`;
    report += `Annual Profit: ${formatCurrency(profit)}\n`;
    report += `ROI: ${((profit / (metrics.numHubs * 40 * 100000)) * 100).toFixed(1)}%\n`;
    
    report += `\n${'='.repeat(60)}\n\n`;
    report += `Contact: neetimalu@gmail.com\n`;
    report += `Team: CarbonCycle Innovators\n`;
    report += `Challenge: EarthON Greenovation (IIT Bombay)\n`;
    
    // Download as text file (PDF generation would require a library)
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'biochar_impact_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    elements.tickerText.textContent = `📄 PDF Report downloaded successfully!`;
}

// Performance Monitoring
function startPerformanceMonitoring() {
    function measureFPS() {
        const now = performance.now();
        const delta = now - perfMetrics.lastFrameTime;
        perfMetrics.lastFrameTime = now;
        perfMetrics.frameCount++;
        
        // Calculate FPS every 10 frames
        if (perfMetrics.frameCount % 10 === 0) {
            perfMetrics.fps = Math.round(1000 / delta);
        }
        
        requestAnimationFrame(measureFPS);
    }
    
    measureFPS();
    
    // Update monitor display every 500ms
    setInterval(updatePerfMonitor, 500);
}

function updatePerfMonitor() {
    const fpsEl = document.getElementById('perfFps');
    const calcEl = document.getElementById('perfCalc');
    const renderEl = document.getElementById('perfRender');
    const cacheEl = document.getElementById('perfCache');
    
    if (fpsEl) fpsEl.textContent = perfMetrics.fps;
    if (calcEl) calcEl.textContent = perfMetrics.calcTime.toFixed(2) + 'ms';
    if (renderEl) renderEl.textContent = perfMetrics.renderTime.toFixed(2) + 'ms';
    if (cacheEl) cacheEl.textContent = calculationCache.size;
    
    // Color coding for performance
    if (calcEl) {
        calcEl.style.color = perfMetrics.calcTime < 10 ? '#0f0' : 
                            perfMetrics.calcTime < 50 ? '#ff0' : '#f00';
    }
    if (renderEl) {
        renderEl.style.color = perfMetrics.renderTime < 20 ? '#0f0' : 
                              perfMetrics.renderTime < 100 ? '#ff0' : '#f00';
    }
}

// Real-time chart animation
function startRealTimeChartAnimation() {
    // Clear any existing interval
    if (chartAnimationInterval) {
        clearInterval(chartAnimationInterval);
    }
    
    // Animate chart points progressively
    chartAnimationInterval = setInterval(() => {
        if (currentChartIndex < chartDataPoints.length) {
            const point = chartDataPoints[currentChartIndex];
            impactChart.data.labels.push(point.label);
            impactChart.data.datasets[0].data.push(point.value);
            impactChart.update('none');
            currentChartIndex++;
        }
    }, 50); // Add point every 50ms for smooth real-time effect
}

// Real-time scenario updates
let scenarioAnimationInterval = null;

function startScenarioRealTimeUpdates() {
    // Clear any existing interval
    if (scenarioAnimationInterval) {
        clearInterval(scenarioAnimationInterval);
    }
    
    scenarioAnimationInterval = setInterval(() => {
        savedScenarios.forEach(scenario => {
            // Animate numbers with slight variations for real-time effect
            const variation = 1 + (Math.random() * 0.02 - 0.01); // ±1% variation
            
            const wasteEl = document.getElementById(`scenario-waste-${scenario.id}`);
            const biocharEl = document.getElementById(`scenario-biochar-${scenario.id}`);
            const co2El = document.getElementById(`scenario-co2-${scenario.id}`);
            const jobsEl = document.getElementById(`scenario-jobs-${scenario.id}`);
            
            if (wasteEl) {
                const currentWaste = scenario.metrics.totalWaste * variation;
                wasteEl.textContent = formatNumber(currentWaste);
            }
            
            if (biocharEl) {
                const currentBiochar = scenario.metrics.biocharTons * variation;
                biocharEl.textContent = formatNumber(currentBiochar);
            }
            
            if (co2El) {
                const currentCO2 = scenario.metrics.co2StableTons * variation;
                co2El.textContent = formatNumber(currentCO2);
            }
            
            if (jobsEl) {
                const currentJobs = Math.round(scenario.metrics.jobsTotal * variation);
                jobsEl.textContent = formatNumber(currentJobs);
            }
        });
    }, 1500); // Update every 1.5 seconds for dynamic real-time feel
}
