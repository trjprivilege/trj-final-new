import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import CustomerFilters from './CustomerFilters';
import CustomerTable from './CustomerTable';
import { useDebounce } from '../hooks/useDebounce';

export default function CustomerDetails() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibleCustomersCount, setEligibleCustomersCount] = useState(0);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [totalStatistics, setTotalStatistics] = useState({
    totalPoints: 0,
    totalClaimed: 0,
    totalUnclaimed: 0
  });
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    houseName: '',
    street: '',
    place: '',
    pinCode: '',
    mobile: '',
    lastSalesDate: '',
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState(5); // Default to 5 instead of 10
  const [customerToClaim, setCustomerToClaim] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
  const customerListCacheRef = useRef(new Map());

  // Debounce search query to prevent excessive API calls
  const debouncedQuery = useDebounce(query, 500);

  const parseNumberFilter = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const transformCustomerRow = (row) => ({
    code: row.customer_code || row["CUSTOMER CODE"],
    name: row.customer_name || row["CUSTOMER NAME"],
    houseName: row.house_name || row["HOUSE NAME"],
    street: row.street || row["STREET"],
    place: row.place || row["PLACE"],
    pinCode: row.pin_code || row["PIN CODE"],
    mobile: row.mobile || row["MOBILE"],
    netWeight: row.net_weight || row["NET WEIGHT"],
    lastSalesDate: row.original_date,
    parsedDate: row.parsed_date,
    total: row.total_points || 0,
    claimed: row.claimed_points || 0,
    unclaimed: row.unclaimed_points || 0,
    lastUpdated: row.points_last_updated
  });

  const getListCacheKey = (page = currentPage, perPage = itemsPerPage) =>
    JSON.stringify({
      q: debouncedQuery.trim() || '',
      filters,
      page,
      perPage
    });

  const applyCustomerListState = (payload, pageSize = itemsPerPage) => {
    const pagedRows = (payload?.rows || []).map(transformCustomerRow);
    const totalCount = payload?.total_count || 0;
    const eligibleCount = payload?.eligible_count || 0;

    setRows(pagedRows);
    setTotalFilteredCount(totalCount);
    setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));
    setEligibleCustomersCount(eligibleCount);
    setTotalStatistics({
      totalPoints: payload?.total_points || 0,
      totalClaimed: payload?.total_claimed || 0,
      totalUnclaimed: payload?.total_unclaimed || 0
    });
  };

  const clearCustomerListCache = () => {
    customerListCacheRef.current.clear();
  };

  const applyFiltersToQuery = (queryBuilder) => {
    let queryRef = queryBuilder;

    if (debouncedQuery.trim()) {
      queryRef = queryRef.or(`"CUSTOMER CODE".ilike.%${debouncedQuery}%,"CUSTOMER NAME".ilike.%${debouncedQuery}%,"MOBILE".ilike.%${debouncedQuery}%`);
    }

    if (filters.dateRange.startDate) {
      queryRef = queryRef.gte('parsed_date', filters.dateRange.startDate);
    }
    if (filters.dateRange.endDate) {
      queryRef = queryRef.lte('parsed_date', filters.dateRange.endDate);
    }

    if (filters.points.minTotal) {
      queryRef = queryRef.gte('total_points', parseNumberFilter(filters.points.minTotal));
    }
    if (filters.points.maxTotal) {
      queryRef = queryRef.lte('total_points', parseNumberFilter(filters.points.maxTotal));
    }
    if (filters.points.minClaimed) {
      queryRef = queryRef.gte('claimed_points', parseNumberFilter(filters.points.minClaimed));
    }
    if (filters.points.maxClaimed) {
      queryRef = queryRef.lte('claimed_points', parseNumberFilter(filters.points.maxClaimed));
    }
    if (filters.points.minUnclaimed) {
      queryRef = queryRef.gte('unclaimed_points', parseNumberFilter(filters.points.minUnclaimed));
    }
    if (filters.points.maxUnclaimed) {
      queryRef = queryRef.lte('unclaimed_points', parseNumberFilter(filters.points.maxUnclaimed));
    }

    if (filters.claimStatus.hasClaimed) {
      queryRef = queryRef.gt('claimed_points', 0);
    }
    if (filters.claimStatus.hasEligibleClaims) {
      queryRef = queryRef.gte('unclaimed_points', 5);
    }

    return queryRef;
  };

  // Helper function to calculate maximum claimable points (in multiples of 5)
  const getMaxClaimablePoints = (unclaimedPoints) => {
    return Math.floor(unclaimedPoints / 5) * 5;
  };

  // Helper function to check if customer is eligible for claims (≥5 points)
  const isEligibleForClaims = (unclaimedPoints) => {
    return unclaimedPoints >= 5;
  };

  // Helper function to generate claim amount options
  const getClaimAmountOptions = (unclaimedPoints) => {
    const maxClaimable = getMaxClaimablePoints(unclaimedPoints);
    const options = [];
    for (let i = 5; i <= maxClaimable; i += 5) {
      options.push(i);
    }
    return options;
  };

  const fetchCustomerListData = async (page = currentPage, perPage = itemsPerPage) => {
    const rpcParams = {
      p_query: debouncedQuery.trim() || null,
      p_start_date: filters.dateRange.startDate || null,
      p_end_date: filters.dateRange.endDate || null,
      p_min_total: parseNumberFilter(filters.points.minTotal),
      p_max_total: parseNumberFilter(filters.points.maxTotal),
      p_min_claimed: parseNumberFilter(filters.points.minClaimed),
      p_max_claimed: parseNumberFilter(filters.points.maxClaimed),
      p_min_unclaimed: parseNumberFilter(filters.points.minUnclaimed),
      p_max_unclaimed: parseNumberFilter(filters.points.maxUnclaimed),
      p_has_claimed: filters.claimStatus.hasClaimed,
      p_has_eligible_claims: filters.claimStatus.hasEligibleClaims,
      p_page: page,
      p_items_per_page: perPage
    };

    const { data: payload, error } = await supabase.rpc('get_customer_list_data', rpcParams);
    if (error) throw error;
    return payload;
  };

  const fetchAllFilteredRows = async () => {
    const baseQuery = supabase
      .from('customer_summary')
      .select(`
        "CUSTOMER CODE",
        "CUSTOMER NAME",
        "HOUSE NAME",
        "STREET",
        "PLACE",
        "PIN CODE", 
        "MOBILE",
        "NET WEIGHT",
        original_date,
        parsed_date,
        total_points,
        claimed_points,
        unclaimed_points,
        points_last_updated
      `)
      .order('"CUSTOMER CODE"', { ascending: true });

    const filteredQuery = applyFiltersToQuery(baseQuery);
    const { data, error } = await filteredQuery;
    if (error) throw error;
    return (data || []).map(transformCustomerRow);
  };

  // Optimized data loading with server-side filtering and pagination
  async function loadData() {
    const cacheKey = getListCacheKey();
    const cachedPayload = customerListCacheRef.current.get(cacheKey);
    if (cachedPayload) {
      applyCustomerListState(cachedPayload);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await loadCustomersWithFilters(cacheKey);
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load customer data. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Load customers with server-side filtering and pagination using the new customer_summary view
  async function loadCustomersWithFilters(cacheKey = null) {
    try {
      const payload = await fetchCustomerListData(currentPage, itemsPerPage);
      applyCustomerListState(payload, itemsPerPage);

      const resolvedCacheKey = cacheKey || getListCacheKey(currentPage, itemsPerPage);
      customerListCacheRef.current.set(resolvedCacheKey, payload);

      // Prefetch next page in background so moving forward avoids loader.
      const prefetchPage = currentPage + 1;
      const maxPages = Math.max(1, Math.ceil((payload?.total_count || 0) / itemsPerPage));
      if (prefetchPage <= maxPages) {
        const nextKey = getListCacheKey(prefetchPage, itemsPerPage);
        if (!customerListCacheRef.current.has(nextKey)) {
          fetchCustomerListData(prefetchPage, itemsPerPage)
            .then((nextPayload) => {
              customerListCacheRef.current.set(nextKey, nextPayload);
            })
            .catch(() => {
              // Ignore prefetch failures; main flow is unaffected.
            });
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
  }

  // Function to refresh points manually
  const handleRefreshPoints = async () => {
    setIsRefreshing(true);
    try {
      const { data: pointsResult, error: pointsError } = await supabase.rpc('refresh_customer_points');
      if (pointsError) throw pointsError;

      const { data: datesResult, error: datesError } = await supabase.rpc('update_parsed_dates');
      if (datesError) throw datesError;

      clearCustomerListCache();
      await loadData(); // Reload the data
      setErrorMessage(`✅ ${pointsResult} ${datesResult}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } catch (error) {
      console.error('Error refreshing points:', error);
      setErrorMessage(`❌ Failed to refresh points: ${error.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data when component mounts or filters/pagination change
  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage, debouncedQuery, filters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, filters, itemsPerPage]);
  
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
    clearCustomerListCache();
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
      customerName: customer.name || '',
      houseName: customer.houseName || '',
      street: customer.street || '',
      place: customer.place || '',
      pinCode: customer.pinCode || '',
      mobile: customer.mobile || '',
      lastSalesDate: customer.lastSalesDate || '',
    });
    setIsModalOpen(true);
  };

  const handleAddNewCustomer = () => {
    setIsNewCustomer(true);
    setCurrentCustomer(null);
    setFormData({
      customerCode: '',
      customerName: '',
      houseName: '',
      street: '',
      place: '',
      pinCode: '',
      mobile: '',
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
    // Set default claim amount to the maximum claimable (in multiples of 5)
    const maxClaimable = getMaxClaimablePoints(customer.unclaimed);
    setClaimAmount(Math.min(5, maxClaimable)); // Default to 5 or max claimable, whichever is smaller
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
        "CUSTOMER CODE": formData.customerCode.trim(),
        "CUSTOMER NAME": formData.customerName.trim(),
        "HOUSE NAME": formData.houseName.trim(),
        "STREET": formData.street.trim(),
        "PLACE": formData.place.trim(),
        "PIN CODE": formData.pinCode.trim(),
        "MOBILE": formData.mobile.trim(),
        "NET WEIGHT": isNewCustomer ? 0 : (currentCustomer?.netWeight || 0), // Preserve existing weight or set to 0 for new customers
        "LAST SALES DATE": formData.lastSalesDate || null,
      };

      if (isNewCustomer) {
        const { error } = await supabase
          .from('sales_records')
          .insert([customerData]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sales_records')
          .update(customerData)
          .eq('"CUSTOMER CODE"', currentCustomer.code);

        if (error) throw error;
      }

      // Refresh points after customer data change
      clearCustomerListCache();
      await handleRefreshPoints();

      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving customer:', error);
      setErrorMessage('Failed to save customer: ' + error.message);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      setErrorMessage('');
      
      const { error } = await supabase
        .from('sales_records')
        .delete()
        .eq('"CUSTOMER CODE"', customerToDelete.code);
      
      if (error) throw error;
      
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      clearCustomerListCache();
      await loadData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      setErrorMessage('Failed to delete customer: ' + error.message);
    }
  };

  const handleClaimPoints = async () => {
    try {
      setErrorMessage('');
      
      if (!claimAmount || claimAmount <= 0) {
        setErrorMessage('Please enter a valid claim amount');
        return;
      }

      // Validate that claim amount is a multiple of 5
      if (claimAmount % 5 !== 0) {
        setErrorMessage('Claim amount must be a multiple of 5 points');
        return;
      }

      if (claimAmount > customerToClaim.unclaimed) {
        setErrorMessage(`Cannot claim ${claimAmount} points. Only ${customerToClaim.unclaimed} points available.`);
        return;
      }

      const maxClaimable = getMaxClaimablePoints(customerToClaim.unclaimed);
      if (claimAmount > maxClaimable) {
        setErrorMessage(`Cannot claim ${claimAmount} points. Maximum claimable in multiples of 5: ${maxClaimable} points.`);
        return;
      }

      // Use the new claim_customer_points function
      const { data: result, error } = await supabase.rpc('claim_customer_points', {
        customer_code: customerToClaim.code,
        points_to_claim: claimAmount
      });
      
      if (error) throw error;

      setIsClaimModalOpen(false);
      setCustomerToClaim(null);
      setClaimAmount(5);
      
      // Show success message
      const remainingPoints = customerToClaim.unclaimed - claimAmount;
      setErrorMessage(`✅ ${result} (${remainingPoints} points remaining)`);
      setTimeout(() => setErrorMessage(''), 5000);
      
      clearCustomerListCache();
      await loadData();
    } catch (error) {
      console.error('Error claiming points:', error);
      setErrorMessage('Failed to claim points: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Customer and Refresh Points buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
        <div className="flex gap-2">
        <button 
            onClick={handleRefreshPoints}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50"
        >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Points'}
        </button>
          <button 
            onClick={handleAddNewCustomer}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {errorMessage && (
        <div className={`p-4 rounded-md ${
          errorMessage.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <p className="flex items-start">
            {errorMessage.startsWith('✅') ? (
              <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            {errorMessage}
          </p>
        </div>
      )}

   

      {/* Filters */}
      <CustomerFilters
        query={query}
        setQuery={setQuery}
        filters={filters}
        handleFilterChange={handleFilterChange}
        clearFilters={clearFilters}
        isFilterPanelOpen={isFilterPanelOpen}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
      />

      {/* Customer Table */}
      <CustomerTable
        filtered={rows}
        fetchAllFilteredRows={fetchAllFilteredRows}
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
        totalStatistics={totalStatistics}
        isEligibleForClaims={isEligibleForClaims} // Pass the eligibility checker
        getMaxClaimablePoints={getMaxClaimablePoints} // Pass the max claimable calculator
      />

      {/* Customer Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {isNewCustomer ? 'Add New Customer' : 'Edit Customer'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Code *
                </label>
                <input
                  type="text"
                  name="customerCode"
                  value={formData.customerCode}
                  onChange={handleInputChange}
                  disabled={!isNewCustomer}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                </label>
                <input
                  type="text"
                    name="customerName"
                    value={formData.customerName}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  House Name
                </label>
                <input
                  type="text"
                  name="houseName"
                  value={formData.houseName}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place
                </label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile
                </label>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
                <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Sales Date (DD/MM/YYYY)
                </label>
                <input
                    type="text"
                  name="lastSalesDate"
                  value={formData.lastSalesDate}
                  onChange={handleInputChange}
                    placeholder="31/12/2023"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isNewCustomer ? 'Add Customer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && customerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Delete
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete customer{' '}
                <span className="font-medium">{customerToDelete.name}</span> (Code:{' '}
                <span className="font-medium">{customerToDelete.code}</span>)?
              </p>
              <p className="text-sm text-red-600 mb-4">
                This action cannot be undone and will remove all associated points data.
              </p>
              <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                  Delete Customer
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Updated Claim Points Modal - Multiple of 5 */}
      {isClaimModalOpen && customerToClaim && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Claim Loyalty Points
              </h3>
              <div className="mb-4">
                <p className="text-gray-600">
                  Customer: <span className="font-medium">{customerToClaim.name}</span>
                </p>
                <p className="text-gray-600">
                  Code: <span className="font-medium">{customerToClaim.code}</span>
                </p>
                <p className="text-green-600 font-medium">
                  Available Points: {customerToClaim.unclaimed}
                </p>
                <p className="text-blue-600 font-medium">
                  Max Claimable: {getMaxClaimablePoints(customerToClaim.unclaimed)} points
                </p>
              </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points to Claim (multiples of 5 only)
              </label>
              
              {/* Dropdown selector for multiples of 5 */}
              <select
                value={claimAmount}
                onChange={(e) => setClaimAmount(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getClaimAmountOptions(customerToClaim.unclaimed).map(amount => (
                  <option key={amount} value={amount}>
                    {amount} points
                  </option>
                ))}
              </select>
              
              <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
                <p><strong>New Claiming Rules:</strong></p>
                <p>• Claims must be in multiples of 5 points</p>
                <p>• Remaining points after claim: {customerToClaim.unclaimed - claimAmount}</p>
                <p>• These remaining points can be claimed later when they reach multiples of 5</p>
              </div>
            </div>
            
              <div className="flex justify-end gap-3">
              <button
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimPoints}
                  disabled={!claimAmount || claimAmount > getMaxClaimablePoints(customerToClaim.unclaimed)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  Claim {claimAmount} Points
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
