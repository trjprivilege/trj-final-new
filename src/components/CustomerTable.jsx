import React from 'react';
import { Edit, Trash, Award, ChevronLeft, ChevronRight, FileText, Download, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Papa from 'papaparse';

const pageSizeOptions = [10, 25, 50, 100, 500, 1000];

export default function CustomerTable({
  filtered,
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
  eligibleCustomersCount
}) {
  // Function to export data to CSV
  const exportToCSV = () => {
    const csvData = filtered.map(customer => ({
      'Customer Code': customer.code,
      'Name': customer.name,
      'House Name': customer.houseName,
      'Street': customer.street,
      'Place': customer.place,
      'PIN Code': customer.pinCode,
      'Phone': customer.phone,
      'Mobile': customer.mobile,
      'Net Weight': customer.netWeight,
      'Last Sales Date': customer.lastSalesDate,
      'Total Points': customer.total,
      'Claimed Points': customer.claimed,
      'Unclaimed Points': customer.unclaimed
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customer_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to print the customer list
  const printCustomerList = () => {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer List</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            @media print {
              .no-print { display: none; }
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Customer List</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="no-print" style="margin-bottom: 20px; text-align: center;">
            <button onclick="window.print()">Print</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Total Points</th>
                <th>Claimed</th>
                <th>Unclaimed</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(customer => `
                <tr>
                  <td>${customer.code}</td>
                  <td>${customer.name || ''}</td>
                  <td>${customer.mobile || ''}</td>
                  <td>${customer.total}</td>
                  <td>${customer.claimed}</td>
                  <td>${customer.unclaimed}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">Customer List</h3>
          <span className="text-sm text-gray-500">{totalFilteredCount} records found</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={printCustomerList}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Print List</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Total Customers</h4>
          <p className="text-2xl font-semibold">{totalFilteredCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Filtered Results</h4>
          <p className="text-2xl font-semibold">{filtered.length} <span className="text-sm text-gray-500">of {totalFilteredCount}</span></p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-sm text-gray-500">Eligible for Claims (≥10 points)</h4>
          <p className="text-2xl font-semibold">{eligibleCustomersCount}</p>
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
              <th className="px-3 py-2 text-left font-medium text-gray-700">Phone</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Mobile</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Last Sales Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Total Points</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Claimed</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Unclaimed</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="9" className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-6 text-center text-gray-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map((customer, index) => (
                <tr key={customer.code} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.code}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.phone}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.mobile}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.lastSalesDate}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.total}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.claimed}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{customer.unclaimed}</td>
                  <td className="px-3 py-2 whitespace-nowrap flex gap-2">
                    <button 
                      onClick={() => handleEditCustomer(customer)}
                      className="p-1 text-blue-600 hover:text-blue-800" 
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleClaimClick(customer)}
                      className="p-1 text-green-600 hover:text-green-800" 
                      title="Claim Points"
                      disabled={customer.unclaimed < 10}
                    >
                      <Award size={16} className={customer.unclaimed < 10 ? "opacity-50" : ""} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(customer)}
                      className="p-1 text-red-600 hover:text-red-800" 
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-gray-500">No customers found.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((customer) => (
              <div key={customer.code} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{customer.mobile}</p>
                    <p className="text-xs text-gray-500">{customer.phone}</p>
                  </div>
                </div>
                
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Last Sales Date</p>
                  <p className="text-sm font-medium">{customer.lastSalesDate}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Total</p>
                    <p className="font-medium">{customer.total}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Claimed</p>
                    <p className="font-medium">{customer.claimed}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Unclaimed</p>
                    <p className="font-medium">{customer.unclaimed}</p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-3">
                  <button 
                    onClick={() => handleEditCustomer(customer)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-full" 
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleClaimClick(customer)}
                    className="p-1.5 text-green-600 hover:text-green-800 bg-green-50 rounded-full" 
                    disabled={customer.unclaimed < 10}
                  >
                    <Award size={16} className={customer.unclaimed < 10 ? "opacity-50" : ""} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(customer)}
                    className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 rounded-full" 
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-600">
            Showing {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalFilteredCount)} of {totalFilteredCount} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded border disabled:opacity-50"
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border disabled:opacity-50"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border disabled:opacity-50"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded border disabled:opacity-50"
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}