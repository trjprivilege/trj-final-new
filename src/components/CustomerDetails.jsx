import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, X } from 'lucide-react';
import CustomerFilters from './CustomerFilters';
import CustomerTable from './CustomerTable';
import { useDebounce } from '../hooks/useDebounce';
import { searchCustomers } from '../lib/customerQueries';

export default function CustomerDetails() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibleCustomersCount, setEligibleCustomersCount] = useState(0);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    houseName: '',
    street: '',
    place: '',
    pinCode: '',
    phone: '',
    mobile: '',
    netWeight: '',
    lastSalesDate: '',
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState(10);
  const [customerToClaim, setCustomerToClaim] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Advanced filtering states
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: '',
      endDate: ''
    },
    points: {
      minTotal: '',
      maxTotal: '',
      minClaimed: '',
      maxClaimed: '',
      minUnclaimed: '',
      maxUnclaimed: ''
    },
    claimStatus: {
      hasClaimed: false,
      hasEligibleClaims: false
    }
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Optimized data loading with server-side filtering and pagination
  async function loadData() {
    setLoading(true);
    try {
      await loadCustomersWithFilters();
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load customer data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Load customers with server-side filtering and pagination
  async function loadCustomersWithFilters() {
    try {
      const searchOptions = {
        searchQuery: debouncedQuery,
        filters,
        page: currentPage,
        limit: itemsPerPage
      };

      const result = await searchCustomers(searchOptions);
      
      setRows(result.data);
      setTotalPages(result.totalPages);
      setTotalFilteredCount(result.totalCount);
      setEligibleCustomersCount(result.eligibleCount);
      
    } catch (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
  }

  // Debounce search query to prevent excessive API calls
  const debouncedQuery = useDebounce(query, 500);

  // Load data when component mounts or filters/pagination change
  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage, debouncedQuery, filters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, filters, itemsPerPage]);
  
  // Update total filtered count when rows change
  useEffect(() => {
    setTotalFilteredCount(rows.length * totalPages); // Approximate total based on current page
  }, [rows, totalPages]);
  
  // Handle filter changes
  const handleFilterChange = (category, field, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      dateRange: { startDate: '', endDate: '' },
      points: { minTotal: '', maxTotal: '', minClaimed: '', maxClaimed: '', minUnclaimed: '', maxUnclaimed: '' },
      claimStatus: { hasClaimed: false, hasEligibleClaims: false }
    });
    setQuery('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditCustomer = (customer) => {
    setIsNewCustomer(false);
    setCurrentCustomer(customer);
    setFormData({
      customerCode: customer.code,
      name: customer.name || '',
      houseName: customer.houseName || '',
      street: customer.street || '',
      place: customer.place || '',
      pinCode: customer.pinCode || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      netWeight: customer.netWeight || '',
      lastSalesDate: customer.lastSalesDate || '',
    });
    setIsModalOpen(true);
  };

  const handleAddNewCustomer = () => {
    setIsNewCustomer(true);
    setCurrentCustomer(null);
    setFormData({
      customerCode: '',
      name: '',
      houseName: '',
      street: '',
      place: '',
      pinCode: '',
      phone: '',
      mobile: '',
      netWeight: '',
      lastSalesDate: '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setIsDeleteConfirmOpen(true);
  };

  const handleClaimClick = (customer) => {
    setCustomerToClaim(customer);
    setClaimAmount(10); // Default claim amount
    setIsClaimModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    try {
      setErrorMessage('');
      // Validate required fields
      if (!formData.customerCode.trim()) {
        setErrorMessage('Customer Code is required');
        return;
      }

      const customerData = {
        'CUSTOMER CODE': formData.customerCode,
        'NAME1 & 2': formData.name,
        'HOUSE NAME': formData.houseName,
        'STREET': formData.street,
        'PLACE': formData.place,
        'PIN CODE': formData.pinCode,
        'PHONE': formData.phone,
        'MOBILE': formData.mobile,
        'NET WEIGHT': formData.netWeight ? parseFloat(formData.netWeight) : null,
        'LAST SALES DATE': formData.lastSalesDate,
      };

      if (isNewCustomer) {
        // Insert new customer
        const { data, error } = await supabase
          .from('sales_records')
          .insert([customerData])
          .select();

        if (error) throw error;
        
        // Update local state for new customer
        if (data && data.length > 0) {
          // Also create a points record for the new customer
          const { error: pointsError } = await supabase
            .from('customer_points')
            .insert([{
              'CUSTOMER_CODE': formData.customerCode,
              'TOTAL_POINTS': 0,
              'CLAIMED_POINTS': 0,
              'UNCLAIMED_POINTS': 0,
              'LAST_UPDATED': new Date().toISOString()
            }]);
            
          if (pointsError) throw pointsError;
          
          // Reload data to reflect changes
          await loadData();
        }
      } else {
        // Update existing customer
        const { error } = await supabase
          .from('sales_records')
          .update(customerData)
          .eq('CUSTOMER CODE', formData.customerCode);

        if (error) throw error;
        
        // Reload data to reflect changes
        await loadData();
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      setErrorMessage(error.message || 'Failed to save customer data');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      // Delete from sales_records
      const { error: salesError } = await supabase
        .from('sales_records')
        .delete()
        .eq('CUSTOMER CODE', customerToDelete.code);

      if (salesError) throw salesError;
      
      // Delete from customer_points
      const { error: pointsError } = await supabase
        .from('customer_points')
        .delete()
        .eq('CUSTOMER_CODE', customerToDelete.code);
        
      if (pointsError) throw pointsError;
      
      // Reload data to reflect changes
      await loadData();
      
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      setErrorMessage('Failed to delete customer. Please try again.');
    }
  };

  const handleClaimPoints = async () => {
    if (!customerToClaim) return;
    
    try {
      // Get current points for customer
      const { data, error: fetchError } = await supabase
        .from('customer_points')
        .select('CLAIMED_POINTS, TOTAL_POINTS')
        .eq('CUSTOMER_CODE', customerToClaim.code)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error('Customer points record not found');
      }

      // Check if customer has enough unclaimed points
      const unclaimed = data.TOTAL_POINTS - data.CLAIMED_POINTS;
      if (unclaimed < claimAmount) {
        setErrorMessage(`Customer only has ${unclaimed} points available to claim`);
        return;
      }

      const newClaimedPoints = data.CLAIMED_POINTS + parseInt(claimAmount);
      
      // Update only the CLAIMED_POINTS column, not UNCLAIMED_POINTS which is a generated column
      const { error: updateError } = await supabase
        .from('customer_points')
        .update({
          'CLAIMED_POINTS': newClaimedPoints,
          'LAST_UPDATED': new Date().toISOString()
        })
        .eq('CUSTOMER_CODE', customerToClaim.code);

      if (updateError) throw updateError;

      // Fetch the updated record to get the new UNCLAIMED_POINTS value
      const { data: updatedData, error: fetchUpdatedError } = await supabase
        .from('customer_points')
        .select('CLAIMED_POINTS, UNCLAIMED_POINTS')
        .eq('CUSTOMER_CODE', customerToClaim.code)
        .single();
        
      if (fetchUpdatedError) throw fetchUpdatedError;

      // Reload data to reflect changes
      await loadData();

      setIsClaimModalOpen(false);
      setCustomerToClaim(null);
    } catch (error) {
      console.error('Error claiming points:', error);
      setErrorMessage('Failed to claim points. Please try again.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Customer Management</h2>
        {/* Add Customer button temporarily hidden
        <button 
          onClick={handleAddNewCustomer}
          className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600"
        >
          <Plus size={16} /> Add Customer
        </button>
        */}
      </div>

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
          <button 
            className="float-right font-bold"
            onClick={() => setErrorMessage('')}
          >
            &times;
          </button>
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Loading customer data...</span>
          </div>
        </div>
      )}

      {/* Filter Component */}
      <CustomerFilters
        query={query}
        setQuery={setQuery}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        isFilterPanelOpen={isFilterPanelOpen}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
      />

      {/* Table Component */}
      <CustomerTable
        filtered={rows}
        loading={loading}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        totalPages={totalPages}
        handleEditCustomer={handleEditCustomer}
        handleClaimClick={handleClaimClick}
        handleDeleteClick={handleDeleteClick}
        totalFilteredCount={totalFilteredCount}
        eligibleCustomersCount={eligibleCustomersCount}
      />

      {/* Edit/Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {isNewCustomer ? 'Add New Customer' : 'Edit Customer'}
              </h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Code*
                </label>
                <input
                  type="text"
                  name="customerCode"
                  value={formData.customerCode}
                  onChange={handleInputChange}
                  disabled={!isNewCustomer}
                  className={`w-full p-2 border rounded ${!isNewCustomer ? "bg-gray-100" : ""}`}
                  required
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House Name
                </label>
                <input
                  type="text"
                  name="houseName"
                  value={formData.houseName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place
                </label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Weight
                </label>
                <input
                  type="number"
                  name="netWeight"
                  value={formData.netWeight}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Sales Date
                </label>
                <input
                  type="date"
                  name="lastSalesDate"
                  value={formData.lastSalesDate}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            {errorMessage && (
              <div className="mt-4 text-red-600 text-sm">{errorMessage}</div>
            )}
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="mb-6">
              Are you sure you want to delete customer "{customerToDelete?.name}" ({customerToDelete?.code})? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Points Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Claim Points</h3>
            <p className="mb-4">
              Customer: <strong>{customerToClaim?.name}</strong> ({customerToClaim?.code})
            </p>
            <p className="mb-4">
              Available Points: <strong>{customerToClaim?.unclaimed}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points to Claim
              </label>
              <input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                min="1"
                max={customerToClaim?.unclaimed}
                className="w-full p-2 border rounded"
              />
            </div>
            
            {errorMessage && (
              <div className="mt-2 text-red-600 text-sm">{errorMessage}</div>
            )}
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsClaimModalOpen(false);
                  setErrorMessage('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimPoints}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Claim
              </button>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
}