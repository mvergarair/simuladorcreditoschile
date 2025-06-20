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
  calculateMortgage();
}

// Main calculation function
function calculateMortgage() {
  const housePrice = parseFloat(document.getElementById('housePrice').value);
  const downPaymentPercent = parseFloat(document.getElementById('downPaymentSlider').value);
  const annualInterestRate = parseFloat(document.getElementById('interestRate').value);
  const termYears = parseInt(document.getElementById('termLength').value);
  const ufValue = getUfValue();

  // Calculate loan amount in UF
  const downPaymentUF = (downPaymentPercent / 100) * housePrice;
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

// Function to generate the amortization table
function generateAmortizationTable(loanAmount, monthlyPayment, monthlyInterestRate, totalPayments, ufValue) {
  const tbody = document.getElementById('amortizationBody');
  tbody.innerHTML = '';

  let balance = loanAmount;

  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = balance * monthlyInterestRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    if (balance < 0) balance = 0;

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

// Set default values and perform initial calculation on page load
window.onload = function () {
  document.getElementById('housePrice').value = '5000';
  document.getElementById('interestRate').value = '4.5';
  document.getElementById('termLength').value = '30';

  fetchAndSetUF(); // Fetch UF from API and update input
  updateDownPayment(); // This will also trigger calculateMortgage()
  initDarkMode();
};