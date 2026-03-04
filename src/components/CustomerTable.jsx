import React, { useState } from 'react';
import { Edit, Trash, Award, ChevronLeft, ChevronRight, FileText, Download, ChevronsLeft, ChevronsRight, History } from 'lucide-react';
import Papa from 'papaparse';
import ClaimHistoryDialog from './ClaimHistoryDialog';

const pageSizeOptions = [10, 25, 50, 100, 500, 1000];

export default function CustomerTable({
  filtered,
  fetchAllFilteredRows,
  fetchFilteredRowsPage,
  loading,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalPages,
  handleEditCustomer,
  handleClaimClick,
  handleDeleteClick,
  totalFilteredCount,
  eligibleCustomersCount,
  totalStatistics = { totalPoints: 0, totalClaimed: 0, totalUnclaimed: 0 },
  isEligibleForClaims,
  getMaxClaimablePoints
}) {
  const [printStyle, setPrintStyle] = useState('table');
  const [preparingAction, setPreparingAction] = useState(null);

  // State for claim history dialog
  const [claimHistoryDialog, setClaimHistoryDialog] = useState({
    isOpen: false,
    customer: null
  });

  // Function to open claim history dialog
  const handleClaimHistoryClick = (customer) => {
    setClaimHistoryDialog({
      isOpen: true,
      customer: customer
    });
  };

  // Function to close claim history dialog
  const closeClaimHistoryDialog = () => {
    setClaimHistoryDialog({
      isOpen: false,
      customer: null
    });
  };

  // Use full filtered dataset for printing.
  const getRowsForPrintReport = async () => {
    if (!fetchAllFilteredRows || filtered.length >= totalFilteredCount) {
      return filtered;
    }
    return fetchAllFilteredRows();
  };

  // CSV export should match what is currently visible in the table page.
  const exportToCSV = () => {
    setPreparingAction('csv');
    try {
      const csvData = filtered.map(customer => ({
        'Customer Code': customer.code,
        'Customer Name': customer.name,
        'House Name': customer.houseName,
        'Street': customer.street,
        'Place': customer.place,
        'PIN Code': customer.pinCode,
        'Mobile': customer.mobile,
        'Last Sales Date': customer.lastSalesDate,
        'Total Points': customer.total,
        'Claimed Points': customer.claimed,
        'Unclaimed Points': customer.unclaimed,
        'Max Claimable (Multiple of 5)': getMaxClaimablePoints ? getMaxClaimablePoints(customer.unclaimed) : Math.floor(customer.unclaimed / 5) * 5,
        'Last Updated': customer.lastUpdated
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customer_loyalty_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setPreparingAction(null);
    }
  };

  // Function to print the customer list
  const printCustomerList = async () => {
    setPreparingAction('print');
    const initialReportRows = filtered;
    const canFetchPaged = typeof fetchFilteredRowsPage === 'function';
    const initialPage = currentPage;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPreparingAction(null);
      return;
    }

    const serializedReportRows = JSON.stringify(initialReportRows).replace(/</g, '\\u003c');
    const pageSizeOptionsMarkup = pageSizeOptions
      .map((size) => `<option value="${size}" ${size === itemsPerPage ? 'selected' : ''}>${size}</option>`)
      .join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Loyalty Program - Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin-bottom: 20px; }
            .rules { background: #f0f8ff; padding: 10px; margin-bottom: 20px; border-left: 4px solid #007bff; }
            .stacked-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
            .customer-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 10px;
              page-break-inside: avoid;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .customer-title { font-size: 14px; font-weight: 700; margin-bottom: 2px; color: #1f2937; line-height: 1.2; }
            .stack-line { font-size: 12px; color: #111827; line-height: 1.25; margin: 0; }
            .toggle-btn { padding: 8px 14px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; font-size: 13px; cursor: pointer; }
            .toggle-btn.active { background: #dbeafe; color: #1d4ed8; border-color: #93c5fd; font-weight: 600; }
            .pager-btn { padding: 8px 12px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px; font-size: 13px; cursor: pointer; }
            .pager-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .pager-select { padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; background: #fff; }
            .pagination-wrap { display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
            @media print {
              .no-print, .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
            }
            @media (max-width: 1100px) {
              .stacked-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (max-width: 700px) {
              .stacked-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Customer Loyalty Program Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="rules">
            <h3>Updated Claiming Rules:</h3>
            <p>• Claims must be in multiples of 5 points</p>
            <p>• Minimum eligibility: 5 points (50 grams of gold)</p>
            <p>• Points Formula: 1 point per 10 grams of gold weight</p>
          </div>
          
          <div class="summary">
            <p><strong>Total Customers:</strong> ${totalFilteredCount}</p>
            <p><strong>Eligible for Claims (≥5 points):</strong> ${eligibleCustomersCount}</p>
            <p><strong>Total Points Issued:</strong> ${totalStatistics.totalPoints}</p>
            <p><strong>Total Points Claimed:</strong> ${totalStatistics.totalClaimed}</p>
            <p><strong>Total Points Available:</strong> ${totalStatistics.totalUnclaimed}</p>
          </div>
          
          <div id="print-controls" class="no-print" style="margin-bottom: 20px; display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="btn-table" class="toggle-btn ${printStyle === 'table' ? 'active' : ''}" onclick="setReportStyle('table')">Table</button>
            <button id="btn-stacked" class="toggle-btn ${printStyle === 'stacked' ? 'active' : ''}" onclick="setReportStyle('stacked')">Stacked</button>
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Report</button>
          </div>

          <div class="pagination-wrap no-print">
            <span style="font-size: 13px; color: #4b5563;">Show</span>
            <select id="page-size-select" class="pager-select" onchange="changePageSize()">
              ${pageSizeOptionsMarkup}
            </select>
            <span style="font-size: 13px; color: #4b5563;">per page</span>
            <button id="first-page-btn" class="pager-btn" onclick="goToFirstPage()">First</button>
            <button id="prev-page-btn" class="pager-btn" onclick="goToPrevPage()">Prev</button>
            <span id="page-info" style="font-size: 13px; color: #111827;"></span>
            <button id="next-page-btn" class="pager-btn" onclick="goToNextPage()">Next</button>
            <button id="last-page-btn" class="pager-btn" onclick="goToLastPage()">Last</button>
          </div>

          <div id="load-status" class="no-print" style="margin-bottom: 12px; text-align: center; font-size: 13px; color: #475569;"></div>
          
          <div id="table-report" style="display:${printStyle === 'table' ? 'block' : 'none'};">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer Name</th>
                  <th>Place</th>
                  <th>Mobile</th>
                  <th>Total Points</th>
                  <th>Claimed</th>
                  <th>Unclaimed</th>
                  <th>Max Claimable</th>
                  <th>Last Sales Date</th>
                </tr>
              </thead>
              <tbody id="table-report-body"></tbody>
            </table>
          </div>
          <div id="stacked-report" class="stacked-grid" style="display:${printStyle === 'stacked' ? 'grid' : 'none'};"></div>
          
          <div style="margin-top: 20px; font-size: 10px; color: #666;">
            <p>Points Formula: 1 point per 10 grams of gold weight</p>
            <p>Claims must be in multiples of 5 points | Minimum eligibility: 5 points</p>
            <p>Report generated from Customer Loyalty Management System</p>
          </div>
          <script>
            var printControls = document.getElementById('print-controls');
            var initialRows = ${serializedReportRows};
            var totalRows = ${totalFilteredCount};
            var reportStyle = '${printStyle}';
            var loadError = '';
            var loadingPage = false;
            var currentPage = ${initialPage};
            var pageSizeSelect = document.getElementById('page-size-select');
            var pageSize = Number(pageSizeSelect.value) || ${itemsPerPage};
            var pageCache = {};
            pageCache[currentPage] = initialRows;
            var tableReportBody = document.getElementById('table-report-body');
            var stackedReport = document.getElementById('stacked-report');
            var loadStatus = document.getElementById('load-status');
            var pageInfo = document.getElementById('page-info');
            var firstPageBtn = document.getElementById('first-page-btn');
            var prevPageBtn = document.getElementById('prev-page-btn');
            var nextPageBtn = document.getElementById('next-page-btn');
            var lastPageBtn = document.getElementById('last-page-btn');

            function clean(value) {
              if (value === null || value === undefined) return '';
              return String(value).trim();
            }

            function escapeHtml(value) {
              return clean(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }

            function getMaxClaimable(unclaimedPoints) {
              var points = Number(unclaimedPoints) || 0;
              return Math.floor(points / 5) * 5;
            }

            function getTotalPages() {
              return Math.max(1, Math.ceil(totalRows / pageSize));
            }

            function getPagedRows() {
              return pageCache[currentPage] || [];
            }

            function renderTableRows(rows) {
              if (!rows.length) {
                return '<tr><td colspan="9" style="text-align:center; padding: 20px;">No customers found.</td></tr>';
              }

              return rows.map(function(customer) {
                return ''
                  + '<tr>'
                  + '<td>' + escapeHtml(customer.code) + '</td>'
                  + '<td>' + escapeHtml(customer.name) + '</td>'
                  + '<td>' + escapeHtml(customer.place) + '</td>'
                  + '<td>' + escapeHtml(customer.mobile) + '</td>'
                  + '<td>' + (Number(customer.total) || 0) + '</td>'
                  + '<td>' + (Number(customer.claimed) || 0) + '</td>'
                  + '<td>' + (Number(customer.unclaimed) || 0) + '</td>'
                  + '<td>' + getMaxClaimable(customer.unclaimed) + '</td>'
                  + '<td>' + escapeHtml(customer.lastSalesDate) + '</td>'
                  + '</tr>';
              }).join('');
            }

            function renderStackedRows(rows) {
              if (!rows.length) {
                return '<div style="font-size: 13px; color: #4b5563;">No customers found.</div>';
              }

              return rows.map(function(customer) {
                var code = escapeHtml(customer.code);
                var name = escapeHtml(customer.name);
                var houseName = clean(customer.houseName);
                var street = clean(customer.street);
                var place = clean(customer.place);
                var pinCode = clean(customer.pinCode);
                var mobile = escapeHtml(customer.mobile);
                var addressLine = [houseName, street, place, pinCode].filter(Boolean).join(' ');
                var safeAddress = escapeHtml(addressLine);

                return ''
                  + '<div class="customer-card">'
                  + '<div class="customer-title">' + code + '</div>'
                  + (name ? '<div class="stack-line">' + name + '</div>' : '')
                  + (safeAddress ? '<div class="stack-line">' + safeAddress + '</div>' : '')
                  + (mobile ? '<div class="stack-line">' + mobile + '</div>' : '')
                  + '</div>';
              }).join('');
            }

            function setReportStyle(style) {
              reportStyle = style;
              var table = document.getElementById('table-report');
              var stacked = document.getElementById('stacked-report');
              var btnTable = document.getElementById('btn-table');
              var btnStacked = document.getElementById('btn-stacked');

              if (style === 'table') {
                table.style.display = 'block';
                stacked.style.display = 'none';
                btnTable.classList.add('active');
                btnStacked.classList.remove('active');
              } else {
                table.style.display = 'none';
                stacked.style.display = 'grid';
                btnTable.classList.remove('active');
                btnStacked.classList.add('active');
              }
            }

            function updatePagination() {
              var totalPages = getTotalPages();
              pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;
              firstPageBtn.disabled = currentPage === 1;
              prevPageBtn.disabled = currentPage === 1;
              nextPageBtn.disabled = currentPage === totalPages;
              lastPageBtn.disabled = currentPage === totalPages;
            }

            function updateLoadStatus() {
              if (!loadStatus) return;
              if (loadingPage) {
                loadStatus.textContent = 'Loading page ' + currentPage + '...';
                return;
              }
              if (loadError) {
                loadStatus.textContent = loadError;
                return;
              }
              loadStatus.textContent = 'Showing page ' + currentPage + ' of ' + getTotalPages() + '.';
            }

            function renderReportPage() {
              var pageNotLoadedYet = !pageCache[currentPage];
              if (pageNotLoadedYet || (loadingPage && !getPagedRows().length)) {
                tableReportBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">Loading this page...</td></tr>';
                stackedReport.innerHTML = '<div style="font-size: 13px; color: #4b5563;">Loading this page...</div>';
                setReportStyle(reportStyle);
                updatePagination();
                updateLoadStatus();
                return;
              }

              var rows = getPagedRows();
              tableReportBody.innerHTML = renderTableRows(rows);
              stackedReport.innerHTML = renderStackedRows(rows);
              setReportStyle(reportStyle);
              updatePagination();
              updateLoadStatus();
            }

            async function loadPageData(page) {
              if (pageCache[page]) return;
              if (typeof window.__fetchPageData !== 'function') {
                loadError = 'Page data source is unavailable. Try reopening print preview.';
                updateLoadStatus();
                return;
              }

              loadingPage = true;
              loadError = '';
              renderReportPage();

              try {
                var result = await window.__fetchPageData(page, pageSize);
                var rows = (result && Array.isArray(result.rows)) ? result.rows : [];
                if (result && Number(result.totalCount)) {
                  totalRows = Number(result.totalCount);
                }
                pageCache[page] = rows;
              } catch (err) {
                loadError = 'Failed to load this page. Please try again.';
              } finally {
                loadingPage = false;
                renderReportPage();
              }
            }

            function goToPage(page) {
              var totalPages = getTotalPages();
              currentPage = Math.max(1, Math.min(totalPages, page));
              if (!pageCache[currentPage]) {
                loadPageData(currentPage);
                return;
              }
              renderReportPage();
            }

            function goToFirstPage() {
              goToPage(1);
            }

            function goToPrevPage() {
              goToPage(currentPage - 1);
            }

            function goToNextPage() {
              goToPage(currentPage + 1);
            }

            function goToLastPage() {
              goToPage(getTotalPages());
            }

            function changePageSize() {
              pageSize = Number(pageSizeSelect.value) || ${itemsPerPage};
              currentPage = 1;
              pageCache = {};
              loadError = '';
              loadPageData(1);
            }

            function hidePrintControls() {
              if (printControls) {
                printControls.style.display = 'none';
              }
            }

            function showPrintControls() {
              if (printControls) {
                printControls.style.display = 'flex';
              }
            }

            window.addEventListener('beforeprint', hidePrintControls);
            window.addEventListener('afterprint', showPrintControls);
            window.goToFirstPage = goToFirstPage;
            window.goToPrevPage = goToPrevPage;
            window.goToNextPage = goToNextPage;
            window.goToLastPage = goToLastPage;
            window.changePageSize = changePageSize;
            window.setReportStyle = setReportStyle;
            renderReportPage();
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setPreparingAction(null);

    if (canFetchPaged) {
      printWindow.__fetchPageData = async (page, perPage) => {
        const pageData = await fetchFilteredRowsPage(page, perPage);
        return {
          rows: pageData?.rows || [],
          totalCount: pageData?.totalCount || totalFilteredCount
        };
      };
    } else if (fetchAllFilteredRows && filtered.length < totalFilteredCount) {
      printWindow.__fetchPageData = async () => {
        const allRows = await getRowsForPrintReport();
        return {
          rows: allRows,
          totalCount: allRows.length
        };
      };
    }
  };

  // Helper function to get the maximum claimable points (fallback if not provided)
  const getMaxClaimablePointsFallback = (unclaimedPoints) => {
    if (getMaxClaimablePoints) {
      return getMaxClaimablePoints(unclaimedPoints);
    }
    return Math.floor(unclaimedPoints / 5) * 5;
  };

  // Helper function to check eligibility (fallback if not provided)
  const isEligibleForClaimsFallback = (unclaimedPoints) => {
    if (isEligibleForClaims) {
      return isEligibleForClaims(unclaimedPoints);
    }
    return unclaimedPoints >= 5;
  };

  const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);
  const startRecord = totalFilteredCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = totalFilteredCount === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalFilteredCount);
  const isPreparingReport = preparingAction !== null;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Customer List</h3>
          <span className="text-sm text-gray-500">{formatNumber(totalFilteredCount)} records found</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={isPreparingReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{preparingAction === 'csv' ? 'Preparing CSV...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={printCustomerList}
            disabled={isPreparingReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">{preparingAction === 'print' ? 'Opening Print...' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Total Customers</h4>
          <p className="text-2xl font-semibold">{formatNumber(totalFilteredCount)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Showing Results</h4>
          <p className="text-2xl font-semibold">{formatNumber(filtered.length)} <span className="text-sm text-gray-500">of {formatNumber(totalFilteredCount)}</span></p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Eligible for Claims</h4>
          <p className="text-2xl font-semibold text-green-600">{formatNumber(eligibleCustomersCount)}</p>
          <p className="text-xs text-gray-500">≥5 points</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Total Available Points</h4>
          <p className="text-2xl font-semibold text-blue-600">{formatNumber(totalStatistics.totalUnclaimed)}</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">#</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Code</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Name</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Place</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Mobile</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Total Points</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Claimed</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Unclaimed</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-700 border-b border-slate-200 border-r border-slate-200">Max Claimable</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="py-6 text-center text-gray-500">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    Loading customers...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-6 text-center text-gray-500">
                  No customers found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((customer, index) => {
                const maxClaimable = getMaxClaimablePointsFallback(customer.unclaimed || 0);
                const eligible = isEligibleForClaimsFallback(customer.unclaimed || 0);
                
                return (
                  <tr key={customer.code} className="hover:bg-slate-100 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 border-b border-slate-100 border-r border-slate-100">{formatNumber((currentPage - 1) * itemsPerPage + index + 1)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium border-b border-slate-100 border-r border-slate-100">{formatNumber(customer.code)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 border-r border-slate-100">{customer.name || '-'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 border-r border-slate-100">{customer.place || '-'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100 border-r border-slate-100">{customer.mobile || '-'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-right border-b border-slate-100 border-r border-slate-100">{formatNumber(customer.total || 0)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-blue-600 text-right border-b border-slate-100 border-r border-slate-100">{formatNumber(customer.claimed || 0)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right border-b border-slate-100 border-r border-slate-100">
                      <span className={`font-medium ${eligible ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatNumber(customer.unclaimed || 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right border-b border-slate-100 border-r border-slate-100">
                      <span className={`font-medium ${maxClaimable > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {formatNumber(maxClaimable)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-slate-100">
                      <div className="inline-flex items-center gap-1">
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md" 
                        title="Edit Customer"
                      >
                        <Edit size={16} />
                      </button>
                      {eligible && (
                        <button 
                          onClick={() => handleClaimClick(customer)}
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md" 
                          title={`Claim Points (Max: ${maxClaimable})`}
                        >
                          <Award size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleClaimHistoryClick(customer)}
                        className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md" 
                        title="View Claim History"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(customer)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md" 
                        title="Delete Customer"
                      >
                        <Trash size={16} />
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-500">Loading customers...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No customers found matching your criteria.
          </div>
        ) : (
          filtered.map((customer, index) => {
            const maxClaimable = getMaxClaimablePointsFallback(customer.unclaimed || 0);
            const eligible = isEligibleForClaimsFallback(customer.unclaimed || 0);
            
            return (
              <div key={customer.code} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-semibold">{customer.name || 'Unnamed Customer'}</h3>
                    <p className="text-sm text-gray-500">{formatNumber(customer.code)}</p>
                    <p className="text-xs text-gray-400">{customer.place || ''} • {customer.mobile || ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {eligible && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Award className="w-3 h-3 mr-1" />
                        Eligible
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-gray-500">Total Points</p>
                    <p className="font-medium">{formatNumber(customer.total || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Claimed</p>
                    <p className="font-medium text-blue-600">{formatNumber(customer.claimed || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unclaimed</p>
                    <p className={`font-medium ${eligible ? 'text-green-600' : 'text-gray-600'}`}>
                      {formatNumber(customer.unclaimed || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Max Claimable</p>
                    <p className={`font-medium ${maxClaimable > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {formatNumber(maxClaimable)}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Last Sale: {customer.lastSalesDate || 'N/A'}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {eligible && (
                      <button
                        onClick={() => handleClaimClick(customer)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title={`Claim Points (Max: ${maxClaimable})`}
                      >
                        <Award className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleClaimHistoryClick(customer)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded"
                      title="View Claim History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(customer)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600">per page</span>
            <span className="text-sm text-gray-500 ml-3">
              Showing {formatNumber(startRecord)}-{formatNumber(endRecord)} of {formatNumber(totalFilteredCount)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            
            <span className="px-3 py-2 text-sm">
              Page {formatNumber(currentPage)} of {formatNumber(totalPages)}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Claim History Dialog */}
      <ClaimHistoryDialog
        customer={claimHistoryDialog.customer}
        isOpen={claimHistoryDialog.isOpen}
        onClose={closeClaimHistoryDialog}
      />
    </>
  );
}
