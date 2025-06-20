function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const toggleIcon = darkModeToggle.querySelector('.toggle-icon');
  
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    toggleIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    toggleIcon.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
  
  // Toggle dark mode
  darkModeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    toggleIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}


// Function to update the down payment numeric input and text when slider changes
function updateDownPayment() {
  const slider = document.getElementById('downPaymentSlider');
  const downPaymentPercent = slider.value;
  const housePriceInput = document.getElementById('housePrice');
  const housePrice = parseFloat(housePriceInput.value) || 0;

  document.getElementById('downPaymentValue').textContent = downPaymentPercent + '%';

  // This hidden input is not strictly necessary for the new UI but kept for logic consistency
  const downPaymentInput = document.getElementById('downPayment');
  if (housePrice > 0) {
    downPaymentInput.value = (downPaymentPercent / 100) * housePrice;
  }

  // Calculate and display down payment in CLP
  const ufValue = getUfValue();
  const downPaymentUF = parseFloat(downPaymentInput.value) || 0;
  const downPaymentCLP = downPaymentUF * ufValue;
  document.getElementById('downPaymentCLPValue').textContent = downPaymentUF > 0 ? `${formatCurrency(downPaymentCLP, 'CLP')} CLP` : '';

  calculateMortgage();
}

// Function to update the slider when the (now hidden) numeric input changes
function updateDownPaymentSlider() {
  const housePrice = parseFloat(document.getElementById('housePrice').value) || 0;
  const downPaymentValue = parseFloat(document.getElementById('downPayment').value) || 0;

  if (housePrice > 0 && downPaymentValue >= 0) {
    const percentage = Math.min(100, Math.max(0, (downPaymentValue / housePrice) * 100));
    document.getElementById('downPaymentSlider').value = percentage;
    document.getElementById('downPaymentValue').textContent = percentage.toFixed(0) + '%';
  }

  // Calculate and display down payment in CLP
  const ufValue = getUfValue();
  const downPaymentUF = downPaymentValue;
  const downPaymentCLP = downPaymentUF * ufValue;
  document.getElementById('downPaymentCLPValue').textContent = downPaymentUF > 0 ? `${formatCurrency(downPaymentCLP, 'CLP')} CLP` : '';

  calculateMortgage();
}

// Main calculation function
function calculateMortgage() {
  const housePrice = parseFloat(document.getElementById('housePrice').value);
  const downPaymentUF = parseFloat(document.getElementById('downPayment').value);
  const annualInterestRate = parseFloat(document.getElementById('interestRate').value);
  const termYears = parseInt(document.getElementById('termLength').value);
  const ufValue = getUfValue();

  // Calculate loan amount in UF
  // const downPaymentUF = (downPaymentPercent / 100) * housePrice;
  const loanAmountUF = housePrice - downPaymentUF;

  // Calculate monthly interest rate and total payments
  const monthlyInterestRate = (annualInterestRate / 100) / 12;
  const totalPayments = termYears * 12;

  // Validate inputs
  if (loanAmountUF <= 0 || monthlyInterestRate <= 0 || totalPayments <= 0) {
    clearResults();
    return;
  }

  // Calculate monthly payment in UF
  const monthlyPaymentUF = loanAmountUF * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalPayments)) / (Math.pow(1 + monthlyInterestRate, totalPayments) - 1);

  const monthlyPaymentCLP = monthlyPaymentUF * ufValue;

  const totalPaymentUF = monthlyPaymentUF * totalPayments;
  const totalInterestUF = totalPaymentUF - loanAmountUF;

  // Display results
  document.getElementById('monthlyPaymentUF').textContent = `UF ${monthlyPaymentUF.toFixed(2)}`;
  document.getElementById('monthlyPaymentCLP').textContent = formatCurrency(monthlyPaymentCLP, 'CLP');
  document.getElementById('loanAmount').textContent = `UF ${loanAmountUF.toFixed(2)}`;
  document.getElementById('totalInterest').textContent = `UF ${totalInterestUF.toFixed(2)}`;
  document.getElementById('totalPayment').textContent = `UF ${totalPaymentUF.toFixed(2)}`;

  generateAmortizationTable(loanAmountUF, monthlyPaymentUF, monthlyInterestRate, totalPayments, ufValue);
}

// Helper to get UF value from input
function getUfValue() {
  return parseFloat(document.getElementById('ufValue').value) || 37000;
}

// Function to clear all result fields
function clearResults() {
  document.getElementById('monthlyPaymentUF').textContent = '-';
  document.getElementById('monthlyPaymentCLP').textContent = '-';
  document.getElementById('loanAmount').textContent = '-';
  document.getElementById('totalInterest').textContent = '-';
  document.getElementById('totalPayment').textContent = '-';
  document.getElementById('amortizationBody').innerHTML = '';
}

let mortgageChart = null;

function updateMortgageChart(amortizationData, ufValue) {
  const ctx = document.getElementById('mortgageChart').getContext('2d');
  const labels = amortizationData.map(row => row.month);
  const principalPaid = amortizationData.map(row => row.principalPaid * ufValue);
  const interestPaid = amortizationData.map(row => row.interestPaid * ufValue);
  const balance = amortizationData.map(row => row.balance * ufValue);

  if (mortgageChart) {
    mortgageChart.destroy();
  }

  mortgageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Principal pagado',
          data: principalPaid,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Intereses pagados',
          data: interestPaid,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52,211,153,0.1)',
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Saldo restante',
          data: balance,
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30,58,138,0.1)',
          fill: false,
          tension: 0.1,
        }
      ]
    },
    options: {
      responsive: true,
      animation: false, // <--- Disable initial animation
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + context.parsed.y.toLocaleString('es-CL');
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString('es-CL');
            }
          },
          grid: {
            display: false // <--- Remove y-axis grid lines
          }
        },
        x: {
          maxTicksLimit: 10,
          ticks: {
            callback: function(val, idx) {
              // Show only every 12th label (yearly)
              return idx % 12 === 0 ? labels[idx] : '';
            }
          },
          grid: {
            display: false // <--- Remove x-axis grid lines
          }
        }
      }
    }
  });
}

// Generate amortization data for chart and table
function generateAmortizationTable(loanAmount, monthlyPayment, monthlyInterestRate, totalPayments, ufValue) {
  const tbody = document.getElementById('amortizationBody');
  tbody.innerHTML = '';

  let balance = loanAmount;
  let totalPrincipal = 0;
  let totalInterest = 0;
  const amortizationData = [];

  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = balance * monthlyInterestRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    if (balance < 0) balance = 0;

    totalPrincipal += principalPayment;
    totalInterest += interestPayment;

    // For chart: accumulate principal and interest paid
    amortizationData.push({
      month: `Mes ${i}`,
      principalPaid: totalPrincipal,
      interestPaid: totalInterest,
      balance: balance
    });

    // Table row
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${i}</td>
      <td>${monthlyPayment.toFixed(2)}</td>
      <td>${principalPayment.toFixed(2)}</td>
      <td>${interestPayment.toFixed(2)}</td>
      <td>${balance.toFixed(2)}</td>
      <td>${formatCurrency(monthlyPayment * ufValue, 'CLP')}</td>
    `;
  }

  updateMortgageChart(amortizationData, ufValue);
}

// Function to format numbers as CLP currency
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

// Fetch UF value from API and set as default
async function fetchAndSetUF() {
  try {
    const res = await fetch('https://api.santa.cl/uf');
    const data = await res.json();
    if (data.uf) {
      const ufInput = document.getElementById('ufValue');
      ufInput.value = Math.round(parseFloat(data.uf)); // Rounded value
      calculateMortgage();
    }
  } catch (e) {
    // If fetch fails, keep default value
  }
}

// Keys for localStorage
const STORAGE_KEYS = {
  housePrice: 'mortgage_housePrice',
  interestRate: 'mortgage_interestRate',
  termLength: 'mortgage_termLength',
  downPayment: 'mortgage_downPayment',
  downPaymentSlider: 'mortgage_downPaymentSlider',
};

// Save input values to localStorage
function saveInputsToStorage() {
  localStorage.setItem(STORAGE_KEYS.housePrice, document.getElementById('housePrice').value);
  localStorage.setItem(STORAGE_KEYS.interestRate, document.getElementById('interestRate').value);
  localStorage.setItem(STORAGE_KEYS.termLength, document.getElementById('termLength').value);
  localStorage.setItem(STORAGE_KEYS.downPayment, document.getElementById('downPayment').value);
}

// Load input values from localStorage (returns true if loaded)
function loadInputsFromStorage() {
  let loaded = false;
  if (localStorage.getItem(STORAGE_KEYS.housePrice)) {
    document.getElementById('housePrice').value = localStorage.getItem(STORAGE_KEYS.housePrice);
    loaded = true;
  }
  if (localStorage.getItem(STORAGE_KEYS.interestRate)) {
    document.getElementById('interestRate').value = localStorage.getItem(STORAGE_KEYS.interestRate);
    loaded = true;
  }
  if (localStorage.getItem(STORAGE_KEYS.termLength)) {
    document.getElementById('termLength').value = localStorage.getItem(STORAGE_KEYS.termLength);
    loaded = true;
  }
  if (localStorage.getItem(STORAGE_KEYS.downPayment)) {
    document.getElementById('downPayment').value = localStorage.getItem(STORAGE_KEYS.downPayment);
    loaded = true;
  }
  if (localStorage.getItem(STORAGE_KEYS.ufValue)) {
    document.getElementById('ufValue').value = localStorage.getItem(STORAGE_KEYS.ufValue);
    loaded = true;
  }
  return loaded;
}

// Attach listeners to save on change
function attachInputStorageListeners() {
  [
    'housePrice',
    'interestRate',
    'termLength',
    'downPayment',
    'downPaymentSlider',
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveInputsToStorage);
    }
  });

  document.getElementById('housePrice').addEventListener('input', function () {
      document.getElementById('downPayment').max = this.value || '';
  });
}

// Set default values and perform initial calculation on page load
window.onload = function () {
  // Load from storage or set defaults
  const loaded = loadInputsFromStorage();
  if (!loaded) {
    document.getElementById('housePrice').value = '5000';
    document.getElementById('downPayment').value = '1000';
    document.getElementById('interestRate').value = '4.5';
    document.getElementById('termLength').value = '30';
  }

  fetchAndSetUF(); // Fetch UF from API and update input
  updateDownPaymentSlider();
  initDarkMode();
  attachInputStorageListeners();

  // Tab logic for amortization section
  const tabTable = document.getElementById('tabTable');
  const tabChart = document.getElementById('tabChart');
  const tabPanelTable = document.getElementById('tabPanelTable');
  const tabPanelChart = document.getElementById('tabPanelChart');

  tabTable.addEventListener('click', function () {
    tabTable.classList.add('active');
    tabChart.classList.remove('active');
    tabPanelTable.style.display = '';
    tabPanelChart.style.display = 'none';
  });

  tabChart.addEventListener('click', function () {
    tabChart.classList.add('active');
    tabTable.classList.remove('active');
    tabPanelTable.style.display = 'none';
    tabPanelChart.style.display = '';
  });
};