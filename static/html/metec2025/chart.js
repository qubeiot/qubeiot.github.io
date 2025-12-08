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
// Optimized to handle large datasets without stack overflow
function processData(dataArray) {
    const grouped = {};
    const length = dataArray.length;
    
    // Process in chunks to avoid stack overflow
    const CHUNK_SIZE = 10000;
    
    for (let i = 0; i < length; i += CHUNK_SIZE) {
        const chunk = dataArray.slice(i, Math.min(i + CHUNK_SIZE, length));
        
        for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            if (!grouped[item.source_group]) {
                grouped[item.source_group] = [];
            }
            grouped[item.source_group].push({
                x: new Date(item.time),
                y: item.rate_kg_per_hr
            });
        }
    }
    
    // Sort each group by time
    const sourceGroups = Object.keys(grouped);
    for (let i = 0; i < sourceGroups.length; i++) {
        const sourceGroup = sourceGroups[i];
        grouped[sourceGroup].sort((a, b) => a.x - b.x);
    }
    
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
                        padding: 15,
                        filter: function(item, chart) {
                            // Hide legend items that end with -c1 through -c6
                            const label = item.text;
                            return !/-c[1-6]$/.test(label);
                        }
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
function renderCumulativeChart(groundTruthUnfiltered, groundTruthFiltered, predictedData) {
    const ctx = document.getElementById('cumulative-plot').getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Ground Truth (unfiltered)',
                    data: groundTruthUnfiltered,
                    borderColor: '#808080', // Grey
                    backgroundColor: '#80808030',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Ground Truth (emissions > 0.2 kg/hr)',
                    data: groundTruthFiltered,
                    borderColor: '#FF6384', // Red
                    backgroundColor: '#FF638430',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                },
                {
                    label: 'Predicted',
                    data: predictedData,
                    borderColor: '#4BC0C0', // Green
                    backgroundColor: '#4BC0C030',
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
                mode: false,
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
                    enabled: false
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
                    },
                    min: new Date('2025-04-01T00:00:00Z')
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
// Optimized to handle large datasets without stack overflow
function calculateRateHistogram(dataArray, rateThreshold = 0) {
    // Collect all rate values and calculate volumes
    const rateVolumePairs = [];
    const length = dataArray.length;
    
    // Process in chunks to avoid stack overflow
    for (let i = 0; i < length; i++) {
        const item = dataArray[i];
        // Apply threshold filter: only include if rate >= threshold
        if (item.rate_kg_per_hr >= rateThreshold) {
            const rate = item.rate_kg_per_hr;
            const volume = rate * INTERVAL_HOURS; // Volume for this 15-minute interval
            rateVolumePairs.push({ rate, volume });
        }
    }
    
    if (rateVolumePairs.length === 0) {
        return { bins: [], labels: [] };
    }
    
    // Find min and max rates - avoid spread operator on large arrays
    let minRate = Infinity;
    let maxRate = -Infinity;
    for (let i = 0; i < rateVolumePairs.length; i++) {
        const rate = rateVolumePairs[i].rate;
        if (rate < minRate) minRate = rate;
        if (rate > maxRate) maxRate = rate;
    }
    
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
    for (let i = 0; i < rateVolumePairs.length; i++) {
        const { rate, volume } = rateVolumePairs[i];
        const binIndex = Math.min(
            Math.floor((rate - minRate) / binWidth),
            numBins - 1
        );
        if (binIndex >= 0 && binIndex < numBins) {
            bins[binIndex].volume += volume;
        }
    }
    
    // Create labels and data arrays
    const labels = [];
    const volumes = [];
    for (let i = 0; i < bins.length; i++) {
        labels.push(bins[i].center.toFixed(2));
        volumes.push(bins[i].volume);
    }
    
    return { bins, labels, volumes };
}

// Store chart instances and time range
let groundTruthChart = null;
let predictedChart = null;
let cumulativeChart = null;
let currentStartTime = null;
let dataMinTime = null;
let dataMaxTime = null;
let groundTruthGrouped = null;
let predictedGrouped = null;
let groundTruthRawData = null; // Store raw data for recalculation
let predictedRawData = null; // Store predicted raw data for histogram
let predictedCumulativeData = null; // Store predicted cumulative data
let groundTruthCumulativeUnfiltered = null; // Store unfiltered ground truth cumulative data
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
// Optimized to avoid stack overflow with large arrays
function getEarliestMidnightUTC(dataArray) {
    let earliest = null;
    const length = dataArray.length;
    
    // Process in chunks to avoid stack overflow
    for (let i = 0; i < length; i++) {
        const date = new Date(dataArray[i].time);
        if (!earliest || date < earliest) {
            earliest = date;
        }
    }
    
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
// Optimized to avoid stack overflow with large arrays
function getLatestTime(dataArray) {
    let latest = null;
    const length = dataArray.length;
    
    // Process in chunks to avoid stack overflow
    for (let i = 0; i < length; i++) {
        const date = new Date(dataArray[i].time);
        if (!latest || date > latest) {
            latest = date;
        }
    }
    return latest;
}

// Function to calculate cumulative volume from total rates
// Filters at the individual source rate level (each item represents one source_group at one time)
// Only includes individual source rates >= threshold, then sums them at each time point
// Optimized to handle large datasets without stack overflow
function calculateCumulativeVolume(dataArray, rateThreshold = 1) {
    // Start date for cumulative volume calculation
    const startDate = new Date('2025-04-01T00:00:00Z');
    const startDateTimestamp = startDate.getTime();
    
    // Filter individual source rates first, then sum at each time point
    // Each item in dataArray represents one source_group's rate at one time point
    const timePoints = {};
    
    // Pre-filter and process data more efficiently
    // Process in chunks to avoid stack overflow
    const length = dataArray.length;
    for (let i = 0; i < length; i++) {
        const item = dataArray[i];
        // Filter at individual source rate level: only include if this source's rate >= threshold
        if (item.rate_kg_per_hr >= rateThreshold) {
            // Convert time to timestamp for efficient comparison
            const itemTimeTimestamp = new Date(item.time).getTime();
            // Apply date filter: only include if time >= start date
            if (itemTimeTimestamp >= startDateTimestamp) {
                const time = item.time;
                if (!timePoints[time]) {
                    timePoints[time] = 0;
                }
                // Sum the filtered individual source rates at each time point
                timePoints[time] += item.rate_kg_per_hr;
            }
        }
    }
    
    // Sort time points using numeric timestamps for better performance
    // Convert to array of [timeString, timestamp] pairs, sort by timestamp, then extract time strings
    // Process in chunks to avoid stack overflow
    const timeKeys = Object.keys(timePoints);
    const timeEntries = [];
    for (let i = 0; i < timeKeys.length; i++) {
        const timeStr = timeKeys[i];
        timeEntries.push({
            timeStr: timeStr,
            timestamp: new Date(timeStr).getTime()
        });
    }
    timeEntries.sort((a, b) => a.timestamp - b.timestamp);
    const sortedTimes = [];
    for (let i = 0; i < timeEntries.length; i++) {
        sortedTimes.push(timeEntries[i].timeStr);
    }
    
    // Calculate cumulative volume using trapezoidal rule
    let cumulativeVolume = 0;
    const cumulativeData = [];
    
    // Add starting point at April 1st, 2025 with cumulative volume 0
    cumulativeData.push({
        x: startDate,
        y: 0
    });
    
    for (let i = 0; i < sortedTimes.length; i++) {
        const time = new Date(sortedTimes[i]);
        const rate = timePoints[sortedTimes[i]];
        
        // Calculate volume increment using trapezoidal rule
        if (i === 0) {
            // First data point after start date: use trapezoidal rule from start date (rate = 0) to this point
            const timeDiff = (time.getTime() - startDate.getTime()) / (1000 * 60 * 60); // hours
            // Use trapezoidal rule: average of 0 (start date) and current rate
            const avgRate = (0 + rate) / 2;
            cumulativeVolume = avgRate * timeDiff;
        } else {
            // Use trapezoidal rule: average of previous and current rate
            // Use INTERVAL_HOURS for regular 15-minute intervals between data points
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
    
    // Update chart data - dataset[0] is unfiltered (grey), dataset[1] is filtered (red)
    cumulativeChart.data.datasets[1].data = groundTruthCumulative;
    cumulativeChart.update('none');
    
    // Calculate and update error metrics using filtered ground truth
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

// Function to decompress data if it's in compressed format
// Compressed format uses arrays: [time, source_group, rate_kg_per_hr]
function decompressData(data) {
    // Check if data is in compressed format (has 'gt' and 'p' keys instead of 'ground_truth' and 'predicted')
    if (data.gt && data.p) {
        // Convert compressed format to original format
        return {
            ground_truth: data.gt.map(item => ({
                time: item[0],
                source_group: item[1],
                rate_kg_per_hr: item[2]
            })),
            predicted: data.p.map(item => ({
                time: item[0],
                source_group: item[1],
                rate_kg_per_hr: item[2]
            }))
        };
    }
    // Already in original format
    return data;
}

// Function to decompress gzip data client-side
async function decompressGzip(arrayBuffer) {
    // Check if browser supports DecompressionStream (modern browsers)
    if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        // Write the compressed data
        writer.write(new Uint8Array(arrayBuffer));
        writer.close();
        
        // Read the decompressed data
        const chunks = [];
        let done = false;
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                chunks.push(value);
            }
        }
        
        // Combine chunks into a single Uint8Array
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Convert to text
        return new TextDecoder().decode(result);
    } else {
        // Fallback: try using pako library if available, or throw error
        throw new Error('Browser does not support DecompressionStream. Please use a modern browser or serve the file with Content-Encoding: gzip header on the server.');
    }
}

// Main function to load and process data
async function loadAndRenderCharts() {
    try {
        const response = await fetch('data.min.json.gz');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let text;
        
        // Check if server already decompressed it (Content-Encoding header)
        const contentEncoding = response.headers.get('Content-Encoding');
        if (contentEncoding && contentEncoding.toLowerCase().includes('gzip')) {
            // Server handled decompression, just get text
            text = await response.text();
        } else {
            // Need to decompress client-side
            const arrayBuffer = await response.arrayBuffer();
            text = await decompressGzip(arrayBuffer);
        }
        
        // Parse JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            // If JSON.parse still fails, try parsing in chunks using a streaming approach
            throw new Error(`Failed to parse JSON: ${parseError.message}`);
        }
        
        // Decompress data if it's in compressed format
        data = decompressData(data);
        
        // Hide loading message
        document.getElementById('loading').style.display = 'none';
        
        // Find the earliest 00:00 UTC and latest time from all data
        // Avoid using spread operator on large arrays to prevent stack overflow
        const groundTruth = data.ground_truth || [];
        const predicted = data.predicted || [];
        
        // Process both arrays separately to find min/max
        const gtMin = getEarliestMidnightUTC(groundTruth);
        const predMin = getEarliestMidnightUTC(predicted);
        const gtMax = getLatestTime(groundTruth);
        const predMax = getLatestTime(predicted);
        
        // Find overall min and max
        dataMinTime = gtMin && predMin ? (gtMin < predMin ? gtMin : predMin) : (gtMin || predMin);
        dataMaxTime = gtMax && predMax ? (gtMax > predMax ? gtMax : predMax) : (gtMax || predMax);
        
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
        
        // Use fixed threshold value (0.2 kg/hr)
        const fixedThreshold = 0.2;
        const thresholdDisplay = document.getElementById('threshold-value');
        thresholdDisplay.textContent = fixedThreshold.toFixed(1);
        
        // Calculate and render cumulative volume chart with fixed threshold
        // Calculate unfiltered ground truth (threshold = 0)
        groundTruthCumulativeUnfiltered = calculateCumulativeVolume(groundTruthRawData, 0);
        // Calculate filtered ground truth with fixed threshold
        const groundTruthCumulative = calculateCumulativeVolume(groundTruthRawData, fixedThreshold);
        predictedCumulativeData = calculateCumulativeVolume(data.predicted || [], 0);
        cumulativeChart = renderCumulativeChart(groundTruthCumulativeUnfiltered, groundTruthCumulative, predictedCumulativeData);
        
        // Calculate and display initial error metrics
        updateCumulativeChart(fixedThreshold);
        
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

