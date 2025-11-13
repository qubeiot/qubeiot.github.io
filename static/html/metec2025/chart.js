// Color map for source groups
const colorMap = {
    '4S': '#9966FF',  // Purple
    '4T': '#FF6384',  // Red
    '4W': '#36A2EB',  // Blue
    '5S': '#FF9F40',   // Orange
    '5W': '#4BC0C0', // Green
    '4F': '#000000', // Black
    'null': '#000000' // Black
};

// Function to process data and group by source_group
function processData(dataArray) {
    const grouped = {};
    
    // Group data by source_group
    dataArray.forEach(item => {
        if (!grouped[item.source_group]) {
            grouped[item.source_group] = [];
        }
        grouped[item.source_group].push({
            x: new Date(item.time),
            y: item.rate_kg_per_hr
        });
    });
    
    // Sort each group by time
    Object.keys(grouped).forEach(sourceGroup => {
        grouped[sourceGroup].sort((a, b) => a.x - b.x);
    });
    
    return grouped;
}

// Shared state for synchronized vertical line
let sharedHoverTime = null;

// Plugin to draw vertical line on hover (synchronized across charts)
const verticalLinePlugin = {
    id: 'verticalLine',
    afterDraw: function(chart) {
        // Get the time value from either chart's hover state
        let hoverTime = null;
        const activeElements = chart.tooltip?._active || [];
        
        if (activeElements.length > 0) {
            // Get time from the active element
            const datasetIndex = activeElements[0].datasetIndex;
            const index = activeElements[0].index;
            if (chart.data.datasets[datasetIndex] && chart.data.datasets[datasetIndex].data[index]) {
                hoverTime = chart.data.datasets[datasetIndex].data[index].x;
                sharedHoverTime = hoverTime;
            }
        } else if (sharedHoverTime) {
            // Use shared time if this chart isn't being hovered
            hoverTime = sharedHoverTime;
        }
        
        // Draw line if we have a time value
        if (hoverTime) {
            const ctx = chart.ctx;
            const xScale = chart.scales.x;
            const x = xScale.getPixelForValue(hoverTime);
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;
            
            // Only draw if x is within the chart bounds
            if (x >= xScale.left && x <= xScale.right) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, topY);
                ctx.lineTo(x, bottomY);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
};

// Function to create datasets for Chart.js
function createDatasets(groupedData, sourceGroups) {
    return sourceGroups.map((sourceGroup) => {
        const data = groupedData[sourceGroup] || [];
        // Get color from colorMap, or use a default color if not found
        const color = colorMap[sourceGroup] || colorMap[String(sourceGroup)] || '#808080';
        return {
            label: sourceGroup,
            data: data,
            borderColor: color,
            backgroundColor: color + '95', // Add transparency
            borderWidth: 1,
            fill: true,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4
        };
    });
}

// Function to create and render Chart.js chart
function renderChart(canvasId, datasets, title, initialMin = undefined, initialMax = undefined) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        plugins: [verticalLinePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Disable animation for better hover performance
            interaction: {
                mode: 'index',
                intersect: false
            },
            onHover: function(event, activeElements, chart) {
                // Trigger redraw to update vertical line on both charts
                if (activeElements.length > 0) {
                    event.native.target.style.cursor = 'crosshair';
                    // Update both charts to show synchronized line
                    if (groundTruthChart) groundTruthChart.update('none');
                    if (predictedChart) predictedChart.update('none');
                } else {
                    event.native.target.style.cursor = 'default';
                    sharedHoverTime = null; // Clear shared time when not hovering
                    // Update both charts to hide line
                    if (groundTruthChart) groundTruthChart.update('none');
                    if (predictedChart) predictedChart.update('none');
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    enabled: false, // Disable default tooltip (we use external)
                    external: function(context) {
                        // Custom external tooltip
                        const tooltipEl = document.getElementById('chartjs-tooltip');
                        
                        // Create tooltip element if it doesn't exist
                        if (!tooltipEl) {
                            const newTooltip = document.createElement('div');
                            newTooltip.id = 'chartjs-tooltip';
                            document.body.appendChild(newTooltip);
                        }
                        
                        const tooltip = document.getElementById('chartjs-tooltip');
                        const tooltipModel = context.tooltip;
                        
                        // Hide if no tooltip
                        if (tooltipModel.opacity === 0) {
                            tooltip.style.opacity = '0';
                            return;
                        }
                        
                        // Get the time point from the tooltip
                        const timePoint = new Date(tooltipModel.dataPoints[0].parsed.x);
                        
                        // Calculate totals for both charts
                        const groundTruthTotal = groundTruthGrouped ? 
                            getTotalRateAtTime(groundTruthGrouped, timePoint) : 0;
                        const predictedTotal = predictedGrouped ? 
                            getTotalRateAtTime(predictedGrouped, timePoint) : 0;
                        
                        // Set tooltip content - multiline format
                        let innerHtml = '<div class="tooltip-date">' + 
                            timePoint.toLocaleString() + '</div>';
                        innerHtml += '<div class="tooltip-line">' +
                            '<strong>Ground Truth Total:</strong> ' + 
                            groundTruthTotal.toFixed(4) + ' kg/hr</div>';
                        innerHtml += '<div class="tooltip-line">' +
                            '<strong>Predicted Total:</strong> ' + 
                            predictedTotal.toFixed(4) + ' kg/hr</div>';
                        
                        tooltip.innerHTML = innerHtml;
                        
                        // Position tooltip
                        const position = context.chart.canvas.getBoundingClientRect();
                        tooltip.style.opacity = '1';
                        tooltip.style.position = 'absolute';
                        tooltip.style.left = position.left + tooltipModel.caretX + 'px';
                        tooltip.style.top = position.top + tooltipModel.caretY + 'px';
                        tooltip.style.pointerEvents = 'none';
                        tooltip.style.background = 'rgba(255, 255, 255, 0.95)';
                        tooltip.style.color = '#333';
                        tooltip.style.padding = '12px';
                        tooltip.style.borderRadius = '6px';
                        tooltip.style.fontSize = '13px';
                        tooltip.style.fontFamily = 'Arial, sans-serif';
                        tooltip.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                        tooltip.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM/dd'
                        }
                    },
                    title: {
                        display: false,
                        text: 'Time'
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    min: initialMin, // Will be set dynamically
                    max: initialMax  // Will be set dynamically
                },
                y: {
                    title: {
                        display: true,
                        text: 'Rate (kg/hr)'
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    min: 0,
                    max: 30
                }
            }
        }
    });
}

// Function to create and render cumulative volume chart
function renderCumulativeChart(groundTruthData, predictedData) {
    const ctx = document.getElementById('cumulative-plot').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Ground Truth',
                    data: groundTruthData,
                    borderColor: '#36A2EB',
                    backgroundColor: '#36A2EB30',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Predicted',
                    data: predictedData,
                    borderColor: '#FF6384',
                    backgroundColor: '#FF638430',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative Volume Over Time',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].parsed.x).toLocaleString();
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' kg';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    grid: {
                        color: '#e0e0e0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative Volume (kg)'
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Function to calculate histogram data - bucket volumes by release rates
function calculateRateHistogram(dataArray, rateThreshold = 0) {
    // Collect all rate values and calculate volumes
    const rateVolumePairs = [];
    
    dataArray.forEach(item => {
        // Apply threshold filter: only include if rate >= threshold
        if (item.rate_kg_per_hr >= rateThreshold) {
            const rate = item.rate_kg_per_hr;
            const volume = rate * INTERVAL_HOURS; // Volume for this 15-minute interval
            rateVolumePairs.push({ rate, volume });
        }
    });
    
    if (rateVolumePairs.length === 0) {
        return { bins: [], labels: [] };
    }
    
    // Find min and max rates
    const rates = rateVolumePairs.map(p => p.rate);
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);
    
    // Create bins - use 20 bins or adjust based on data range
    const numBins = 20;
    const binWidth = (maxRate - minRate) / numBins;
    
    // Initialize bins
    const bins = Array(numBins).fill(0).map((_, i) => ({
        start: minRate + i * binWidth,
        end: minRate + (i + 1) * binWidth,
        center: minRate + (i + 0.5) * binWidth,
        volume: 0
    }));
    
    // Populate bins with volumes
    rateVolumePairs.forEach(({ rate, volume }) => {
        const binIndex = Math.min(
            Math.floor((rate - minRate) / binWidth),
            numBins - 1
        );
        if (binIndex >= 0 && binIndex < numBins) {
            bins[binIndex].volume += volume;
        }
    });
    
    // Create labels and data arrays
    const labels = bins.map(bin => bin.center.toFixed(2));
    const volumes = bins.map(bin => bin.volume);
    
    return { bins, labels, volumes };
}

// Function to create and render rate histogram chart
function renderRateHistogram(groundTruthData, predictedData, rateThreshold = 0) {
    const ctx = document.getElementById('rate-histogram-plot').getContext('2d');
    
    // Collect all rate values from both datasets to determine unified bin ranges
    const allRates = [];
    groundTruthData.forEach(item => {
        if (item.rate_kg_per_hr >= rateThreshold) {
            allRates.push(item.rate_kg_per_hr);
        }
    });
    predictedData.forEach(item => {
        if (item.rate_kg_per_hr >= rateThreshold) {
            allRates.push(item.rate_kg_per_hr);
        }
    });
    
    if (allRates.length === 0) {
        // No data to display
        if (rateHistogramChart) {
            rateHistogramChart.destroy();
            rateHistogramChart = null;
        }
        return;
    }
    
    // Find min and max rates across both datasets
    const minRate = Math.min(...allRates);
    const maxRate = Math.max(...allRates);
    
    // Use fixed bin width of 2 kg/hr
    const binWidth = 2.0;
    
    // Calculate number of bins needed (round up to cover max rate)
    // Start from 0, so bins are: 0-2, 2-4, 4-6, etc.
    const numBins = Math.ceil((maxRate + binWidth) / binWidth);
    
    // Initialize bins starting from 0
    // Bins: 0-2, 2-4, 4-6, 6-8, etc.
    const bins = Array(numBins).fill(0).map((_, i) => ({
        start: i * binWidth,
        end: (i + 1) * binWidth,
        center: (i + 0.5) * binWidth,
        gtVolume: 0,
        predVolume: 0
    }));
    
    // Populate bins with ground truth volumes
    groundTruthData.forEach(item => {
        if (item.rate_kg_per_hr >= rateThreshold) {
            const rate = item.rate_kg_per_hr;
            const volume = rate * INTERVAL_HOURS;
            // Calculate bin index: rate falls into bin floor(rate / binWidth)
            const binIndex = Math.min(
                Math.floor(rate / binWidth),
                numBins - 1
            );
            if (binIndex >= 0 && binIndex < numBins) {
                bins[binIndex].gtVolume += volume;
            }
        }
    });
    
    // Populate bins with predicted volumes
    predictedData.forEach(item => {
        if (item.rate_kg_per_hr >= rateThreshold) {
            const rate = item.rate_kg_per_hr;
            const volume = rate * INTERVAL_HOURS;
            // Calculate bin index: rate falls into bin floor(rate / binWidth)
            const binIndex = Math.min(
                Math.floor(rate / binWidth),
                numBins - 1
            );
            if (binIndex >= 0 && binIndex < numBins) {
                bins[binIndex].predVolume += volume;
            }
        }
    });
    
    // Create labels and data arrays - use right edge of bucket for labels
    const labels = bins.map(bin => bin.end.toFixed(0));
    const gtVolumes = bins.map(bin => bin.gtVolume);
    const predVolumes = bins.map(bin => bin.predVolume);
    
    // Destroy existing chart if it exists
    if (rateHistogramChart) {
        rateHistogramChart.destroy();
    }
    
    rateHistogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ground Truth',
                    data: gtVolumes,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue with opacity
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 4
                },
                {
                    label: 'Predicted',
                    data: predVolumes,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red with opacity
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Volume Distribution by Release Rate',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const binIndex = context[0].dataIndex;
                            const bin = bins[binIndex];
                            return `Rate: ${bin.start.toFixed(2)} - ${bin.end.toFixed(2)} kg/hr`;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' kg';
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Release Rate (kg/hr)'
                    },
                    grid: {
                        color: '#e0e0e0'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Volume (kg)'
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Store chart instances and time range
let groundTruthChart = null;
let predictedChart = null;
let cumulativeChart = null;
let rateHistogramChart = null;
let currentStartTime = null;
let dataMinTime = null;
let dataMaxTime = null;
let groundTruthGrouped = null;
let predictedGrouped = null;
let groundTruthRawData = null; // Store raw data for recalculation
let predictedRawData = null; // Store predicted raw data for histogram
let predictedCumulativeData = null; // Store predicted cumulative data
const INTERVAL_HOURS = 0.25; // 15 minutes = 0.25 hours

// Function to get the start of the half-month period containing a date
// First half: 1st to 15th, Second half: 16th to last day of month
function getHalfMonthStart(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    // If day is 1-15, return 1st; if 16-31, return 16th
    const startDay = day <= 15 ? 1 : 16;
    return new Date(Date.UTC(year, month, startDay, 0, 0, 0, 0));
}

// Function to get the end of the half-month period containing a date
function getHalfMonthEnd(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    
    if (day <= 15) {
        // First half: ends on 15th
        return new Date(Date.UTC(year, month, 15, 23, 59, 59, 999));
    } else {
        // Second half: ends on last day of month
        // Get first day of next month, then subtract 1 day
        const lastDay = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
        return lastDay;
    }
}

// Function to get the start of the previous half-month period
function getPreviousHalfMonth(date) {
    const halfMonthStart = getHalfMonthStart(date);
    const year = halfMonthStart.getUTCFullYear();
    const month = halfMonthStart.getUTCMonth();
    const day = halfMonthStart.getUTCDate();
    
    if (day === 1) {
        // Currently in first half, go to second half of previous month
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        return new Date(Date.UTC(prevYear, prevMonth, 16, 0, 0, 0, 0));
    } else {
        // Currently in second half, go to first half of same month
        return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    }
}

// Function to get the start of the next half-month period
function getNextHalfMonth(date) {
    const halfMonthStart = getHalfMonthStart(date);
    const year = halfMonthStart.getUTCFullYear();
    const month = halfMonthStart.getUTCMonth();
    const day = halfMonthStart.getUTCDate();
    
    if (day === 1) {
        // Currently in first half, go to second half of same month
        return new Date(Date.UTC(year, month, 16, 0, 0, 0, 0));
    } else {
        // Currently in second half, go to first half of next month
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        return new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0));
    }
}

// Function to get the earliest 00:00 UTC time from data
function getEarliestMidnightUTC(dataArray) {
    let earliest = null;
    dataArray.forEach(item => {
        const date = new Date(item.time);
        if (!earliest || date < earliest) {
            earliest = date;
        }
    });
    if (earliest) {
        // Round down to 00:00 UTC
        const utcDate = new Date(Date.UTC(
            earliest.getUTCFullYear(),
            earliest.getUTCMonth(),
            earliest.getUTCDate(),
            0, 0, 0, 0
        ));
        return utcDate;
    }
    return null;
}

// Function to get the latest time from data
function getLatestTime(dataArray) {
    let latest = null;
    dataArray.forEach(item => {
        const date = new Date(item.time);
        if (!latest || date > latest) {
            latest = date;
        }
    });
    return latest;
}

// Function to calculate cumulative volume from total rates
function calculateCumulativeVolume(dataArray, rateThreshold = 1) {
    // First, get all unique time points and calculate total rate at each
    // Filter out source groups with rate below threshold
    const timePoints = {};
    
    dataArray.forEach(item => {
        // Apply threshold filter: only include if rate >= threshold
        if (item.rate_kg_per_hr >= rateThreshold) {
            const time = item.time;
            if (!timePoints[time]) {
                timePoints[time] = 0;
            }
            timePoints[time] += item.rate_kg_per_hr;
        }
    });
    
    // Sort time points as dates (not strings) to ensure proper chronological order
    const sortedTimes = Object.keys(timePoints).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
    });
    
    // Calculate cumulative volume using trapezoidal rule
    let cumulativeVolume = 0;
    const cumulativeData = [];
    
    for (let i = 0; i < sortedTimes.length; i++) {
        const time = new Date(sortedTimes[i]);
        const rate = timePoints[sortedTimes[i]];
        
        // Calculate volume increment using trapezoidal rule
        if (i === 0) {
            // First point: assume rate is constant for half interval before
            cumulativeVolume = rate * (INTERVAL_HOURS / 2);
        } else {
            // Use trapezoidal rule: average of previous and current rate
            const prevRate = timePoints[sortedTimes[i - 1]];
            const avgRate = (prevRate + rate) / 2;
            const volumeIncrement = avgRate * INTERVAL_HOURS;
            cumulativeVolume += volumeIncrement;
        }
        
        cumulativeData.push({
            x: time,
            y: cumulativeVolume
        });
    }
    
    return cumulativeData;
}

// Function to get final cumulative volume from cumulative data
function getFinalCumulativeVolume(cumulativeData) {
    if (!cumulativeData || cumulativeData.length === 0) {
        return 0;
    }
    // Return the last value (final cumulative volume)
    return cumulativeData[cumulativeData.length - 1].y;
}

// Function to update cumulative chart with new threshold
function updateCumulativeChart(threshold) {
    if (!groundTruthRawData || !predictedCumulativeData || !cumulativeChart) {
        return;
    }
    
    // Recalculate ground truth cumulative with threshold filter
    const groundTruthCumulative = calculateCumulativeVolume(groundTruthRawData, threshold);
    
    // Update chart data
    cumulativeChart.data.datasets[0].data = groundTruthCumulative;
    cumulativeChart.update('none');
    
    // Calculate and update error metrics
    const groundTruthFinal = getFinalCumulativeVolume(groundTruthCumulative);
    const predictedFinal = getFinalCumulativeVolume(predictedCumulativeData);
    const errorKg = predictedFinal - groundTruthFinal;
    const errorPercent = groundTruthFinal !== 0 ? (errorKg / groundTruthFinal) * 100 : 0;
    
    // Update error display
    document.getElementById('error-kg').textContent = errorKg.toFixed(2);
    document.getElementById('error-percent').textContent = errorPercent.toFixed(2);
}

// Function to get total rate at a specific time point from grouped data
function getTotalRateAtTime(groupedData, timePoint) {
    // Find the closest time point (within 15 minutes tolerance)
    const tolerance = 15 * 60 * 1000; // 15 minutes in milliseconds
    let total = 0;
    
    Object.keys(groupedData).forEach(sourceGroup => {
        const data = groupedData[sourceGroup];
        // First try to find exact match
        let point = data.find(d => d.x.getTime() === timePoint.getTime());
        
        // If no exact match, find closest within tolerance
        if (!point) {
            let minDiff = Infinity;
            data.forEach(d => {
                const diff = Math.abs(d.x.getTime() - timePoint.getTime());
                if (diff <= tolerance && diff < minDiff) {
                    minDiff = diff;
                    point = d;
                }
            });
        }
        
        if (point) {
            total += point.y;
        }
    });
    
    return total;
}

// Function to update both charts' time range
function updateTimeRange(startTime) {
    const endTime = getHalfMonthEnd(startTime);
    
    // Update both charts
    if (groundTruthChart) {
        groundTruthChart.options.scales.x.min = startTime;
        groundTruthChart.options.scales.x.max = endTime;
        groundTruthChart.update('none'); // 'none' prevents animation
    }
    
    if (predictedChart) {
        predictedChart.options.scales.x.min = startTime;
        predictedChart.options.scales.x.max = endTime;
        predictedChart.update('none');
    }
    
    // Update current time
    currentStartTime = startTime;
    
    // Update time range display
    const startStr = startTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
    });// + ' 00:00 UTC';
    const endStr = endTime.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'UTC'
    });// + ' 23:59 UTC';
    document.getElementById('time-range-display').textContent = 
        `${startStr} - ${endStr}`;
    
    // Update navigation buttons
    updateNavigationButtons(startTime);
}

// Function to update navigation button states
function updateNavigationButtons(startTime) {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    // Check if we can go backward
    const canGoBack = startTime > dataMinTime;
    prevButton.disabled = !canGoBack;
    
    // Check if we can go forward
    const endTime = getHalfMonthEnd(startTime);
    const canGoForward = endTime < dataMaxTime;
    nextButton.disabled = !canGoForward;
}

// Function to navigate backward
function navigateBackward() {
    if (currentStartTime) {
        const newStartTime = getPreviousHalfMonth(currentStartTime);
        // Ensure we don't go before dataMinTime
        if (newStartTime >= dataMinTime) {
            updateTimeRange(newStartTime);
        } else {
            // Go to the first half-month period that contains or starts after dataMinTime
            const firstHalfMonthStart = getHalfMonthStart(dataMinTime);
            updateTimeRange(firstHalfMonthStart);
        }
    }
}

// Function to navigate forward
function navigateForward() {
    if (currentStartTime) {
        const newStartTime = getNextHalfMonth(currentStartTime);
        const newEndTime = getHalfMonthEnd(newStartTime);
        // Ensure we don't go beyond dataMaxTime
        if (newStartTime <= dataMaxTime) {
            updateTimeRange(newStartTime);
        } else {
            // Go to the last possible half-month period that ends at or before dataMaxTime
            const lastHalfMonthStart = getHalfMonthStart(dataMaxTime);
            const lastHalfMonthEnd = getHalfMonthEnd(lastHalfMonthStart);
            if (lastHalfMonthEnd <= dataMaxTime && lastHalfMonthStart >= dataMinTime) {
                updateTimeRange(lastHalfMonthStart);
            }
        }
    }
}

// Main function to load and process data
async function loadAndRenderCharts() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Hide loading message
        document.getElementById('loading').style.display = 'none';
        
        // Find the earliest 00:00 UTC and latest time from all data
        const allData = [...(data.ground_truth || []), ...(data.predicted || [])];
        dataMinTime = getEarliestMidnightUTC(allData);
        dataMaxTime = getLatestTime(allData);
        
        if (!dataMinTime) {
            throw new Error('No valid time data found');
        }
        
        // Store raw ground truth data for filtering
        groundTruthRawData = data.ground_truth || [];
        // Store raw predicted data for histogram
        predictedRawData = data.predicted || [];
        
        // Process ground truth data
        groundTruthGrouped = processData(groundTruthRawData);
        const sourceGroups = Object.keys(groundTruthGrouped).sort();
        
        // Create datasets for ground truth
        const groundTruthDatasets = createDatasets(groundTruthGrouped, sourceGroups);
        
        // Process predicted data
        predictedGrouped = processData(data.predicted || []);
        const predictedDatasets = createDatasets(predictedGrouped, sourceGroups);
        
        // Show chart containers and navigation
        document.getElementById('ground-truth-chart').style.display = 'block';
        document.getElementById('predicted-chart').style.display = 'block';
        document.getElementById('cumulative-chart').style.display = 'block';
        document.getElementById('rate-histogram-chart').style.display = 'block';
        document.getElementById('navigation-container').style.display = 'flex';
        
        // Calculate initial time range - start with second half-month period
        const firstHalfMonthStart = getHalfMonthStart(dataMinTime);
        const initialStartTime = getNextHalfMonth(firstHalfMonthStart);
        const initialEndTime = getHalfMonthEnd(initialStartTime);
        currentStartTime = initialStartTime;

        // Render charts with initial time range set (second half-month period)
        groundTruthChart = renderChart('ground-truth-plot', groundTruthDatasets, 'Ground Truth', initialStartTime, initialEndTime);
        predictedChart = renderChart('predicted-plot', predictedDatasets, 'Predicted', initialStartTime, initialEndTime);
        
        // Update time range display and navigation buttons
        updateTimeRange(initialStartTime);
        
        // Add event listener for threshold slider
        const slider = document.getElementById('rate-threshold-slider');
        const thresholdDisplay = document.getElementById('threshold-value');
        const initialThreshold = parseFloat(slider.value);
        
        // Calculate and render cumulative volume chart with initial threshold
        const groundTruthCumulative = calculateCumulativeVolume(groundTruthRawData, initialThreshold);
        predictedCumulativeData = calculateCumulativeVolume(data.predicted || [], 0);
        cumulativeChart = renderCumulativeChart(groundTruthCumulative, predictedCumulativeData);
        
        // Create histogram with no threshold filtering (threshold = 0)
        renderRateHistogram(groundTruthRawData, predictedRawData, 0);
        
        // Calculate and display initial error metrics
        updateCumulativeChart(initialThreshold);
        
        slider.addEventListener('input', function(e) {
            const threshold = parseFloat(e.target.value);
            thresholdDisplay.textContent = threshold.toFixed(1);
            updateCumulativeChart(threshold);
        });
        
        // Add event listeners for navigation buttons
        document.getElementById('prev-button').addEventListener('click', navigateBackward);
        document.getElementById('next-button').addEventListener('click', navigateForward);
        
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Error loading data: ${error.message}. Make sure data.json is in the same directory.`;
        console.error('Error:', error);
    }
}

// Load data when page loads
window.addEventListener('DOMContentLoaded', loadAndRenderCharts);

