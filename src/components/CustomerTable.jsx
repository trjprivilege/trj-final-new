import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const [viewMode, setViewMode] = useState('table');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const abortFetchRef = useRef(false);

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
  const getRowsForPrintReport = async (onProgress) => {
    if (!fetchAllFilteredRows || filtered.length >= totalFilteredCount) {
      if (onProgress) onProgress(filtered.length);
      return filtered;
    }
    return fetchAllFilteredRows(onProgress, abortFetchRef);
  };

  // CSV export should match what is currently visible in the table page.
  const exportToCSV = () => {
    abortFetchRef.current = false;
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
    abortFetchRef.current = false;
    setPreparingAction('print');
    setLoadingProgress(0);
    setLoadedCount(0);
    try {
      const data = await getRowsForPrintReport((count) => {
        setLoadedCount(count);
        if (totalFilteredCount > 0) {
          setLoadingProgress(Math.min(100, Math.round((count / totalFilteredCount) * 100)));
        }
      });
      setPrintData(data);
      setIsPrinting(true);
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
        setPrintData(null);
      }, 500);
    } catch (error) {
      if (error.message === 'Export cancelled by user') {
        console.log("Print cancelled by user");
      } else {
        console.error("Print failed:", error);
      }
    } finally {
      setPreparingAction(null);
    }
  };

  const cancelPreparation = () => {
    abortFetchRef.current = true;
    setPreparingAction(null);
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
      {/* Full screen loader overlay */}
      {(isPreparingReport || isPrinting) && createPortal(
        <div className="fixed inset-0 bg-slate-900/50 z-[9999] flex flex-col items-center justify-center p-4 print:hidden backdrop-blur-md transition-all duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-gray-100 transform transition-all scale-100 relative">
            {preparingAction === 'print' && !isPrinting && (
              <button 
                onClick={cancelPreparation}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                title="Cancel preparation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
            <div className="relative mb-8 mt-2">
              {preparingAction === 'print' && totalFilteredCount > 0 && !isPrinting ? (
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="transform -rotate-90 w-32 h-32 drop-shadow-md" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-50" />
                    <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={2 * Math.PI * 44 - (loadingProgress / 100) * 2 * Math.PI * 44}
                      strokeLinecap="round"
                      className="text-blue-600 transition-all duration-300 ease-out" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{loadingProgress}%</span>
                  </div>
                </div>
              ) : (
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-600 border-l-transparent border-r-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center shadow-inner">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center tracking-tight">
              {preparingAction === 'csv' ? 'Exporting CSV...' : isPrinting ? 'Opening Print Dialog' : 'Preparing Print...'}
            </h2>
            <p className="text-gray-500 text-sm text-center font-medium leading-relaxed px-4">
              {preparingAction === 'csv' 
                ? 'Gathering and formatting your data' 
                : isPrinting 
                  ? 'Your document is ready to print!' 
                  : 'Fetching data and formatting layout. This might take a moment.'}
            </p>
            {preparingAction === 'print' && !isPrinting && totalFilteredCount > 0 && (
              <div className="w-full mt-6 bg-blue-50/80 text-blue-700 py-3 px-4 rounded-xl flex items-center justify-center gap-3 border border-blue-100 shadow-sm">
                <svg className="w-5 h-5 animate-pulse text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <span className="text-sm font-bold tracking-wide">
                  Loaded {formatNumber(loadedCount)} / {formatNumber(totalFilteredCount)}
                </span>
              </div>
            )}
            {preparingAction === 'print' && !isPrinting && (
              <button
                onClick={cancelPreparation}
                className="mt-6 text-sm font-semibold text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
              >
                Cancel Fetching
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="text-lg font-medium">Customer List</h3>
          <span className="text-sm text-gray-500">{formatNumber(totalFilteredCount)} records found</span>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'stacked' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Stacked View
            </button>
          </div>
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

      {/* Content Area - conditional render based on viewMode */}
      {viewMode === 'table' ? (
      
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
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

      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-500">Loading customers...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No customers found matching your criteria.
            </div>
          ) : (
            filtered.map((customer, index) => {
              const maxClaimable = getMaxClaimablePointsFallback(customer.unclaimed || 0);
              const eligible = isEligibleForClaimsFallback(customer.unclaimed || 0);
              
              return (
                <div key={customer.code} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-shadow duration-200 flex flex-col h-full">
                  <div className="p-3 border-b border-gray-100 flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{customer.name || 'Unnamed Customer'}</h3>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{customer.code}</div>
                    </div>
                    {eligible ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Eligible</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Not Eligible</span>
                    )}
                  </div>
                  
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="truncate flex items-center">
                        <svg className="w-3 h-3 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {customer.place || '-'}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {customer.mobile || '-'}
                      </span>
                    </div>

                    <div className="flex gap-1 mt-1">
                      <div className="flex-1 bg-slate-50 p-1.5 rounded text-center">
                        <div className="text-[9px] text-slate-500 uppercase leading-none mb-1">Total</div>
                        <div className="text-xs font-semibold text-slate-800">{formatNumber(customer.total || 0)}</div>
                      </div>
                      <div className="flex-1 bg-blue-50 p-1.5 rounded text-center">
                        <div className="text-[9px] text-blue-600 uppercase leading-none mb-1">Claimed</div>
                        <div className="text-xs font-semibold text-blue-700">{formatNumber(customer.claimed || 0)}</div>
                      </div>
                      <div className="flex-1 bg-emerald-50 p-1.5 rounded text-center">
                        <div className="text-[9px] text-emerald-700 uppercase leading-none mb-1">Unclaim</div>
                        <div className="text-xs font-semibold text-emerald-700">{formatNumber(customer.unclaimed || 0)}</div>
                      </div>
                      <div className="flex-1 bg-purple-50 p-1.5 rounded text-center">
                        <div className="text-[9px] text-purple-600 uppercase leading-none mb-1">Max</div>
                        <div className="text-xs font-semibold text-purple-700">{formatNumber(maxClaimable)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                    <div className="text-[10px] text-slate-500">
                      Last Sale: {customer.lastSalesDate || 'N/A'}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditCustomer(customer)} className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Edit Customer">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {eligible && (
                        <button onClick={() => handleClaimClick(customer)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded transition-colors" title={`Claim Points (Max: ${maxClaimable})`}>
                          <Award className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleClaimHistoryClick(customer)} className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors" title="View Claim History">
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteClick(customer)} className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors" title="Delete Customer">
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
      {/* Hidden Print Container */}
      {isPrinting && printData && createPortal(
        <div id="print-root" className="hidden print:block w-full bg-white text-black p-8" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          
          <div className="text-center mb-6 border-b-2 border-black pb-4">
            <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Customer Loyalty Program Report</h1>
            <p className="text-sm">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
          
          <div className="mb-6 flex justify-between text-sm max-w-4xl">
            <div>
              <span className="font-bold">Total Customers:</span> {formatNumber(totalFilteredCount)}
            </div>
            <div>
              <span className="font-bold">Eligible for Claims:</span> {formatNumber(eligibleCustomersCount)}
            </div>
            <div>
              <span className="font-bold">Total Points:</span> {formatNumber(totalStatistics.totalPoints)}
            </div>
            <div>
              <span className="font-bold">Total Available:</span> {formatNumber(totalStatistics.totalUnclaimed)}
            </div>
          </div>

          {viewMode === 'table' ? (
            <table className="w-full text-left text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 font-bold">Code</th>
                  <th className="border border-black p-2 font-bold">Name</th>
                  <th className="border border-black p-2 font-bold">Place</th>
                  <th className="border border-black p-2 font-bold">Mobile</th>
                  <th className="border border-black p-2 font-bold text-right">Total Points</th>
                  <th className="border border-black p-2 font-bold text-right">Claimed</th>
                  <th className="border border-black p-2 font-bold text-right">Unclaimed</th>
                  <th className="border border-black p-2 font-bold text-right">Max Claimable</th>
                  <th className="border border-black p-2 font-bold">Last Sales Date</th>
                </tr>
              </thead>
              <tbody>
                {printData.map((c, i) => (
                  <tr key={c.code || i} className="break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <td className="border border-black p-2">{c.code}</td>
                    <td className="border border-black p-2">{c.name || '-'}</td>
                    <td className="border border-black p-2">{c.place || '-'}</td>
                    <td className="border border-black p-2">{c.mobile || '-'}</td>
                    <td className="border border-black p-2 text-right">{formatNumber(c.total)}</td>
                    <td className="border border-black p-2 text-right">{formatNumber(c.claimed)}</td>
                    <td className="border border-black p-2 text-right font-bold">{formatNumber(c.unclaimed)}</td>
                    <td className="border border-black p-2 text-right">{formatNumber(getMaxClaimablePointsFallback(c.unclaimed))}</td>
                    <td className="border border-black p-2">{c.lastSalesDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="block w-full">
              {printData.map((c, i) => (
                <div key={c.code || i} className="inline-block w-[48%] lg:w-[31%] align-top m-[1%] border border-black p-4 text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="flex justify-between border-b border-gray-400 pb-2 mb-2">
                    <span className="font-bold text-sm">{c.name || 'Unnamed Customer'}</span>
                    <span className="font-mono">{c.code}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div><span className="font-bold mr-1">House Name:</span> {c.houseName || '-'}</div>
                    <div><span className="font-bold mr-1">Street Name:</span> {c.street || '-'}</div>
                    <div><span className="font-bold mr-1">Place:</span> {c.place || '-'}</div>
                    <div><span className="font-bold mr-1">Pin Code:</span> {c.pinCode || '-'}</div>
                    <div><span className="font-bold mr-1">Mobile:</span> {c.mobile || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-8 text-xs text-center border-t border-black pt-4">
            <p>Report generated from Customer Loyalty Management System</p>
          </div>
        </div>, document.body
      )}
    </>
  );
}
// new
