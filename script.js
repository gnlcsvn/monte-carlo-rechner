document.getElementById('simulationForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Fetch user input values
    let initialCapital = parseFloat(document.getElementById('initialCapital').value);
    let annualContribution = parseFloat(document.getElementById('annualContribution').value);
    let annualWithdrawal = parseFloat(document.getElementById('annualWithdrawal').value);
    let meanReturn = parseFloat(document.getElementById('meanReturn').value) / 100; // Convert to decimal
    let stdDevReturn = parseFloat(document.getElementById('stdDevReturn').value) / 100; // Convert to decimal
    let years = parseInt(document.getElementById('years').value);
    let iterations = parseInt(document.getElementById('iterations').value);

    // Run the simulation and get results
    let simulationResults = runSimulation(iterations, {
        initialCapital: initialCapital,
        annualContribution: annualContribution,
        annualWithdrawal: annualWithdrawal,
        meanReturn: meanReturn,
        stdDevReturn: stdDevReturn,
        years: years
    });

    // Calculate percentiles from simulation results
    let percentiles = calculatePercentiles(simulationResults.results);

    // Display calculated success rate and percentiles in the DOM
    document.getElementById('successRate').textContent = Math.round(simulationResults.successRate);
    document.getElementById('p10').textContent = formatNumberWithSeparator(Math.round(percentiles.p10));
    document.getElementById('p50').textContent = formatNumberWithSeparator(Math.round(percentiles.p50));
    document.getElementById('p90').textContent = formatNumberWithSeparator(Math.round(percentiles.p90));

    // Make results section visible
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('output-section').style.display = 'block';

    // Reset and recreate the chart canvas element for fresh rendering
    resetCanvas();

    // Display the chart with simulation results
    displayChart(simulationResults.results);

    // Construct the dynamic result sentence for user feedback
    let resultsSentence = `Wenn du dein <strong>Anfangsvermögen</strong> von <strong>${formatNumberWithSeparator(initialCapital)}€</strong> `;
    
    if (annualContribution > 0) {
        resultsSentence += `bei einer jährlichen <strong>Sparrate</strong> von <strong>${formatNumberWithSeparator(annualContribution)}€</strong> `;
    } else if (annualWithdrawal > 0) {
        resultsSentence += `bei einer jährlichen <strong>Entnahmerate</strong> von <strong>${formatNumberWithSeparator(annualWithdrawal)}€</strong> `;
    }

    resultsSentence += `mit einer erwarteten <strong>Rendite</strong> von <strong>${(meanReturn * 100).toFixed(2)}%</strong> und einer jährlichen <strong>Volatilität</strong> von <strong>${(stdDevReturn * 100).toFixed(2)}%</strong> über einen Zeitraum von <strong>${years} Jahren</strong> anlegst, hat dein Vermögen eine <strong>Erfolgsrate</strong> von <strong>${Math.round(simulationResults.successRate)}%</strong>, nicht auf 0 zu fallen.`;

    // Set the results sentence in the DOM
    document.getElementById('resultsSentence').innerHTML = resultsSentence;
});

/**
 * Resets and recreates the chart canvas element to prevent overlapping issues
 */
function resetCanvas() {
    const container = document.getElementById('results-section');
    const oldCanvas = document.getElementById('chart');

    // Remove the old canvas if it exists
    if (oldCanvas) {
        container.removeChild(oldCanvas);
    }

    // Create and configure a new canvas element
    const newCanvas = document.createElement('canvas');
    newCanvas.id = 'chart';

    // Set dimensions based on screen size for responsiveness
    if (window.innerWidth <= 768) {
        newCanvas.width = 400; // Mobile width
        newCanvas.height = 400; // Mobile height
    } else {
        newCanvas.width = 400; // Desktop width
        newCanvas.height = 200; // Desktop height
    }

    // Append the new canvas to the container
    container.appendChild(newCanvas);
}

/**
 * Generates normally distributed random numbers using the Box-Muller Transform.
 * This is used to simulate market fluctuations in returns.
 * 
 * @param {number} mean - The expected mean of the distribution
 * @param {number} stdDev - The standard deviation of the distribution
 * @returns {number} - A normally distributed random value
 */
function generateNormalRandom(mean, stdDev) {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
}

/**
 * Simulates a single iteration of portfolio growth over the specified years
 * 
 * @param {Object} params - The parameters for the simulation
 * @returns {number} - The final capital at the end of the period, or 0 if depleted
 */
function simulateIteration(params) {
    let capital = params.initialCapital;
    for (let i = 0; i < params.years; i++) {
        let annualReturn = generateNormalRandom(params.meanReturn, params.stdDevReturn);
        capital = (capital + params.annualContribution - params.annualWithdrawal) * (1 + annualReturn);
        if (capital <= 0) {
            return 0; 
        }
    }
    return capital;
}

/**
 * Runs the Monte Carlo simulation for a specified number of iterations
 * 
 * @param {number} iterations - The number of iterations (simulations) to run
 * @param {Object} params - The parameters for each iteration
 * @returns {Object} - An object containing the simulation results and success rate
 */
function runSimulation(iterations, params) {
    let results = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
        let endCapital = simulateIteration(params);
        results.push(endCapital);
        if (endCapital > 0) {
            successCount++;
        }
    }

    return {
        results: results,
        successRate: (successCount / iterations) * 100
    };
}

/**
 * Calculates the 10th, 50th, and 90th percentiles from the simulation results
 * 
 * @param {Array} results - The simulation results
 * @returns {Object} - An object containing the calculated percentiles
 */
function calculatePercentiles(results) {
    let sortedResults = results.slice().sort((a, b) => a - b);

    function getPercentile(p) {
        let index = Math.floor(p / 100 * sortedResults.length);
        return sortedResults[index];
    }

    return {
        p10: getPercentile(10),
        p50: getPercentile(50),
        p90: getPercentile(90)
    };
}

/**
 * Displays a bar chart representing the distribution of final capital values
 * 
 * @param {Array} results - The simulation results to display on the chart
 */
function displayChart(results) {
    let ctx = document.getElementById('chart').getContext('2d');

    let max = Math.max(...results);
    let min = Math.min(...results);

    let bucketSize = calculateBucketSize(min, max, 50);
    let numBuckets = Math.ceil((max - min) / bucketSize);
    let buckets = new Array(numBuckets).fill(0);

    results.forEach(value => {
        let bucketIndex = Math.floor((value - min) / bucketSize);
        if (bucketIndex >= numBuckets) bucketIndex = numBuckets - 1;
        buckets[bucketIndex]++;
    });

    let labels = [];
    let data = [];

    for (let i = 0; i < numBuckets; i++) {
        let bucketMin = (min + i * bucketSize).toFixed(0);
        labels.push(formatNumberWithSeparator(bucketMin));
        data.push(buckets[i]);
    }

    // If a previous chart exists, destroy it before creating a new one
    if (window.myChart) {
        window.myChart.destroy();
    }

    // Create the new chart
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Endvermögen',
                data: data,
                backgroundColor: '#4d6bdd',
                hoverBackgroundColor: '#6C83EE',
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Endvermögen (€)',
                        font: {
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
                        text: 'Anzahl der Simulationen',
                        font: {
                            weight: 'bold'
                        }
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumberWithSeparator(value);
                        },
                        stepSize: calculateStepSize(Math.min(...data), Math.max(...data)),
                    },
                    grid: {
                        drawBorder: false,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: '#e0e0e0'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            let index = tooltipItem.dataIndex;
                            let bucketMin = (min + index * bucketSize).toFixed(0);
                            let bucketMax = (min + (index + 1) * bucketSize).toFixed(0);
                            let count = data[index]; 

                            return `Range: ${formatNumberWithSeparator(bucketMin)} - ${formatNumberWithSeparator(bucketMax)} (€)\nOccurrences: ${formatNumberWithSeparator(count)}`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Calculates an appropriate bucket size for the histogram chart.
 * 
 * @param {number} min - The minimum value in the dataset
 * @param {number} max - The maximum value in the dataset
 * @param {number} numBuckets - The desired number of buckets (bars in the chart)
 * @returns {number} - The calculated bucket size
 */
function calculateBucketSize(min, max, numBuckets) {
    const range = max - min;
    let roughBucketSize = range / numBuckets;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughBucketSize)));
    return Math.ceil(roughBucketSize / magnitude) * magnitude;
}

/**
 * Formats numbers with thousands separators for better readability
 * 
 * @param {number} value - The number to format
 * @returns {string} - The formatted number with thousands separators
 */
function formatNumberWithSeparator(value) {
    let parts = value.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(".");
}

/**
 * Calculates an appropriate step size for the y-axis of the chart based on the data range.
 * 
 * @param {number} minValue - The minimum value in the dataset
 * @param {number} maxValue - The maximum value in the dataset
 * @returns {number} - The step size for the y-axis
 */
function calculateStepSize(minValue, maxValue) {
    const range = maxValue - minValue;
    if (range <= 10000) {
        return 1000;
    } else if (range <= 100000) {
        return 10000;
    } else if (range <= 1000000) {
        return 100000;
    } else {
        return 1000000;
    }
}
