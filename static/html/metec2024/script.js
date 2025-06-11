let chart = null; // Store rate chart instance globally
let volumeChart = null; // Store volume chart instance globally
let pieChart1 = null; // Store first pie chart instance
let pieChart2 = null; // Store second pie chart instance
let dailyOverviewChart = null; // Store daily overview chart instance
let errorChart = null; // Store error chart instance
let minuteAveragedDatasets = []; // Store 1-minute averaged datasets
let hourlyAveragedDatasets = []; // Store 1-hour averaged datasets
let dailyAveragedDatasets = []; // Store 24-hour averaged datasets
let volumeDatasets = []; // Store volume datasets
let sourceVolumeData = {}; // Store source-specific volume data
let dailyData = {}; // Store daily data for overview
let sourceColorMapping = {}; // Store consistent color mapping for sources

// Function to generate random colors for different datasets
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to move the view by one day
function moveView(days) {
    if (!chart) return;
    
    const xAxis = chart.scales.x;
    const dayInMs = 24 * 60 * 60 * 1000;
    const range = xAxis.max - xAxis.min;
    const newMin = xAxis.min + (days * dayInMs);
    
    chart.zoomScale('x', {
        min: newMin,
        max: newMin + range
    });
}

// Function to zoom to one day
function zoomToOneDay() {
    if (!chart) return;
    
    const xAxis = chart.scales.x;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    chart.zoomScale('x', {
        min: xAxis.min,
        max: xAxis.min + dayInMs
    });
    
    // Set toggle to hourly view when zoomed
    const averageToggle = getElement('averageToggle');
    if (averageToggle) {
        averageToggle.checked = false;
        updateChartDatasets('hourly');
    }
    
    updateNavigationButtons();
}

// Function to zoom out
function zoomOut() {
    if (!chart) return;
    
    const xAxis = chart.scales.x;
    const range = xAxis.max - xAxis.min;
    const center = xAxis.min + range / 2;
    
    chart.zoomScale('x', {
        min: center - range,
        max: center + range
    });
    
    // Reset bar chart highlighting
    if (dailyOverviewChart) {
        dailyOverviewChart.data.datasets.forEach(dataset => {
            dataset.backgroundColor = dataset.originalColor;
        });
        dailyOverviewChart.update('none');
    }
}

// Function to update chart datasets based on view type
function updateChartDatasets(viewType) {
    if (!chart) return;
    
    // Update label states
    document.getElementById('hourlyLabel').classList.toggle('active', viewType === 'hourly');
    document.getElementById('dailyLabel').classList.toggle('active', viewType === 'daily');
    
    // Update chart data
    switch (viewType) {
        case 'hourly':
            chart.data.datasets = minuteAveragedDatasets;
            break;
        case 'daily':
            chart.data.datasets = dailyAveragedDatasets;
            break;
    }
    chart.update('none');
}

// Function to generate consistent colors for source groups
function getSourceColor(sourceId) {
    if (!sourceColorMapping[sourceId]) {
        const colorMap = {
            '4S': '#FF6384',  // Red
            '4T': '#36A2EB',  // Blue
            '4W': '#FFCE56',  // Yellow
            '5S': '#4BC0C0',  // Teal
            '5W': '#9966FF',  // Purple
            '4F': '#FF9F40',   // Orange
            'null': '#000000'
        };
        sourceColorMapping[sourceId] = colorMap[sourceId] || getRandomColor();
    }
    return sourceColorMapping[sourceId];
}

// Function to get consistent colors for a set of labels
function getConsistentColors(labels) {
    return labels.map(label => getSourceColor(label));
}

// Function to update pie charts based on current zoom level
function updatePieCharts() {
    if (!chart || !pieChart1 || !pieChart2) return;
    
    const xAxis = chart.scales.x;
    const startTime = xAxis.min;
    const endTime = xAxis.max;
    
    // Calculate total volume for each source in the current time window
    const sourceVolumes1 = {};
    const sourceVolumes2 = {};
    
    // Process each file's data
    for (const [fileName, data] of Object.entries(sourceVolumeData)) {
        for (const [sourceId, points] of Object.entries(data)) {
            const filteredPoints = points.filter(point => 
                point.x >= startTime && point.x <= endTime
            );
            
            if (filteredPoints.length > 0) {
                const startVolume = filteredPoints[0].y;
                const endVolume = filteredPoints[filteredPoints.length - 1].y;
                const volume = endVolume - startVolume;
                
                // Assign to appropriate pie chart based on file name
                if (fileName === 'ground_truth_emissions') {
                    if (!sourceVolumes1[sourceId]) {
                        sourceVolumes1[sourceId] = 0;
                    }
                    sourceVolumes1[sourceId] += volume;
                } else {
                    if (!sourceVolumes2[sourceId]) {
                        sourceVolumes2[sourceId] = 0;
                    }
                    sourceVolumes2[sourceId] += volume;
                }
            }
        }
    }
    
    // Update pie charts with consistent colors
    updatePieChart(pieChart1, sourceVolumes1, 'Ground Truth Emissions');
    updatePieChart(pieChart2, sourceVolumes2, 'Qube');
}

// Function to update a single pie chart
function updatePieChart(pieChart, sourceVolumes, title) {
    // Sort the source IDs
    const sortedLabels = Object.keys(sourceVolumes).sort();
    const data = sortedLabels.map(label => sourceVolumes[label]);
    const backgroundColors = sortedLabels.map(sourceId => getSourceColor(sourceId));
    
    pieChart.data.labels = sortedLabels;
    pieChart.data.datasets[0].data = data;
    pieChart.data.datasets[0].backgroundColor = backgroundColors;
    pieChart.options.plugins.title.text = title;

    // ✅ Properly set the legend position (for Chart.js v3+)
    pieChart.options.plugins.legend.position = 'right';

    pieChart.update('none');
}


// Function to get color based on dataset name
function getDatasetColor(fileName) {
    if (fileName === 'emissions') {
        return '#4CAF50';  // Green
    } else if (fileName === 'ground_truth_emissions') {
        return '#424242';  // Dark grey
    }
    return getRandomColor();  // Fallback for any other datasets
}

// Function to create daily overview data
function createDailyOverviewData(allData) {
    const dailyOverview = {};
    
    for (const [fileName, data] of Object.entries(allData)) {
        const hourlyData = data.hourly_avg.map(point => ({
            x: new Date(point.x),
            y: point.y
        }));
        
        // Group data by day
        const days = {};
        hourlyData.forEach(point => {
            const day = point.x.toISOString().split('T')[0];
            if (!days[day]) {
                days[day] = [];
            }
            days[day].push(point.y);
        });
        
        // Calculate average for each day
        dailyOverview[fileName] = Object.entries(days).map(([day, values]) => ({
            day: new Date(day),
            average: values.reduce((a, b) => a + b, 0) / values.length
        }));
    }
    
    return dailyOverview;
}

// Function to update daily overview chart highlighting
function updateDailyOverviewHighlighting() {
    if (!chart || !dailyOverviewChart) return;
    
    const xAxis = chart.scales.x;
    const startTime = xAxis.min;
    const endTime = xAxis.max;
    
    // Find which day is currently in view
    const currentDay = new Date(startTime).toISOString().split('T')[0];
    
    // Update dataset background colors
    dailyOverviewChart.data.datasets.forEach(dataset => {
        dataset.backgroundColor = dataset.data.map(point => {
            const pointDay = new Date(point.x).toISOString().split('T')[0];
            return pointDay === currentDay ? '#FFA726' : dataset.originalColor;
        });
    });
    
    dailyOverviewChart.update('none');
}

// Function to get DOM element with error handling
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with id '${id}' not found`);
        return null;
    }
    return element;
}

// Function to add event listener with error handling
function addEventListenerSafe(element, event, handler) {
    if (!element) {
        console.error(`Cannot add ${event} listener to null element`);
        return;
    }
    element.addEventListener(event, handler);
}

// Main function to load and process data
async function loadAndProcessData() {
    const loadingElement = getElement('loading');
    if (!loadingElement) return;

    try {
        const response = await fetch('data.json');
        const allData = await response.json();
        
        minuteAveragedDatasets = [];
        hourlyAveragedDatasets = [];
        dailyAveragedDatasets = [];
        volumeDatasets = [];
        sourceVolumeData = {};

        
        // Create daily overview data
        dailyData = createDailyOverviewData(allData);
        
        for (const [fileName, data] of Object.entries(allData)) {
            try {
                let name = '';
                if (fileName === 'ground_truth_emissions') {
                    name = 'Ground Truth';
                } else {
                    name = 'Qube';
                }
                // Convert string dates to Date objects
                const processData = (data) => data.map(point => ({
                    x: new Date(point.x),
                    y: point.y
                }));

                minuteAveragedDatasets.push({
                    label: `${name} (1-min avg)`,
                    data: processData(data.minute_data),
                    borderColor: getDatasetColor(fileName),
                    fill: false,
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                });

                hourlyAveragedDatasets.push({
                    label: `${name} (1-hr avg)`,
                    data: processData(data.hourly_avg),
                    borderColor: getDatasetColor(fileName),
                    fill: false,
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                });

                dailyAveragedDatasets.push({
                    label: `${name} (24-hr avg)`,
                    data: processData(data.daily_avg),
                    borderColor: getDatasetColor(fileName),
                    fill: false,
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                });

                volumeDatasets.push({
                    label: `${name} (cumulative volume)`,
                    data: processData(data.volume),
                    borderColor: getDatasetColor(fileName),
                    fill: false,
                    tension: 0.1,
                    borderWidth: 2,
                    pointRadius: 0
                });

                // Process source-specific volume data
                sourceVolumeData[fileName] = {};
                for (const [sourceId, points] of Object.entries(data.source_volumes)) {
                    sourceVolumeData[fileName][sourceId] = processData(points);
                }
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error);
            }
        }

        createCharts();
        loadingElement.style.display = 'none';
    } catch (error) {
        console.error('Error loading data:', error);
        if (loadingElement) {
            loadingElement.textContent = 'Error loading data. Please check the console for details.';
        }
    }
}

// Function to calculate percent error by window size
function calculatePercentErrorByWindow() {
    const hourlyErrors = [];
    const groundTruthData = hourlyAveragedDatasets.find(d => d.label.includes('Ground Truth'));
    const estimatedData = hourlyAveragedDatasets.find(d => d.label.includes('Qube'));
    
    if (!groundTruthData || !estimatedData) {
        console.log('Could not find ground truth or estimated dataset');
        return;
    }
    
    // Calculate hourly errors
    const numPoints = Math.min(groundTruthData.data.length, estimatedData.data.length);
    for (let i = 0; i < numPoints; i++) {
        const groundTruth = groundTruthData.data[i].y;
        const estimated = estimatedData.data[i].y;
    
        if (!isNaN(groundTruth) && !isNaN(estimated) && groundTruth !== 0) {
            hourlyErrors.push({
                hour: i,
                actual: groundTruth,
                predicted: estimated,
                error: estimated - groundTruth
            });
        }
    }

    function calculateTotalPercentErrorByWindow(windowSize) {
        let percentErrors = [];
        let windowSizeMinutes = windowSize*60*24;
        for (let i = 0; i <= hourlyErrors.length - windowSizeMinutes; i++) {
            const window = hourlyErrors.slice(i, i + windowSizeMinutes);
    
            const totalActual = window.reduce((sum, d) => sum + d.actual, 0);
            const totalPredicted = window.reduce((sum, d) => sum + d.predicted, 0);
    
            if (totalActual !== 0) {
                const percentError = ((totalPredicted - totalActual) / totalActual) * 100;
                percentErrors.push(Math.abs(percentError));
            }
        }
    
        // Average percent error over all sliding windows
        return percentErrors.length > 0
            ? percentErrors.reduce((a, b) => a + b, 0) / percentErrors.length
            : NaN;
    }

    function calculateTotalErrorByWindow(windowSize) {
        let totalErrors = [];
        let windowSizeMinutes = windowSize*60*24;
        for (let i = 0; i <= hourlyErrors.length - windowSizeMinutes; i++) {
            const window = hourlyErrors.slice(i, i + windowSizeMinutes);
    
            const totalActual = window.reduce((sum, d) => sum + d.actual, 0);
            const totalPredicted = window.reduce((sum, d) => sum + d.predicted, 0);
    
            totalErrors.push(Math.abs(totalPredicted - totalActual)/windowSizeMinutes);
        }
        // Average percent error over all sliding windows
        return totalErrors.length > 0
            ? totalErrors.reduce((a, b) => a + b, 0) / totalErrors.length
            : NaN;
    }

    const windowSizes = [1/24, 8/24, 1,2,3,4,5,6,7,14,21];
    const percentErrorsByWindowSize = windowSizes.map(windowSize => ({
        windowSize,
        meanPercentError: calculateTotalErrorByWindow(windowSize)
    }));

    // Update percent error chart
    if (errorChart) {
        errorChart.data.labels = percentErrorsByWindowSize.map(d => d.windowSize);
        errorChart.data.datasets[0].data = percentErrorsByWindowSize.map(d => d.meanPercentError);
        errorChart.update('none');
    }

    return percentErrorsByWindowSize;
}

// Function to calculate windowed average errors
function calculateWindowedErrors(errors, windowSize) {
    const windowedErrors = [];
    for (let i = 0; i <= errors.length - windowSize; i++) {
        const window = errors.slice(i, i + windowSize);
        const avgError = window.reduce((a, b) => a + b, 0) / windowSize;
        windowedErrors.push(avgError);
    }
    return windowedErrors;
}

// Function to calculate error statistics
function calculateErrorStats(windowSize = 1) {
    const errors = [];
    const percentErrors = [];
    
    // Get hourly averaged data
    const groundTruthData = hourlyAveragedDatasets.find(d => d.label.includes('Ground Truth'));
    const estimatedData = hourlyAveragedDatasets.find(d => d.label.includes('Qube'));
    
    if (!groundTruthData || !estimatedData) {
        console.log('Could not find ground truth or estimated dataset');
        return { errors: [], stats: null };
    }
    
    // Calculate errors
    const numPoints = Math.min(groundTruthData.data.length, estimatedData.data.length);
    
    for (let i = 0; i < numPoints; i++) {
        const groundTruth = groundTruthData.data[i].y;
        const estimated = estimatedData.data[i].y;
        
        if (!isNaN(groundTruth) && !isNaN(estimated)) {
            const error = estimated - groundTruth;  // Direct subtraction in kg
            const percentError = error/groundTruth;
            if (!isNaN(error)) {
                errors.push(error);
            }
            if (!isNaN(percentError) && groundTruth !== 0) {
                percentErrors.push(percentError);
            }
        }
    }
    
    if (errors.length === 0) {
        console.log('No valid errors calculated');
        return { errors: [], stats: null };
    }
    
    // Calculate windowed errors if window size > 1
    let finalErrors, finalPercentErrors;
    if (windowSize > 1) {
        finalErrors = calculateWindowedErrors(errors, windowSize);
        finalPercentErrors = [];
        
        // Calculate windowed percentage errors
        for (let i = 0; i <= errors.length - windowSize; i++) {
            const windowGroundTruth = groundTruthData.data.slice(i, i + windowSize).reduce((sum, d) => sum + d.y, 0);
            const windowEstimated = estimatedData.data.slice(i, i + windowSize).reduce((sum, d) => sum + d.y, 0);
            if (windowGroundTruth !== 0) {
                const percentError = (windowEstimated - windowGroundTruth) / windowGroundTruth;
                finalPercentErrors.push(percentError);
            }
        }
    } else {
        finalErrors = errors;
        finalPercentErrors = percentErrors;
    }
    
    if (finalErrors.length === 0) {
        return { errors: [], stats: null };
    }
    
    // Calculate basic statistics
    const maxError = Math.max(...finalErrors.map(Math.abs));
    const meanError = finalErrors.reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / finalErrors.length;
    const maxPercentError = Math.max(...finalPercentErrors.map(Math.abs));
    const meanPercentError = finalPercentErrors.reduce((a, b) => Math.abs(a) + Math.abs(b), 0) / finalPercentErrors.length;
    const sub1kgError = finalErrors.filter(error => Math.abs(error) < 1).length / finalErrors.length;
    
    // Calculate median error
    const sortedErrors = [...finalErrors].sort((a, b) => a - b);
    const medianError = sortedErrors.length % 2 === 0
        ? (sortedErrors[sortedErrors.length / 2 - 1] + sortedErrors[sortedErrors.length / 2]) / 2
        : sortedErrors[Math.floor(sortedErrors.length / 2)];
    
    const sortedPercentErrors = [...finalPercentErrors].sort((a, b) => a - b);
    const medianPercentError = sortedPercentErrors.length % 2 === 0
        ? (sortedPercentErrors[sortedPercentErrors.length / 2 - 1] + sortedPercentErrors[sortedPercentErrors.length / 2]) / 2
        : sortedPercentErrors[Math.floor(sortedPercentErrors.length / 2)];
    
    const stats = {
        maxError,
        meanError,
        medianError,
        maxPercentError,
        meanPercentError,
        medianPercentError,
        sub1kgError,
        windowSize
    };
    
    return { errors: finalErrors, stats };
}

// Function to update error statistics display
function updateErrorStatsDisplay(stats) {
    if (!stats) return;
    
    const maxErrorElement = document.getElementById('maxError');
    const meanErrorElement = document.getElementById('meanError');
    const medianErrorElement = document.getElementById('medianError');
    const otherStatsElement = document.getElementById('otherStats');
    const errorTitleElement = document.getElementById('errorTitle');

    if (maxErrorElement) maxErrorElement.textContent = `${stats.maxError.toFixed(2)} kg/h (${(stats.maxPercentError*100).toFixed(2)}%)`;
    if (meanErrorElement) meanErrorElement.textContent = `${stats.meanError.toFixed(2)} kg/h (${(stats.meanPercentError*100).toFixed(2)}%)`;
    if (medianErrorElement) medianErrorElement.textContent = `${stats.medianError.toFixed(2)} kg/h (${(stats.medianPercentError*100).toFixed(2)}%)`;
    if (otherStatsElement) otherStatsElement.textContent = `Hours with error < 1 kg: ${(stats.sub1kgError*100).toFixed(2)}%`;
    if (errorTitleElement) errorTitleElement.textContent = `Error Statistics (${stats.windowSize}-hour sliding window)`;
}

// Function to create and update error histogram
function createErrorHistogram(initialErrors) {
    const histogramElement = document.getElementById('errorHistogram');
    const windowSizeSlider = document.getElementById('windowSizeSlider');
    const windowSizeLabel = document.getElementById('windowSizeLabel');
    
    if (!histogramElement || !windowSizeSlider || !windowSizeLabel || initialErrors.length === 0) return;

    function updateLabel() {
        const windowSize = parseInt(windowSizeSlider.value);
        windowSizeLabel.textContent = windowSize === 1 ? '1 hour' : `${windowSize} hours`;
    }

    // Update histogram when window size changes
    function updateHistogram() {
        const windowSize = parseInt(windowSizeSlider.value);
        updateLabel();
        
        // Calculate windowed errors and statistics using the refactored function
        const { errors: windowedErrors, stats } = calculateErrorStats(windowSize);
        if (windowedErrors.length === 0) return;

        // Update statistics display
        updateErrorStatsDisplay(stats);

        // Fixed bucket parameters for histogram
        const histMinError = -3;
        const histMaxError = 3;
        // Dynamically determine histogram min/max error range based on data
        //const errorMargin = 0.5; // Add a margin to the min/max for better visualization
        //const minError = Math.min(...windowedErrors);
        //const maxError = Math.max(...windowedErrors);
        //const histMinError = Math.floor(minError - errorMargin);
        //const histMaxError = Math.ceil(maxError + errorMargin);
        const bucketSize = 0.1;
        const numBuckets = Math.ceil((histMaxError - histMinError) / bucketSize);
        const histogram = new Array(numBuckets).fill(0);
        
        // Fill histogram buckets
        windowedErrors.forEach(error => {
            const clampedError = Math.max(histMinError, Math.min(histMaxError, error));
            const bucketIndex = Math.min(Math.floor((clampedError - histMinError) / bucketSize), numBuckets - 1);
            histogram[bucketIndex]++;
        });

        // Calculate percentage of errors within the visible range
        const totalErrors = windowedErrors.length;
        const errorsInRange = windowedErrors.filter(e => e >= histMinError && e <= histMaxError).length;
        const percentageInRange = (errorsInRange / totalErrors * 100).toFixed(1);

        // Create histogram visualization
        const maxCount = Math.max(...histogram);
        const totalCount = histogram.reduce((a, b) => a + b, 0);
        const svgMarginLeft = 40;  // Add left margin for labels
        const svgWidth = 800;
        const barWidth = (svgWidth - svgMarginLeft)/numBuckets;
        const barSpacing = 2;  // Fixed small spacing between bars
        const totalWidth = svgWidth;
        const maxHeight = 150;
        
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", `${totalWidth}px`);
        svg.setAttribute("height", `${maxHeight + 60}px`);
        
        // Add percentage in range text
        const rangeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        rangeText.setAttribute("x", totalWidth / 2);
        rangeText.setAttribute("y", maxHeight + 55);
        rangeText.setAttribute("text-anchor", "middle");
        rangeText.setAttribute("fill", "#666");
        rangeText.setAttribute("font-size", "12px");
        rangeText.textContent = `${percentageInRange}% of errors between ${histMinError} and +${histMaxError} kg`;
        svg.appendChild(rangeText);
        
        histogram.forEach((count, index) => {
            const barHeight = (count / maxCount) * maxHeight;
            const x = svgMarginLeft + index * barWidth;
            const y = maxHeight - barHeight + 20;
            
            const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bar.setAttribute("x", `${x}`);
            bar.setAttribute("y", `${y}`);
            bar.setAttribute("width", `${barWidth - barSpacing}`);
            bar.setAttribute("height", `${barHeight}`);
            bar.setAttribute("fill", "#4CAF50");
            
            const countLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            if (count > 0) {
                countLabel.setAttribute("x", `${x + (barWidth-barSpacing)/2}`);
                countLabel.setAttribute("y", `${y - 5}`);
                countLabel.setAttribute("text-anchor", "middle");
                countLabel.setAttribute("fill", "black");
                countLabel.setAttribute("font-size", "12px");
                countLabel.textContent = (count/totalCount*100).toFixed(2) + "%";
            }
            countLabel.style.display = "none";
            bar.addEventListener("mouseover", () => {
                countLabel.style.display = "block";
            });
            bar.addEventListener("mouseout", () => {
                countLabel.style.display = "none";
            });
            
            // X-axis labels
            if (index % 5 === 0 && index !== 0 && index !== numBuckets - 1) {
                const rangeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                const value = (histMinError + index * bucketSize).toFixed(1);
                rangeLabel.setAttribute("x", `${x + (barWidth-barSpacing)/2}`);
                rangeLabel.setAttribute("y", `${maxHeight + 35}`);
                rangeLabel.setAttribute("text-anchor", "middle");
                rangeLabel.setAttribute("fill", "black");
                rangeLabel.setAttribute("font-size", "10px");
                rangeLabel.textContent = value;
                svg.appendChild(rangeLabel);
            } else if (index == 0) {
                const rangeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                const value = (histMinError + index * bucketSize).toFixed(1);
                rangeLabel.setAttribute("x", `${x + (barWidth-barSpacing)/2-5}`);
                rangeLabel.setAttribute("y", `${maxHeight + 35}`);
                rangeLabel.setAttribute("text-anchor", "middle");
                rangeLabel.setAttribute("fill", "black");
                rangeLabel.setAttribute("font-size", "10px");
                rangeLabel.textContent = "<" + value;
                svg.appendChild(rangeLabel);
            } else if (index == numBuckets - 1) {
                const rangeLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                const value = (histMinError + index * bucketSize).toFixed(1);
                rangeLabel.setAttribute("x", `${x + (barWidth-barSpacing)/2}`);
                rangeLabel.setAttribute("y", `${maxHeight + 35}`);
                rangeLabel.setAttribute("text-anchor", "middle");
                rangeLabel.setAttribute("fill", "black");
                rangeLabel.setAttribute("font-size", "10px");
                rangeLabel.textContent = ">" + value;
                svg.appendChild(rangeLabel);
            }
            svg.appendChild(bar);
            svg.appendChild(countLabel);
        });
        
        histogramElement.innerHTML = '';
        histogramElement.appendChild(svg);
    }

    // Add event listener for slider changes
    windowSizeSlider.addEventListener('input', updateHistogram);
    
    // Initial histogram update
    updateHistogram();
}

// Function to create error chart
function createErrorChart() {
    const errorCtx = document.getElementById('errorChart').getContext('2d');
    
    if (errorChart) {
        errorChart.destroy();
    }
    
    errorChart = new Chart(errorCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Mean Error (kg/h)',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Mean Error by Window Size'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Window Size: ${context.label} days (${context.label*24} hours), Error: ${context.parsed.y.toFixed(2)} kg/h`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Window Size (days)'
                    },
                    ticks: {
                        callback: function(value) {
                            // Format the tick labels to show 1 decimal place
                            return value.toFixed(0);
                        },
                        // Generate more ticks
                        stepSize: 1,
                        // Ensure we show ticks at regular intervals
                        autoSkip: false,
                        // Add minor ticks
                        minor: {
                            enabled: true
                        }
                    },
                    // Add grid lines for better readability
                    grid: {
                        color: function(context) {
                            return context.tick.value % 1 === 0 ? '#ddd' : '#f5f5f5';
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Mean Error (kg/h)'
                    }
                }
            }
        }
    });

    // Calculate and update error data immediately
    calculateErrorByWindow();
}

// Function to calculate error by window size
function calculateErrorByWindow() {
    const hourlyErrors = [];
    const groundTruthData = hourlyAveragedDatasets.find(d => d.label.includes('Ground Truth'));
    const estimatedData = hourlyAveragedDatasets.find(d => d.label.includes('Qube'));
    
    if (!groundTruthData || !estimatedData) {
        console.log('Could not find ground truth or estimated dataset');
        return;
    }
    
    // Calculate hourly errors
    const numPoints = Math.min(groundTruthData.data.length, estimatedData.data.length);
    for (let i = 0; i < numPoints; i++) {
        const groundTruth = groundTruthData.data[i].y;
        const estimated = estimatedData.data[i].y;
    
        if (!isNaN(groundTruth) && !isNaN(estimated) && groundTruth !== 0) {
            hourlyErrors.push({
                hour: i,
                actual: groundTruth,
                predicted: estimated,
                error: estimated - groundTruth
            });
        }
    }

    function calculateTotalErrorByWindow(windowSize) {
        let totalErrors = [];
        let windowSizeMinutes = windowSize*24;
        for (let i = 0; i <= hourlyErrors.length - windowSizeMinutes; i++) {
            const window = hourlyErrors.slice(i, i + windowSizeMinutes);
    
            const totalActual = window.reduce((sum, d) => sum + d.actual, 0);
            const totalPredicted = window.reduce((sum, d) => sum + d.predicted, 0);
    
            totalErrors.push(Math.abs(totalPredicted - totalActual)/windowSizeMinutes);
        }
        return totalErrors.length > 0
            ? totalErrors.reduce((a, b) => a + b, 0) / totalErrors.length
            : NaN;
    }

    // Generate window sizes with more granular steps
    const windowSizes = [];
    windowSizes.push(1/24);
    // Add steps every 4 hours up to 1 day
    for (let i = 1; i < 24/4; i++) {
        windowSizes.push(i*4/24);
    }
    // Add daily steps up to 21 days
    for (let i = 1; i <= 21; i++) {
        windowSizes.push(i);
    }

    const errorsByWindowSize = windowSizes.map(windowSize => ({
        windowSize,
        meanError: calculateTotalErrorByWindow(windowSize)
    }));

    // Update error chart
    if (errorChart) {
        errorChart.data.labels = errorsByWindowSize.map(d => d.windowSize);
        errorChart.data.datasets[0].data = errorsByWindowSize.map(d => d.meanError);
        
        // Set the x-axis max to match the last data point
        const maxWindowSize = Math.max(...windowSizes);
        errorChart.options.scales.x.max = maxWindowSize;
        
        errorChart.update('none');
    }
}

// Function to create daily overview chart
function createDailyOverviewChart() {
    const overviewCtx = getElement('dailyOverviewChart')?.getContext('2d');
    if (!overviewCtx) return;
    
    if (dailyOverviewChart) {
        dailyOverviewChart.destroy();
    }
    
    const overviewDatasets = Object.entries(dailyData).map(([fileName, data]) => ({
        label: fileName === 'ground_truth_emissions' ? 'Ground Truth' : 'Qube',
        data: data.map(point => ({
            x: point.day,
            y: point.average*24
        })),
        backgroundColor: getDatasetColor(fileName),
        originalColor: getDatasetColor(fileName),
        borderWidth: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.75
    }));
    
    dailyOverviewChart = new Chart(overviewCtx, {
        type: 'bar',
        data: {
            datasets: overviewDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Daily Volume (kg)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Overview'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].parsed.x).toISOString().split('T')[0];
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                },
                legend: {
                    display: false
                },
                zoom: {
                    pan: {
                        enabled: false
                    },
                    zoom: {
                        wheel: {
                            enabled: false
                        },
                        pinch: {
                            enabled: false
                        },
                        mode: 'x',
                        drag: {
                            enabled: false
                        }
                    }
                }
            }
        }
    });
}

// Function to create rate chart
function createRateChart() {
    const rateCtx = document.getElementById('timeSeriesChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(rateCtx, {
        type: 'line',
        data: {
            datasets: minuteAveragedDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MM/dd HH:mm'
                        },
                        timezone: 'UTC'
                    },
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    },
                    grid: {
                        color: function(context) {
                            const date = new Date(context.tick.value);
                            return date.getUTCHours() % 6 === 0 ? '#ddd' : '#f5f5f5';
                        }
                    },
                    ticks: {
                        source: 'auto',
                        maxRotation: 0,
                        autoSkip: false,
                        callback: function(value) {
                            const date = new Date(value);
                            return date.toISOString().slice(5, 16).replace('T', ' ');
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Rate (kg/h)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Rate Over Time'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            const hours = String(date.getUTCHours()).padStart(2, '0');
                            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: false
                    },
                    zoom: {
                        wheel: {
                            enabled: false
                        },
                        pinch: {
                            enabled: false
                        },
                        mode: 'x',
                        drag: {
                            enabled: false
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Function to create volume chart
function createVolumeChart() {
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    
    if (volumeChart) {
        volumeChart.destroy();
    }
    
    volumeChart = new Chart(volumeCtx, {
        type: 'line',
        data: {
            datasets: volumeDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'MM/dd HH:mm'
                        },
                        timezone: 'UTC'
                    },
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    },
                    grid: {
                        color: function(context) {
                            const date = new Date(context.tick.value);
                            return date.getUTCHours() % 6 === 0 ? '#ddd' : '#f5f5f5';
                        }
                    },
                    ticks: {
                        source: 'auto',
                        maxRotation: 0,
                        autoSkip: false,
                        callback: function(value) {
                            const date = new Date(value);
                            return date.toISOString().slice(5, 16).replace('T', ' ');
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative Volume'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative Volume Over Time'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            const year = date.getUTCFullYear();
                            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                            const day = String(date.getUTCDate()).padStart(2, '0');
                            const hours = String(date.getUTCHours()).padStart(2, '0');
                            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: false
                    },
                    zoom: {
                        wheel: {
                            enabled: false
                        },
                        pinch: {
                            enabled: false
                        },
                        mode: 'x',
                        drag: {
                            enabled: false
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Function to create pie charts
function createPieCharts() {
    const pieCtx1 = getElement('pieChart1')?.getContext('2d');
    const pieCtx2 = getElement('pieChart2')?.getContext('2d');
    
    if (!pieCtx1 || !pieCtx2) {
        console.error('Could not get pie chart contexts');
        return;
    }
    
    if (pieChart1) {
        pieChart1.destroy();
    }
    if (pieChart2) {
        pieChart2.destroy();
    }
    
    // Initialize source volumes for pie charts
    const sourceVolumes1 = {};
    const sourceVolumes2 = {};
    
    // Process each file's data
    for (const [fileName, data] of Object.entries(sourceVolumeData)) {
        for (const [sourceId, points] of Object.entries(data)) {
            if (points.length > 0) {
                const startVolume = points[0].y;
                const endVolume = points[points.length - 1].y;
                const volume = endVolume - startVolume;
                
                if (fileName === 'ground_truth_emissions') {
                    if (!sourceVolumes1[sourceId]) {
                        sourceVolumes1[sourceId] = 0;
                    }
                    sourceVolumes1[sourceId] += volume;
                } else {
                    if (!sourceVolumes2[sourceId]) {
                        sourceVolumes2[sourceId] = 0;
                    }
                    sourceVolumes2[sourceId] += volume;
                }
            }
        }
    }
    
    // Initialize color mapping for all sources
    const allSources = new Set([
        ...Object.keys(sourceVolumes1),
        ...Object.keys(sourceVolumes2)
    ]);
    
    sourceColorMapping = {};
    Array.from(allSources).forEach(sourceId => {
        getSourceColor(sourceId);
    });
    
    const pieChartConfig = {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: '',
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };
    
    pieChart1 = new Chart(pieCtx1, JSON.parse(JSON.stringify(pieChartConfig)));
    updatePieChart(pieChart1, sourceVolumes1, 'Ground Truth Emissions');
    
    pieChart2 = new Chart(pieCtx2, JSON.parse(JSON.stringify(pieChartConfig)));
    updatePieChart(pieChart2, sourceVolumes2, 'Qube');
}

// Function to create the charts
function createCharts() {
    createDailyOverviewChart();
    createRateChart();
    createVolumeChart();
    createPieCharts();
    createErrorChart();

    // Add event listeners for the control buttons
    const prevDayBtn = getElement('prevDay');
    const nextDayBtn = getElement('nextDay');
    const zoomInBtn = getElement('zoomIn');
    const resetZoomBtn = getElement('resetZoom');
    const averageToggle = getElement('averageToggle');

    addEventListenerSafe(prevDayBtn, 'click', () => {
        moveView(-1);
        moveVolumeView(-1);
    });
    addEventListenerSafe(nextDayBtn, 'click', () => {
        moveView(1);
        moveVolumeView(1);
    });
    addEventListenerSafe(zoomInBtn, 'click', () => {
        zoomToOneDay();
        zoomVolumeToOneDay();
    });
    addEventListenerSafe(resetZoomBtn, 'click', () => {
        chart.resetZoom();
        volumeChart.resetZoom();
        if (dailyOverviewChart) {
            dailyOverviewChart.data.datasets.forEach(dataset => {
                dataset.backgroundColor = dataset.originalColor;
            });
            dailyOverviewChart.update('none');
        }
        volumeChart.data.datasets = volumeDatasets.map(dataset => ({
            ...dataset,
            data: dataset.data.map(point => ({
                x: point.x,
                y: point.y
            }))
        }));
        volumeChart.update('none');
        
        if (pieChart1 && pieChart2) {
            const sourceVolumes1 = {};
            const sourceVolumes2 = {};
            
            for (const [fileName, data] of Object.entries(sourceVolumeData)) {
                for (const [sourceId, points] of Object.entries(data)) {
                    if (points.length > 0) {
                        const startVolume = points[0].y;
                        const endVolume = points[points.length - 1].y;
                        const volume = endVolume - startVolume;
                        
                        if (fileName === 'ground_truth_emissions') {
                            if (!sourceVolumes1[sourceId]) {
                                sourceVolumes1[sourceId] = 0;
                            }
                            sourceVolumes1[sourceId] += volume;
                        } else {
                            if (!sourceVolumes2[sourceId]) {
                                sourceVolumes2[sourceId] = 0;
                            }
                            sourceVolumes2[sourceId] += volume;
                        }
                    }
                }
            }
            
            updatePieChart(pieChart1, sourceVolumes1, 'Ground Truth Emissions');
            updatePieChart(pieChart2, sourceVolumes2, 'Qube');
        }
        
        const averageToggle = getElement('averageToggle');
        if (averageToggle) {
            averageToggle.checked = true;
            updateChartDatasets('daily');
        }
        
        updateNavigationButtons();
    });
    
    addEventListenerSafe(averageToggle, 'change', function() {
        updateChartDatasets(this.checked ? 'daily' : 'hourly');
    });

    averageToggle.checked = true;
    updateChartDatasets('daily');

    if (chart) {
        chart.options.plugins.zoom.zoom.onZoom = function() {
            updateVolumeChart();
            updatePieCharts();
            updateDailyOverviewHighlighting();
            updateNavigationButtons();
        };
        chart.options.plugins.zoom.pan.onPan = function() {
            updateVolumeChart();
            updatePieCharts();
            updateDailyOverviewHighlighting();
            updateNavigationButtons();
        };
    }

    updateNavigationButtons();

    // Calculate initial error statistics
    const { errors, stats } = calculateErrorStats();
    
    // Update initial display
    updateErrorStatsDisplay(stats);

    // Create and update histogram
    createErrorHistogram(errors);
}

// Function to update volume chart based on current zoom level
function updateVolumeChart() {
    if (!chart || !volumeChart) return;
    
    const xAxis = chart.scales.x;
    const startTime = xAxis.min;
    const endTime = xAxis.max;
    
    // Update each volume dataset to show relative volumes
    volumeChart.data.datasets = volumeDatasets.map(dataset => {
        const filteredData = dataset.data.filter(point => 
            point.x >= startTime && point.x <= endTime
        );
        
        if (filteredData.length === 0) return dataset;
        
        // Find the minimum value in the filtered range
        const minValue = Math.min(...filteredData.map(point => point.y));
        
        // Create new dataset with relative values
        return {
            ...dataset,
            data: filteredData.map(point => ({
                x: point.x,
                y: point.y - minValue
            }))
        };
    });
    
    volumeChart.update('none');
}

// Function to move the volume view by one day
function moveVolumeView(days) {
    if (!volumeChart) return;
    
    const xAxis = volumeChart.scales.x;
    const dayInMs = 24 * 60 * 60 * 1000;
    const range = xAxis.max - xAxis.min;
    const newMin = xAxis.min + (days * dayInMs);
    
    volumeChart.zoomScale('x', {
        min: newMin,
        max: newMin + range
    });
}

// Function to zoom volume chart to one day
function zoomVolumeToOneDay() {
    if (!volumeChart) return;
    
    const xAxis = volumeChart.scales.x;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    volumeChart.zoomScale('x', {
        min: xAxis.min,
        max: xAxis.min + dayInMs
    });
}

// Function to zoom out volume chart
function zoomVolumeOut() {
    if (!volumeChart) return;
    
    const xAxis = volumeChart.scales.x;
    const range = xAxis.max - xAxis.min;
    const center = xAxis.min + range / 2;
    
    volumeChart.zoomScale('x', {
        min: center - range,
        max: center + range
    });
}

// Function to update navigation button states
function updateNavigationButtons() {
    if (!chart) return;
    
    const xAxis = chart.scales.x;
    const dayInMs = 24 * 60 * 60 * 1000;
    const range = xAxis.max - xAxis.min;
    
    // Enable/disable navigation buttons based on zoom level
    const isZoomedToDay = Math.abs(range - dayInMs) < 1000; // Allow 1 second tolerance
    const prevDayBtn = getElement('prevDay');
    const nextDayBtn = getElement('nextDay');
    const zoomInBtn = getElement('zoomIn');
    
    if (prevDayBtn) prevDayBtn.disabled = !isZoomedToDay;
    if (nextDayBtn) nextDayBtn.disabled = !isZoomedToDay;
    if (zoomInBtn) zoomInBtn.disabled = isZoomedToDay;
}

// Start loading data when the page loads
document.addEventListener('DOMContentLoaded', loadAndProcessData); 