import { supabase } from './supabaseClient';

/**
 * Optimized customer query builders for better performance
 */

/**
 * Build a customer query with filters and pagination
 * @param {Object} options - Query options
 * @param {string} options.searchQuery - Text search query
 * @param {Object} options.filters - Filter object
 * @param {number} options.page - Current page (1-based)
 * @param {number} options.limit - Items per page
 * @returns {Object} Supabase query builder
 */
export function buildCustomerQuery({ searchQuery = '', filters = {}, page = 1, limit = 10 }) {
  let query = supabase
    .from('sales_records')
    .select(`
      *,
      customer_points!inner(
        TOTAL_POINTS,
        CLAIMED_POINTS,
        UNCLAIMED_POINTS
      )
    `);

  // Apply text search filter
  if (searchQuery.trim()) {
    query = query.or(
      `"CUSTOMER CODE".ilike.%${searchQuery}%,"NAME1 & 2".ilike.%${searchQuery}%,MOBILE.ilike.%${searchQuery}%`
    );
  }

  // Apply date range filter
  if (filters.dateRange?.startDate && filters.dateRange?.endDate) {
    query = query
      .gte('LAST SALES DATE', filters.dateRange.startDate)
      .lte('LAST SALES DATE', filters.dateRange.endDate);
  }

  // Apply points filters
  if (filters.points?.minTotal) {
    query = query.gte('customer_points.TOTAL_POINTS', parseInt(filters.points.minTotal));
  }
  if (filters.points?.maxTotal) {
    query = query.lte('customer_points.TOTAL_POINTS', parseInt(filters.points.maxTotal));
  }
  if (filters.points?.minClaimed) {
    query = query.gte('customer_points.CLAIMED_POINTS', parseInt(filters.points.minClaimed));
  }
  if (filters.points?.maxClaimed) {
    query = query.lte('customer_points.CLAIMED_POINTS', parseInt(filters.points.maxClaimed));
  }
  if (filters.points?.minUnclaimed) {
    query = query.gte('customer_points.UNCLAIMED_POINTS', parseInt(filters.points.minUnclaimed));
  }
  if (filters.points?.maxUnclaimed) {
    query = query.lte('customer_points.UNCLAIMED_POINTS', parseInt(filters.points.maxUnclaimed));
  }

  // Apply claim status filters
  if (filters.claimStatus?.hasClaimed) {
    query = query.gt('customer_points.CLAIMED_POINTS', 0);
  }
  if (filters.claimStatus?.hasEligibleClaims) {
    query = query.gte('customer_points.UNCLAIMED_POINTS', 10);
  }

  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;
  
  query = query
    .range(startIndex, endIndex)
    .order('CUSTOMER CODE', { ascending: true });

  return query;
}

/**
 * Get total count of customers (optimized)
 * @returns {Promise<number>} Total count
 */
export async function getCustomerCount() {
  const { count, error } = await supabase
    .from('sales_records')
    .select('*', { count: 'exact', head: true });
    
  if (error) throw error;
  return count || 0;
}

/**
 * Get count of eligible customers (with 10+ unclaimed points)
 * @returns {Promise<number>} Eligible count
 */
export async function getEligibleCustomerCount() {
  const { count, error } = await supabase
    .from('customer_points')
    .select('*', { count: 'exact', head: true })
    .gte('UNCLAIMED_POINTS', 10);
    
  if (error) throw error;
  return count || 0;
}

/**
 * Transform raw customer data to application format
 * @param {Array} customers - Raw customer data from Supabase
 * @returns {Array} Transformed customer data
 */
export function transformCustomerData(customers) {
  return customers?.map(customer => ({
    code: customer['CUSTOMER CODE'],
    name: customer['NAME1 & 2'],
    houseName: customer['HOUSE NAME'],
    street: customer['STREET'],
    place: customer['PLACE'],
    pinCode: customer['PIN CODE'],
    phone: customer['PHONE'],
    mobile: customer['MOBILE'],
    netWeight: customer['NET WEIGHT'],
    lastSalesDate: customer['LAST SALES DATE'],
    total: customer.customer_points?.TOTAL_POINTS ?? 0,
    claimed: customer.customer_points?.CLAIMED_POINTS ?? 0,
    unclaimed: customer.customer_points?.UNCLAIMED_POINTS ?? 0,
  })) || [];
}

/**
 * Optimized customer search with server-side filtering and pagination
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results with data and metadata
 */
export async function searchCustomers(options) {
  try {
    // Build and execute the main query
    const query = buildCustomerQuery(options);
    const { data: customers, error } = await query;
    
    if (error) throw error;

    // Get total count and eligible count in parallel
    const [totalCount, eligibleCount] = await Promise.all([
      getCustomerCount(),
      getEligibleCustomerCount()
    ]);

    // Transform the data
    const transformedData = transformCustomerData(customers);

    return {
      data: transformedData,
      totalCount,
      eligibleCount,
      totalPages: Math.ceil(totalCount / options.limit)
    };
  } catch (error) {
    console.error('Error searching customers:', error);
    throw error;
  }
}