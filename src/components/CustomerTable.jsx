import React, { useState } from 'react';
import { Edit, Trash, Award, ChevronLeft, ChevronRight, FileText, Download, ChevronsLeft, ChevronsRight, History } from 'lucide-react';
import Papa from 'papaparse';
import ClaimHistoryDialog from './ClaimHistoryDialog';

const pageSizeOptions = [10, 25, 50, 100, 500, 1000];

export default function CustomerTable({
  filtered,
  fetchAllFilteredRows,
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
  const [isPreparingReport, setIsPreparingReport] = useState(false);

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

  // Function to export data to CSV
  const getRowsForReport = async () => {
    if (!fetchAllFilteredRows || filtered.length >= totalFilteredCount) {
      return filtered;
    }
    return fetchAllFilteredRows();
  };

  const exportToCSV = async () => {
    setIsPreparingReport(true);
    let reportRows = filtered;
    try {
      reportRows = await getRowsForReport();
    } catch (error) {
      console.error('Failed to load full dataset for CSV export:', error);
    } finally {
      setIsPreparingReport(false);
    }

    const csvData = reportRows.map(customer => ({
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
  };

  // Function to print the customer list
  const printCustomerList = async () => {
    setIsPreparingReport(true);
    let reportRows = filtered;
    try {
      reportRows = await getRowsForReport();
    } catch (error) {
      console.error('Failed to load full dataset for printing:', error);
    } finally {
      setIsPreparingReport(false);
    }

    const printWindow = window.open('', '_blank');

    const renderTableRows = () =>
      reportRows.map(customer => {
        const maxClaimable = getMaxClaimablePoints ? getMaxClaimablePoints(customer.unclaimed) : Math.floor(customer.unclaimed / 5) * 5;
        return `
          <tr>
            <td>${customer.code || ''}</td>
            <td>${customer.name || ''}</td>
            <td>${customer.place || ''}</td>
            <td>${customer.mobile || ''}</td>
            <td>${customer.total || 0}</td>
            <td>${customer.claimed || 0}</td>
            <td>${customer.unclaimed || 0}</td>
            <td>${maxClaimable}</td>
            <td>${customer.lastSalesDate || ''}</td>
          </tr>
        `;
      }).join('');

    const renderStackedRows = () =>
      reportRows.map(customer => {
        const clean = (value) => {
          if (value === null || value === undefined) return '';
          return String(value).trim();
        };

        const code = clean(customer.code);
        const name = clean(customer.name);
        const houseName = clean(customer.houseName);
        const street = clean(customer.street);
        const place = clean(customer.place);
        const pinCode = clean(customer.pinCode);
        const mobile = clean(customer.mobile);
        const addressLine = [houseName, street, place, pinCode].filter(Boolean).join(' ');

        return `
          <div class="customer-card">
            <div class="customer-title">${code}</div>
            ${name ? `<div class="stack-line">${name}</div>` : ''}
            ${addressLine ? `<div class="stack-line">${addressLine}</div>` : ''}
            ${mobile ? `<div class="stack-line">${mobile}</div>` : ''}
          </div>
        `;
      }).join('');
    
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
              <tbody>
                ${renderTableRows()}
              </tbody>
            </table>
          </div>
          <div id="stacked-report" class="stacked-grid" style="display:${printStyle === 'stacked' ? 'grid' : 'none'};">
            ${renderStackedRows()}
          </div>
          
          <div style="margin-top: 20px; font-size: 10px; color: #666;">
            <p>Points Formula: 1 point per 10 grams of gold weight</p>
            <p>Claims must be in multiples of 5 points | Minimum eligibility: 5 points</p>
            <p>Report generated from Customer Loyalty Management System</p>
          </div>
          <script>
            var printControls = document.getElementById('print-controls');

            function setReportStyle(style) {
              var table = document.getElementById('table-report');
              var stacked = document.getElementById('stacked-report');
              var btnTable = document.getElementById('btn-table');
              var btnStacked = document.getElementById('btn-stacked');

              if (style === 'table') {
                table.style.display = 'block';
                stacked.style.display = 'none';
                btnTable.classList.add('active');
                btnStacked.classList.remove('active');
                return;
              }

              table.style.display = 'none';
              stacked.style.display = 'grid';
              btnTable.classList.remove('active');
              btnStacked.classList.add('active');
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
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
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

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Customer List</h3>
          <span className="text-sm text-gray-500">{totalFilteredCount} records found</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={isPreparingReport}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{isPreparingReport ? 'Preparing...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={printCustomerList}
            disabled={isPreparingReport}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">{isPreparingReport ? 'Preparing...' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Total Customers</h4>
          <p className="text-2xl font-semibold">{totalFilteredCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Showing Results</h4>
          <p className="text-2xl font-semibold">{filtered.length} <span className="text-sm text-gray-500">of {totalFilteredCount}</span></p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Eligible for Claims</h4>
          <p className="text-2xl font-semibold text-green-600">{eligibleCustomersCount}</p>
          <p className="text-xs text-gray-500">≥5 points</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Total Available Points</h4>
          <p className="text-2xl font-semibold text-blue-600">{totalStatistics.totalUnclaimed}</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Code</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Place</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Mobile</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Total Points</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Claimed</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Unclaimed</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Max Claimable</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
                  <tr key={customer.code} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{customer.code}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{customer.name || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{customer.place || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{customer.mobile || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium">{customer.total || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-blue-600">{customer.claimed || 0}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`font-medium ${eligible ? 'text-green-600' : 'text-gray-600'}`}>
                        {customer.unclaimed || 0}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`font-medium ${maxClaimable > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                        {maxClaimable}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap flex gap-1">
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="p-1 text-blue-600 hover:text-blue-800" 
                        title="Edit Customer"
                      >
                        <Edit size={16} />
                      </button>
                      {eligible && (
                        <button 
                          onClick={() => handleClaimClick(customer)}
                          className="p-1 text-green-600 hover:text-green-800" 
                          title={`Claim Points (Max: ${maxClaimable})`}
                        >
                          <Award size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleClaimHistoryClick(customer)}
                        className="p-1 text-purple-600 hover:text-purple-800" 
                        title="View Claim History"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(customer)}
                        className="p-1 text-red-600 hover:text-red-800" 
                        title="Delete Customer"
                      >
                        <Trash size={16} />
                      </button>
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
                    <p className="text-sm text-gray-500">{customer.code}</p>
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
                    <p className="font-medium">{customer.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Claimed</p>
                    <p className="font-medium text-blue-600">{customer.claimed || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unclaimed</p>
                    <p className={`font-medium ${eligible ? 'text-green-600' : 'text-gray-600'}`}>
                      {customer.unclaimed || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Max Claimable</p>
                    <p className={`font-medium ${maxClaimable > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                      {maxClaimable}
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
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              Page {currentPage} of {totalPages}
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
