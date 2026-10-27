/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file app.js
 * @description Frontend controller for Employee Management System.
 * Built with pure vanilla JavaScript (ES6+), utilizing the native fetch() API
 * to interact with the Django REST Framework endpoints.
 *
 * Features:
 * - Real-time dynamic currency conversion with live exchange rates
 * - Client-side search & department filtering
 * - Dual view: Modern Card Grid vs. Clean Data Table
 * - Multi-selection with Select All, uncheck individual items, and single-click Batch Delete
 * - CSV batch import with "Replace Existing Records" vs "Append / Merge" mode
 */

// =============================================================================
// 1. CONFIGURATION & EXCHANGE RATES
// =============================================================================

// Base endpoint for Django REST Framework EmployeeViewSet
const API_BASE_URL = 'http://127.0.0.1:8000/api/employees/';

// Multi-Currency Configuration (Defaults to PKR base)
const CURRENCY_CONFIG = {
  PKR: { code: 'PKR', symbol: '₨', label: 'PKR (₨)', prefix: '₨ ' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', prefix: '$' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', prefix: '€' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', prefix: '£' },
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', prefix: '₹ ' },
  AED: { code: 'AED', symbol: 'AED', label: 'AED (د.إ)', prefix: 'AED ' },
  SAR: { code: 'SAR', symbol: 'SAR', label: 'SAR (﷼)', prefix: 'SAR ' },
};

// Calibrated Exchange Rates from Base PKR
// Exact parity: 123,000 PKR = $443.95 USD = €397.46 EUR
const exchangeRates = {
  PKR: 1,
  USD: 443.95 / 123000,   // ~0.00360935 (1 USD = 277.06 PKR)
  EUR: 397.46 / 123000,   // ~0.00323138 (1 EUR = 309.46 PKR)
  GBP: 341.86 / 123000,   // ~0.00277935 (1 GBP = 359.80 PKR)
  INR: 37500 / 123000,    // ~0.304878   (1 INR = 3.28 PKR)
  AED: 1630.22 / 123000,  // ~0.0132538  (1 AED = 75.45 PKR)
  SAR: 1664.41 / 123000,  // ~0.0135318  (1 SAR = 73.90 PKR)
};

let activeCurrency = localStorage.getItem('ems_currency') || 'PKR';

// Application State
const state = {
  employees: [],           // Master list of employees fetched from DRF backend (salaries in base PKR)
  filteredEmployees: [],   // Filtered subset for client-side search & department filtering
  currentView: 'cards',    // 'cards' | 'table'
  isLoading: false,        // Tracks active network requests
  editingEmployeeId: null, // Holds ID when updating, or null when adding new
  pendingDeleteId: null,   // Holds single ID targeted for deletion confirmation
  bulkDeletePending: false,// True if deletion modal is executing bulk delete
  selectedIds: new Set(),  // Set of employee IDs currently selected by the user
  parsedCsvRows: [],       // Holds temporarily parsed CSV records awaiting import
  csvImportMode: 'replace',// 'replace' | 'append'
};

// =============================================================================
// 2. DOM ELEMENT REFERENCES
// =============================================================================

const DOM = {
  // Stats
  statTotal: document.getElementById('stat-total-employees'),
  statPayroll: document.getElementById('stat-total-payroll'),
  statDepts: document.getElementById('stat-departments-count'),
  statAvgSalary: document.getElementById('stat-avg-salary'),

  // Filters & Controls
  searchInput: document.getElementById('search-input'),
  departmentFilter: document.getElementById('department-filter'),
  currencySelect: document.getElementById('currency-select'),
  exchangeRateBadge: document.getElementById('exchange-rate-badge'),
  viewCardsBtn: document.getElementById('view-cards-btn'),
  viewTableBtn: document.getElementById('view-table-btn'),
  openAddModalBtn: document.getElementById('open-add-modal-btn'),
  openCsvModalBtn: document.getElementById('open-csv-modal-btn'),

  // Selection & Bulk Action Bar
  selectionBar: document.getElementById('selection-bar'),
  masterSelectAll: document.getElementById('master-select-all'),
  tableHeaderSelectAll: document.getElementById('table-header-select-all'),
  selectionCountLabel: document.getElementById('selection-count-label'),
  totalSelectableCount: document.getElementById('total-selectable-count'),
  selectAllFilteredBtn: document.getElementById('select-all-filtered-btn'),
  clearSelectionBtn: document.getElementById('clear-selection-btn'),
  bulkDeleteBtn: document.getElementById('bulk-delete-btn'),
  bulkDeleteCount: document.getElementById('bulk-delete-count'),

  // View Containers
  loadingSpinner: document.getElementById('loading-spinner'),
  cardsContainer: document.getElementById('cards-container'),
  tableWrapper: document.getElementById('table-wrapper'),
  tableBody: document.getElementById('table-body'),
  emptyState: document.getElementById('empty-state'),
  emptyActionBtn: document.getElementById('empty-action-btn'),
  emptyCsvBtn: document.getElementById('empty-csv-btn'),

  // Add / Edit Form Modal Elements
  employeeModal: document.getElementById('employee-modal'),
  employeeForm: document.getElementById('employee-form'),
  modalTitle: document.getElementById('modal-title'),
  employeeIdInput: document.getElementById('employee-id'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  saveEmployeeBtn: document.getElementById('save-employee-btn'),
  formSalaryCurrency: document.getElementById('form-salary-currency'),

  // CSV Upload Modal Elements
  csvUploadModal: document.getElementById('csv-upload-modal'),
  closeCsvModalBtn: document.getElementById('close-csv-modal-btn'),
  cancelCsvModalBtn: document.getElementById('cancel-csv-modal-btn'),
  csvFileInput: document.getElementById('csv-file-input'),
  csvDropzone: document.getElementById('csv-dropzone'),
  dropzoneMainText: document.getElementById('dropzone-main-text'),
  downloadTemplateBtn: document.getElementById('download-template-btn'),
  csvPreviewSection: document.getElementById('csv-preview-section'),
  csvCountBadge: document.getElementById('csv-count-badge'),
  csvPreviewTbody: document.getElementById('csv-preview-tbody'),
  importCsvBtn: document.getElementById('import-csv-btn'),
  importCsvBtnText: document.getElementById('import-csv-btn-text'),
  modeCardReplace: document.getElementById('mode-card-replace'),
  modeCardAppend: document.getElementById('mode-card-append'),

  // Delete Modal Elements
  deleteModal: document.getElementById('delete-modal'),
  deleteModalTitle: document.getElementById('delete-modal-title'),
  deleteConfirmText: document.getElementById('delete-confirm-text'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

  // Toast Container
  toastContainer: document.getElementById('toast-container'),
};

// =============================================================================
// 3. CURRENCY SYSTEM & REAL-TIME EXCHANGE RATES
// =============================================================================

function formatCurrency(amountInPkr, targetCurrency = activeCurrency) {
  const num = parseFloat(amountInPkr) || 0;
  const cfg = CURRENCY_CONFIG[targetCurrency] || CURRENCY_CONFIG.PKR;
  const rate = exchangeRates[targetCurrency] || 1;
  const converted = num * rate;

  const isFractional = targetCurrency !== 'PKR';
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isFractional ? 2 : 0,
    maximumFractionDigits: isFractional ? 2 : 0,
  }).format(converted);

  return `${cfg.prefix}${formattedNum}`;
}

function convertToPkr(amountInActiveCurrency, sourceCurrency = activeCurrency) {
  const num = parseFloat(amountInActiveCurrency) || 0;
  const rate = exchangeRates[sourceCurrency] || 1;
  if (rate === 0) return num;
  return num / rate;
}

function updateRateBadge() {
  if (!DOM.exchangeRateBadge) return;

  if (activeCurrency === 'PKR') {
    DOM.exchangeRateBadge.textContent = 'Base: PKR (₨)';
  } else {
    const rateFromPkr = exchangeRates[activeCurrency] || 1;
    const pkrPerUnit = 1 / rateFromPkr;
    const formattedPkr = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(pkrPerUnit);

    DOM.exchangeRateBadge.textContent = `1 ${activeCurrency} ≈ ₨ ${formattedPkr}`;
  }
}

function setCurrency(currencyCode, notify = true) {
  if (!CURRENCY_CONFIG[currencyCode]) {
    currencyCode = 'PKR';
  }

  activeCurrency = currencyCode;
  localStorage.setItem('ems_currency', currencyCode);

  if (DOM.currencySelect && DOM.currencySelect.value !== currencyCode) {
    DOM.currencySelect.value = currencyCode;
  }

  if (DOM.formSalaryCurrency) {
    DOM.formSalaryCurrency.textContent = `${currencyCode} ${CURRENCY_CONFIG[currencyCode].symbol}`;
  }

  updateRateBadge();
  renderEmployees();

  if (notify) {
    const samplePkr = 123000;
    const convertedSample = formatCurrency(samplePkr);
    showToast(`Currency: ${CURRENCY_CONFIG[currencyCode].label} (Rs 123,000 ≈ ${convertedSample})`, 'info');
  }
}

async function fetchLiveExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/PKR');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        if (data.rates.USD) exchangeRates.USD = data.rates.USD;
        if (data.rates.EUR) exchangeRates.EUR = data.rates.EUR;
        if (data.rates.GBP) exchangeRates.GBP = data.rates.GBP;
        if (data.rates.INR) exchangeRates.INR = data.rates.INR;
        if (data.rates.AED) exchangeRates.AED = data.rates.AED;
        if (data.rates.SAR) exchangeRates.SAR = data.rates.SAR;
        updateRateBadge();
        renderEmployees();
      }
    }
  } catch (err) {
    console.info('Operating with calibrated exchange rates.');
  }
}

function detectCurrencyFromCsv(content) {
  const lower = content.toLowerCase();
  if (lower.includes('pkr') || lower.includes('₨') || lower.includes('rs.') || lower.includes('rs ') || lower.includes('rupee')) {
    return 'PKR';
  }
  if (lower.includes('inr') || lower.includes('₹')) return 'INR';
  if (lower.includes('eur') || lower.includes('€')) return 'EUR';
  if (lower.includes('gbp') || lower.includes('£')) return 'GBP';
  if (lower.includes('aed') || lower.includes('dirham')) return 'AED';
  if (lower.includes('sar') || lower.includes('riyal')) return 'SAR';
  if (lower.includes('$') || lower.includes('usd')) return 'USD';
  return null;
}

// =============================================================================
// 4. API SERVICE LAYER (Django REST Framework CRUD & Bulk Operations)
// =============================================================================

async function fetchEmployees(silent = false) {
  if (!silent) setLoading(true);
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to load employee records.`);
    }

    const data = await response.json();
    state.employees = Array.isArray(data) ? data : (data.results || []);

    // Clean up selectedIds to eliminate any IDs no longer in the DB
    const existingIds = new Set(state.employees.map(e => e.id));
    state.selectedIds.forEach(id => {
      if (!existingIds.has(id)) {
        state.selectedIds.delete(id);
      }
    });

    applyFilters();
    if (!silent) {
      showToast('Employee records loaded successfully.', 'info');
    }
  } catch (error) {
    console.error('Fetch employees error:', error);
    showToast(`Error connecting to API: ${error.message}`, 'error');
  } finally {
    if (!silent) setLoading(false);
  }
}

async function createEmployee(employeeData) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(employeeData),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = formatDrfErrors(result);
      throw new Error(errorMsg || 'Failed to create employee record.');
    }

    showToast(`Employee "${result.first_name} ${result.last_name}" added successfully!`, 'success');
    closeEmployeeModal();
    await fetchEmployees(true);
  } catch (error) {
    console.error('Create error:', error);
    showToast(error.message, 'error');
  }
}

async function updateEmployee(id, employeeData) {
  try {
    const response = await fetch(`${API_BASE_URL}${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(employeeData),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = formatDrfErrors(result);
      throw new Error(errorMsg || 'Failed to update employee record.');
    }

    showToast(`Employee "${result.first_name} ${result.last_name}" updated successfully!`, 'success');
    closeEmployeeModal();
    await fetchEmployees(true);
  } catch (error) {
    console.error('Update error:', error);
    showToast(error.message, 'error');
  }
}

async function deleteEmployee(id) {
  try {
    const response = await fetch(`${API_BASE_URL}${id}/`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete employee (Status: ${response.status})`);
    }

    state.selectedIds.delete(id);
    showToast('Employee deleted successfully.', 'success');
    closeDeleteModal();
    await fetchEmployees(true);
  } catch (error) {
    console.error('Delete error:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Bulk delete multiple selected employees in a single batch request
 */
async function bulkDeleteEmployees(ids) {
  if (!ids || ids.length === 0) return;

  try {
    const response = await fetch(`${API_BASE_URL}bulk_delete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const deletedCount = result.deleted_count || ids.length;

    showToast(
      `Successfully deleted ${deletedCount} selected employee record${deletedCount > 1 ? 's' : ''}. Unchecked records remain safe!`,
      'success'
    );

    state.selectedIds.clear();
    closeDeleteModal();
    await fetchEmployees(true);
  } catch (error) {
    console.error('Bulk delete error:', error);
    showToast(`Error deleting records: ${error.message}`, 'error');
  }
}

// =============================================================================
// 5. MULTI-SELECTION & BATCH ACTIONS CONTROLLER
// =============================================================================

/**
 * Toggle selection for a single employee ID
 * Unchecking an employee removes it from selection while preserving all other checked items
 */
window.toggleSelectEmployee = function(id, isChecked) {
  if (isChecked) {
    state.selectedIds.add(id);
  } else {
    state.selectedIds.delete(id);
  }

  // Update DOM representation without full re-render
  const card = document.querySelector(`.employee-card[data-id="${id}"]`);
  if (card) {
    if (isChecked) card.classList.add('selected');
    else card.classList.remove('selected');
    const cb = card.querySelector('.card-select-checkbox');
    if (cb) cb.checked = isChecked;
  }

  const row = document.querySelector(`.table-row-item[data-id="${id}"]`);
  if (row) {
    if (isChecked) row.classList.add('selected');
    else row.classList.remove('selected');
    const cb = row.querySelector('.row-select-checkbox');
    if (cb) cb.checked = isChecked;
  }

  updateSelectionUI();
};

/**
 * Select or deselect all currently visible/filtered employees
 */
function toggleSelectAllFiltered(shouldSelectAll) {
  state.filteredEmployees.forEach(emp => {
    if (shouldSelectAll) {
      state.selectedIds.add(emp.id);
    } else {
      state.selectedIds.delete(emp.id);
    }
  });

  renderEmployees();
  updateSelectionUI();

  if (shouldSelectAll && state.filteredEmployees.length > 0) {
    showToast(`Selected all ${state.filteredEmployees.length} visible employee records.`, 'info');
  }
}

/**
 * Clear all active selections
 */
function clearAllSelections() {
  state.selectedIds.clear();
  renderEmployees();
  updateSelectionUI();
  showToast('All selections cleared.', 'info');
}

/**
 * Update selection bar, counters, badges, and indeterminate states
 */
function updateSelectionUI() {
  const selectedCount = state.selectedIds.size;
  const filteredCount = state.filteredEmployees.length;

  if (DOM.selectionCountLabel) {
    DOM.selectionCountLabel.textContent = `${selectedCount} Selected`;
  }

  if (DOM.bulkDeleteCount) {
    DOM.bulkDeleteCount.textContent = selectedCount.toString();
  }

  if (DOM.totalSelectableCount) {
    DOM.totalSelectableCount.textContent = filteredCount.toString();
  }

  if (DOM.bulkDeleteBtn) {
    DOM.bulkDeleteBtn.disabled = selectedCount === 0;
  }

  // Show selection bar whenever there are employees loaded
  if (DOM.selectionBar) {
    DOM.selectionBar.style.display = filteredCount > 0 ? 'flex' : 'none';
  }

  // Manage master select-all checkboxes (both toolbar and table header)
  const allFilteredSelected = filteredCount > 0 && state.filteredEmployees.every(e => state.selectedIds.has(e.id));
  const someFilteredSelected = state.filteredEmployees.some(e => state.selectedIds.has(e.id));

  [DOM.masterSelectAll, DOM.tableHeaderSelectAll].forEach(cb => {
    if (!cb) return;
    cb.checked = allFilteredSelected;
    cb.indeterminate = !allFilteredSelected && someFilteredSelected;
  });
}

// =============================================================================
// 6. CSV PARSING & BATCH IMPORT LOGIC (REPLACE VS. APPEND)
// =============================================================================

function parseCsvContent(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one employee row.');
  }

  const detectedCurrency = detectCurrencyFromCsv(text);
  if (detectedCurrency && detectedCurrency !== activeCurrency) {
    setCurrency(detectedCurrency, false);
    showToast(`Auto-detected currency from CSV: ${CURRENCY_CONFIG[detectedCurrency].label}`, 'info');
  }

  const headerLine = lines[0];
  const rawHeaders = parseCsvLine(headerLine);
  const headerMap = {};

  rawHeaders.forEach((h, index) => {
    const clean = h.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (clean === 'firstname' || clean === 'first') headerMap['first_name'] = index;
    else if (clean === 'lastname' || clean === 'last') headerMap['last_name'] = index;
    else if (clean === 'email' || clean === 'emailaddress') headerMap['email'] = index;
    else if (clean === 'phone' || clean === 'phonenumber' || clean === 'mobile') headerMap['phone'] = index;
    else if (clean === 'department' || clean === 'dept') headerMap['department'] = index;
    else if (clean === 'designation' || clean === 'role' || clean === 'jobtitle' || clean === 'title') headerMap['designation'] = index;
    else if (clean === 'salary' || clean === 'pay' || clean === 'compensation' || clean === 'amount') headerMap['salary'] = index;
  });

  if (headerMap['first_name'] === undefined || headerMap['email'] === undefined) {
    throw new Error('CSV must include "first_name" and "email" columns.');
  }

  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const getVal = (field, fallback = '') => {
      const idx = headerMap[field];
      return (idx !== undefined && values[idx] !== undefined) ? values[idx].trim() : fallback;
    };

    const first_name = getVal('first_name');
    const last_name = getVal('last_name', 'Employee');
    const email = getVal('email');
    const phone = getVal('phone', '+92 300 1234567');
    const department = getVal('department', 'General');
    const designation = getVal('designation', 'Staff');

    const rawSalary = getVal('salary', '100000');
    let numericSalary = parseFloat(rawSalary.replace(/[^0-9.]/g, '')) || 100000;

    const rowCurrency = detectCurrencyFromCsv(rawSalary) || detectedCurrency;
    if (rowCurrency && rowCurrency !== 'PKR') {
      numericSalary = convertToPkr(numericSalary, rowCurrency);
    }

    if (first_name && email) {
      records.push({
        first_name,
        last_name,
        email,
        phone,
        department,
        designation,
        salary: Number(numericSalary.toFixed(2)),
      });
    }
  }

  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function handleCsvFile(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please select a valid .csv spreadsheet file.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const records = parseCsvContent(content);

      if (records.length === 0) {
        showToast('No valid employee records found in CSV file.', 'error');
        return;
      }

      state.parsedCsvRows = records;

      DOM.dropzoneMainText.textContent = `Selected: ${file.name} (${records.length} records ready)`;
      DOM.csvCountBadge.textContent = `${records.length} records detected`;

      // Render Preview Table
      DOM.csvPreviewTbody.innerHTML = '';
      records.slice(0, 50).forEach((rec, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="color:var(--text-muted);">${idx + 1}</td>
          <td><strong>${escapeHtml(rec.first_name)} ${escapeHtml(rec.last_name)}</strong></td>
          <td>${escapeHtml(rec.email)}</td>
          <td><span class="dept-badge" style="font-size:0.7rem; padding:2px 8px;">${escapeHtml(rec.department)}</span></td>
          <td>${escapeHtml(rec.designation)}</td>
          <td><strong>${formatCurrency(rec.salary)}</strong></td>
        `;
        DOM.csvPreviewTbody.appendChild(tr);
      });

      DOM.csvPreviewSection.style.display = 'block';
      DOM.importCsvBtn.disabled = false;
      updateImportButtonText();
      showToast(`Parsed ${records.length} records. Ready to import.`, 'info');
    } catch (err) {
      console.error('CSV parse error:', err);
      showToast(err.message, 'error');
      DOM.importCsvBtn.disabled = true;
      DOM.csvPreviewSection.style.display = 'none';
    }
  };

  reader.onerror = () => {
    showToast('Failed to read the selected CSV file.', 'error');
  };

  reader.readAsText(file);
}

function updateImportButtonText() {
  const count = state.parsedCsvRows.length;
  const isReplace = state.csvImportMode === 'replace';
  if (DOM.importCsvBtnText) {
    DOM.importCsvBtnText.textContent = count > 0
      ? `Import ${count} Employees (${isReplace ? 'Replace All' : 'Append'})`
      : 'Import Employees';
  }
}

async function importParsedCsvEmployees() {
  const rows = state.parsedCsvRows;
  if (!rows || rows.length === 0) {
    showToast('No employee records to import.', 'error');
    return;
  }

  DOM.importCsvBtn.disabled = true;
  DOM.importCsvBtnText.textContent = 'Importing...';

  const isReplace = state.csvImportMode === 'replace';
  let successCount = 0;

  try {
    const bulkResponse = await fetch(`${API_BASE_URL}bulk_create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        mode: state.csvImportMode,
        replace: isReplace,
        employees: rows,
      }),
    });

    if (bulkResponse.ok) {
      const data = await bulkResponse.json();
      successCount = Array.isArray(data) ? data.length : (data.created_count || rows.length);
    } else {
      // Fallback
      for (const row of rows) {
        try {
          const res = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(row),
          });
          if (res.ok) successCount++;
        } catch {
          // ignore duplicate
        }
      }
    }

    state.selectedIds.clear();
    await fetchEmployees(true);

    if (isReplace) {
      showToast(
        `Successfully loaded ${successCount} records! Old data replaced cleanly (total records: ${successCount}).`,
        'success'
      );
    } else {
      showToast(
        `Successfully appended ${successCount} new employee record${successCount > 1 ? 's' : ''}!`,
        'success'
      );
    }

    closeCsvModal();
  } catch (err) {
    console.error('CSV import error:', err);
    showToast(`Error importing CSV: ${err.message}`, 'error');
  } finally {
    DOM.importCsvBtn.disabled = false;
    updateImportButtonText();
  }
}

function downloadSampleCsv() {
  const sampleContent =
`first_name,last_name,email,phone,department,designation,salary
Ali,Khan,ali.khan@company.com,+92 (300) 123-4567,Engineering,Senior Software Engineer,185000.00
Fatima,Zahra,fatima.zahra@company.com,+92 (321) 234-5678,Product,Lead Product Designer,160000.00
Bilal,Ahmed,bilal.ahmed@company.com,+92 (333) 345-6789,Marketing,Growth Marketing Lead,140000.00
Ayesha,Malik,ayesha.malik@company.com,+92 (345) 456-7890,Finance,Financial Analyst,150000.00
Hamza,Tariq,hamza.tariq@company.com,+92 (312) 567-8901,Human Resources,HR Business Partner,110000.00`;

  const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'employees_sample_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Downloaded sample CSV template.', 'info');
}

function openCsvModal() {
  state.parsedCsvRows = [];
  DOM.csvFileInput.value = '';
  DOM.dropzoneMainText.textContent = 'Click to browse or drag & drop a CSV file';
  DOM.csvPreviewSection.style.display = 'none';
  DOM.csvPreviewTbody.innerHTML = '';
  DOM.importCsvBtn.disabled = true;

  // Default to Replace mode
  state.csvImportMode = 'replace';
  if (DOM.modeCardReplace) DOM.modeCardReplace.classList.add('active');
  if (DOM.modeCardAppend) DOM.modeCardAppend.classList.remove('active');
  const replaceRadio = document.querySelector('input[name="csv-import-mode"][value="replace"]');
  if (replaceRadio) replaceRadio.checked = true;

  updateImportButtonText();
  DOM.csvUploadModal.classList.add('active');
}

function closeCsvModal() {
  DOM.csvUploadModal.classList.remove('active');
  state.parsedCsvRows = [];
  DOM.csvFileInput.value = '';
}

// =============================================================================
// 7. RENDERING & STATS
// =============================================================================

function setLoading(loading) {
  state.isLoading = loading;
  if (loading) {
    DOM.loadingSpinner.style.display = 'flex';
    DOM.cardsContainer.style.display = 'none';
    DOM.tableWrapper.style.display = 'none';
    DOM.emptyState.style.display = 'none';
  } else {
    DOM.loadingSpinner.style.display = 'none';
  }
}

function getInitials(firstName, lastName) {
  const f = (firstName || '').charAt(0).toUpperCase();
  const l = (lastName || '').charAt(0).toUpperCase();
  return `${f}${l}` || 'EM';
}

function updateStats() {
  const count = state.employees.length;
  DOM.statTotal.textContent = count.toString();

  if (count === 0) {
    DOM.statPayroll.textContent = formatCurrency(0);
    DOM.statDepts.textContent = '0';
    DOM.statAvgSalary.textContent = formatCurrency(0);
    return;
  }

  const totalSalaryPkr = state.employees.reduce((acc, curr) => acc + (parseFloat(curr.salary) || 0), 0);
  const avgSalaryPkr = totalSalaryPkr / count;
  const uniqueDepts = new Set(state.employees.map(e => (e.department || '').trim()).filter(Boolean));

  DOM.statPayroll.textContent = formatCurrency(totalSalaryPkr);
  DOM.statDepts.textContent = uniqueDepts.size.toString();
  DOM.statAvgSalary.textContent = formatCurrency(avgSalaryPkr);

  populateDepartmentFilter(Array.from(uniqueDepts));
}

function populateDepartmentFilter(departments) {
  const currentVal = DOM.departmentFilter.value;
  DOM.departmentFilter.innerHTML = '<option value="ALL">All Departments</option>';

  departments.sort().forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    DOM.departmentFilter.appendChild(opt);
  });

  if (departments.includes(currentVal)) {
    DOM.departmentFilter.value = currentVal;
  }
}

function renderEmployees() {
  updateStats();
  updateSelectionUI();

  if (state.isLoading) return;

  const list = state.filteredEmployees;

  if (list.length === 0) {
    DOM.cardsContainer.style.display = 'none';
    DOM.tableWrapper.style.display = 'none';
    DOM.emptyState.style.display = 'block';

    if (state.employees.length > 0) {
      document.getElementById('empty-title').textContent = 'No matching employees found';
      document.getElementById('empty-description').textContent = 'Try adjusting your search query or department filter.';
    } else {
      document.getElementById('empty-title').textContent = 'No employees in the database';
      document.getElementById('empty-description').textContent = 'Get started by adding an employee manually or uploading a CSV spreadsheet.';
    }
    return;
  }

  DOM.emptyState.style.display = 'none';

  if (state.currentView === 'cards') {
    DOM.tableWrapper.style.display = 'none';
    DOM.cardsContainer.style.display = 'grid';
    renderCards(list);
  } else {
    DOM.cardsContainer.style.display = 'none';
    DOM.tableWrapper.style.display = 'block';
    renderTable(list);
  }
}

function renderCards(employees) {
  DOM.cardsContainer.innerHTML = '';

  employees.forEach(emp => {
    const isSelected = state.selectedIds.has(emp.id);
    const card = document.createElement('article');
    card.className = `employee-card ${isSelected ? 'selected' : ''}`;
    card.setAttribute('data-id', emp.id);

    const initials = getInitials(emp.first_name, emp.last_name);
    const salaryFormatted = formatCurrency(emp.salary);
    const joinedDate = emp.date_joined || 'Recent';

    card.innerHTML = `
      <!-- Card Select Checkbox -->
      <div class="card-select-wrap" title="Select to delete or batch action" onclick="event.stopPropagation();">
        <input
          type="checkbox"
          class="card-select-checkbox"
          data-id="${emp.id}"
          ${isSelected ? 'checked' : ''}
          aria-label="Select ${escapeHtml(emp.first_name)}"
          onchange="toggleSelectEmployee(${emp.id}, this.checked)"
        />
      </div>

      <div class="card-top">
        <div class="avatar-badge" aria-hidden="true">${escapeHtml(initials)}</div>
        <div class="card-title-group">
          <h3 class="employee-name">${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</h3>
          <p class="employee-designation">${escapeHtml(emp.designation)}</p>
          <span class="dept-badge">${escapeHtml(emp.department)}</span>
        </div>
      </div>

      <div class="card-details">
        <div class="detail-row">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span title="${escapeHtml(emp.email)}">${escapeHtml(emp.email)}</span>
        </div>
        <div class="detail-row">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <span>${escapeHtml(emp.phone)}</span>
        </div>
        <div class="salary-joined-row">
          <span class="salary-tag">${salaryFormatted} <small style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">/yr</small></span>
          <span class="joined-tag">Joined: ${escapeHtml(joinedDate)}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="action-btn edit-btn" onclick="openEditEmployeeModal(${emp.id})">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </button>
        <button class="action-btn delete-btn" onclick="openDeleteConfirmModal(${emp.id}, '${escapeQuote(emp.first_name)} ${escapeQuote(emp.last_name)}')">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </button>
      </div>
    `;

    DOM.cardsContainer.appendChild(card);
  });
}

function renderTable(employees) {
  DOM.tableBody.innerHTML = '';

  employees.forEach(emp => {
    const isSelected = state.selectedIds.has(emp.id);
    const row = document.createElement('tr');
    row.className = `table-row-item ${isSelected ? 'selected' : ''}`;
    row.setAttribute('data-id', emp.id);

    const initials = getInitials(emp.first_name, emp.last_name);
    const salaryFormatted = formatCurrency(emp.salary);
    const joinedDate = emp.date_joined || 'Recent';

    row.innerHTML = `
      <td class="table-checkbox-cell">
        <input
          type="checkbox"
          class="row-select-checkbox"
          data-id="${emp.id}"
          ${isSelected ? 'checked' : ''}
          aria-label="Select row"
          onchange="toggleSelectEmployee(${emp.id}, this.checked)"
        />
      </td>
      <td>
        <div class="table-user-cell">
          <div class="table-avatar">${escapeHtml(initials)}</div>
          <div class="table-user-info">
            <strong>${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</strong>
            <span>${escapeHtml(emp.email)}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="dept-badge">${escapeHtml(emp.department)}</span>
      </td>
      <td>
        <span style="font-weight: 500;">${escapeHtml(emp.designation)}</span>
      </td>
      <td>
        <span style="color: var(--text-muted); font-size: 0.825rem;">${escapeHtml(emp.phone)}</span>
      </td>
      <td>
        <strong style="color: var(--text-main);">${salaryFormatted}</strong>
      </td>
      <td>
        <span style="color: var(--text-muted); font-size: 0.8rem;">${escapeHtml(joinedDate)}</span>
      </td>
      <td>
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="action-btn edit-btn" onclick="openEditEmployeeModal(${emp.id})">
            Edit
          </button>
          <button class="action-btn delete-btn" onclick="openDeleteConfirmModal(${emp.id}, '${escapeQuote(emp.first_name)} ${escapeQuote(emp.last_name)}')">
            Delete
          </button>
        </div>
      </td>
    `;

    DOM.tableBody.appendChild(row);
  });
}

// =============================================================================
// 8. CLIENT-SIDE SEARCH & FILTERING
// =============================================================================

function applyFilters() {
  const query = (DOM.searchInput.value || '').trim().toLowerCase();
  const selectedDept = DOM.departmentFilter.value;

  state.filteredEmployees = state.employees.filter(emp => {
    const matchesDept = (selectedDept === 'ALL') || (emp.department === selectedDept);
    if (!matchesDept) return false;
    if (!query) return true;

    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const role = (emp.designation || '').toLowerCase();
    const phone = (emp.phone || '').toLowerCase();

    return fullName.includes(query) ||
           email.includes(query) ||
           dept.includes(query) ||
           role.includes(query) ||
           phone.includes(query);
  });

  renderEmployees();
}

// =============================================================================
// 9. MODAL HANDLERS (ADD / EDIT / DELETE)
// =============================================================================

function openAddEmployeeModal() {
  state.editingEmployeeId = null;
  DOM.employeeForm.reset();
  DOM.employeeIdInput.value = '';
  DOM.modalTitle.textContent = 'Add New Employee';
  DOM.saveEmployeeBtn.querySelector('span').textContent = 'Save Employee';
  if (DOM.formSalaryCurrency) {
    DOM.formSalaryCurrency.textContent = `${activeCurrency} ${CURRENCY_CONFIG[activeCurrency].symbol}`;
  }
  document.getElementById('salary').placeholder = activeCurrency === 'PKR' ? 'e.g. 150000' : 'e.g. 540.00';
  DOM.employeeModal.classList.add('active');
  document.getElementById('first_name').focus();
}

window.openEditEmployeeModal = function(id) {
  const emp = state.employees.find(e => e.id === id);
  if (!emp) {
    showToast('Employee not found.', 'error');
    return;
  }

  state.editingEmployeeId = id;
  DOM.employeeIdInput.value = emp.id;
  document.getElementById('first_name').value = emp.first_name || '';
  document.getElementById('last_name').value = emp.last_name || '';
  document.getElementById('email').value = emp.email || '';
  document.getElementById('phone').value = emp.phone || '';
  document.getElementById('department').value = emp.department || '';
  document.getElementById('designation').value = emp.designation || '';

  const pkrNum = parseFloat(emp.salary) || 0;
  const rate = exchangeRates[activeCurrency] || 1;
  const convertedInputSalary = activeCurrency === 'PKR' ? Math.round(pkrNum) : (pkrNum * rate).toFixed(2);
  document.getElementById('salary').value = convertedInputSalary;

  DOM.modalTitle.textContent = `Edit Employee: ${emp.first_name} ${emp.last_name}`;
  DOM.saveEmployeeBtn.querySelector('span').textContent = 'Update Employee';
  if (DOM.formSalaryCurrency) {
    DOM.formSalaryCurrency.textContent = `${activeCurrency} ${CURRENCY_CONFIG[activeCurrency].symbol}`;
  }
  DOM.employeeModal.classList.add('active');
  document.getElementById('first_name').focus();
};

function closeEmployeeModal() {
  DOM.employeeModal.classList.remove('active');
  DOM.employeeForm.reset();
  state.editingEmployeeId = null;
}

DOM.employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const enteredSalary = parseFloat(document.getElementById('salary').value) || 0;
  const pkrSalary = convertToPkr(enteredSalary, activeCurrency);

  const formData = {
    first_name: document.getElementById('first_name').value.trim(),
    last_name: document.getElementById('last_name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    department: document.getElementById('department').value.trim(),
    designation: document.getElementById('designation').value.trim(),
    salary: Number(pkrSalary.toFixed(2)),
  };

  if (!formData.first_name || !formData.last_name || !formData.email) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (state.editingEmployeeId) {
    await updateEmployee(state.editingEmployeeId, formData);
  } else {
    await createEmployee(formData);
  }
});

// Single employee delete confirmation
window.openDeleteConfirmModal = function(id, name) {
  state.bulkDeletePending = false;
  state.pendingDeleteId = id;
  if (DOM.deleteModalTitle) DOM.deleteModalTitle.textContent = 'Delete Employee';
  DOM.deleteConfirmText.textContent = `Are you sure you want to delete "${name}"? This action removes the record from the database.`;
  DOM.confirmDeleteBtn.textContent = 'Yes, Delete';
  DOM.deleteModal.classList.add('active');
};

// Bulk delete confirmation
function openBulkDeleteConfirmModal() {
  const count = state.selectedIds.size;
  if (count === 0) {
    showToast('Please select at least one employee to delete.', 'info');
    return;
  }

  state.bulkDeletePending = true;
  state.pendingDeleteId = null;
  if (DOM.deleteModalTitle) DOM.deleteModalTitle.textContent = 'Delete Selected Employees';
  DOM.deleteConfirmText.innerHTML = `Are you sure you want to delete <strong>${count}</strong> selected employee record${count > 1 ? 's' : ''}?<br><br>Unchecked records will remain completely safe in the database.`;
  DOM.confirmDeleteBtn.textContent = `Yes, Delete (${count})`;
  DOM.deleteModal.classList.add('active');
}

function closeDeleteModal() {
  DOM.deleteModal.classList.remove('active');
  state.pendingDeleteId = null;
  state.bulkDeletePending = false;
}

DOM.confirmDeleteBtn.addEventListener('click', async () => {
  if (state.bulkDeletePending) {
    await bulkDeleteEmployees(Array.from(state.selectedIds));
  } else if (state.pendingDeleteId) {
    await deleteEmployee(state.pendingDeleteId);
  }
});

DOM.cancelDeleteBtn.addEventListener('click', closeDeleteModal);

// =============================================================================
// 10. TOAST NOTIFICATIONS & HELPERS
// =============================================================================

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    `;
  } else if (type === 'error') {
    iconSvg = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    `;
  } else {
    iconSvg = `
      <svg fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    `;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function formatDrfErrors(errors) {
  if (typeof errors === 'string') return errors;
  if (errors.detail) return errors.detail;

  const messages = [];
  for (const [field, errList] of Object.entries(errors)) {
    const text = Array.isArray(errList) ? errList.join(' ') : String(errList);
    messages.push(`${field}: ${text}`);
  }
  return messages.join('\n');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeQuote(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}

// =============================================================================
// 11. EVENT LISTENERS INITIALIZATION
// =============================================================================

function initEventListeners() {
  if (DOM.currencySelect) {
    DOM.currencySelect.value = activeCurrency;
    DOM.currencySelect.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  }

  if (DOM.formSalaryCurrency) {
    DOM.formSalaryCurrency.textContent = `${activeCurrency} ${CURRENCY_CONFIG[activeCurrency].symbol}`;
  }

  updateRateBadge();

  // Selection Bar Listeners
  if (DOM.masterSelectAll) {
    DOM.masterSelectAll.addEventListener('change', (e) => {
      toggleSelectAllFiltered(e.target.checked);
    });
  }

  if (DOM.tableHeaderSelectAll) {
    DOM.tableHeaderSelectAll.addEventListener('change', (e) => {
      toggleSelectAllFiltered(e.target.checked);
    });
  }

  if (DOM.selectAllFilteredBtn) {
    DOM.selectAllFilteredBtn.addEventListener('click', () => {
      toggleSelectAllFiltered(true);
    });
  }

  if (DOM.clearSelectionBtn) {
    DOM.clearSelectionBtn.addEventListener('click', () => {
      clearAllSelections();
    });
  }

  if (DOM.bulkDeleteBtn) {
    DOM.bulkDeleteBtn.addEventListener('click', () => {
      openBulkDeleteConfirmModal();
    });
  }

  // CSV Import Mode radio toggles
  document.querySelectorAll('input[name="csv-import-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.csvImportMode = e.target.value;
      if (DOM.modeCardReplace) {
        DOM.modeCardReplace.classList.toggle('active', state.csvImportMode === 'replace');
      }
      if (DOM.modeCardAppend) {
        DOM.modeCardAppend.classList.toggle('active', state.csvImportMode === 'append');
      }
      updateImportButtonText();
    });
  });

  // Modals
  DOM.openAddModalBtn.addEventListener('click', openAddEmployeeModal);
  DOM.emptyActionBtn.addEventListener('click', openAddEmployeeModal);
  DOM.closeModalBtn.addEventListener('click', closeEmployeeModal);
  DOM.cancelModalBtn.addEventListener('click', closeEmployeeModal);

  DOM.openCsvModalBtn.addEventListener('click', openCsvModal);
  if (DOM.emptyCsvBtn) {
    DOM.emptyCsvBtn.addEventListener('click', openCsvModal);
  }
  DOM.closeCsvModalBtn.addEventListener('click', closeCsvModal);
  DOM.cancelCsvModalBtn.addEventListener('click', closeCsvModal);
  DOM.downloadTemplateBtn.addEventListener('click', downloadSampleCsv);
  DOM.importCsvBtn.addEventListener('click', importParsedCsvEmployees);

  DOM.csvDropzone.addEventListener('click', () => {
    DOM.csvFileInput.click();
  });

  DOM.csvFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleCsvFile(e.target.files[0]);
    }
  });

  DOM.csvDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.csvDropzone.classList.add('dragover');
  });

  DOM.csvDropzone.addEventListener('dragleave', () => {
    DOM.csvDropzone.classList.remove('dragover');
  });

  DOM.csvDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.csvDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCsvFile(e.dataTransfer.files[0]);
    }
  });

  DOM.employeeModal.addEventListener('click', (e) => {
    if (e.target === DOM.employeeModal) closeEmployeeModal();
  });
  DOM.deleteModal.addEventListener('click', (e) => {
    if (e.target === DOM.deleteModal) closeDeleteModal();
  });
  DOM.csvUploadModal.addEventListener('click', (e) => {
    if (e.target === DOM.csvUploadModal) closeCsvModal();
  });

  DOM.searchInput.addEventListener('input', applyFilters);
  DOM.departmentFilter.addEventListener('change', applyFilters);

  DOM.viewCardsBtn.addEventListener('click', () => {
    state.currentView = 'cards';
    DOM.viewCardsBtn.classList.add('active');
    DOM.viewTableBtn.classList.remove('active');
    renderEmployees();
  });

  DOM.viewTableBtn.addEventListener('click', () => {
    state.currentView = 'table';
    DOM.viewTableBtn.classList.add('active');
    DOM.viewCardsBtn.classList.remove('active');
    renderEmployees();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEmployeeModal();
      closeDeleteModal();
      closeCsvModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchEmployees();
  fetchLiveExchangeRates();
});
