import React from 'react';
import { Search, Filter, Calendar, Sliders, X } from 'lucide-react';

export default function CustomerFilters({ 
  query, 
  setQuery, 
  filters, 
  handleFilterChange, 
  clearFilters, 
  isFilterPanelOpen, 
  setIsFilterPanelOpen 
}) {
  return (
    <div className="mb-6 flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search by code, name or mobile..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
          >
            <Filter size={16} />
            {isFilterPanelOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
            Clear All
          </button>
        </div>
      </div>
      
      {/* Advanced Filter Panel */}
      {isFilterPanelOpen && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range Filters */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Date Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => handleFilterChange('dateRange', 'startDate', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => handleFilterChange('dateRange', 'endDate', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Points Filters */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Points Range</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Total</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.minTotal}
                    onChange={(e) => handleFilterChange('points', 'minTotal', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Total</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.maxTotal}
                    onChange={(e) => handleFilterChange('points', 'maxTotal', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Claimed</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.minClaimed}
                    onChange={(e) => handleFilterChange('points', 'minClaimed', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Claimed</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.maxClaimed}
                    onChange={(e) => handleFilterChange('points', 'maxClaimed', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Min Unclaimed</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.minUnclaimed}
                    onChange={(e) => handleFilterChange('points', 'minUnclaimed', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Unclaimed</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.points.maxUnclaimed}
                    onChange={(e) => handleFilterChange('points', 'maxUnclaimed', e.target.value)}
                    className="w-full p-2 text-sm border rounded"
                  />
                </div>
              </div>
            </div>
            
            {/* Claim Status Filters */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Claim Status</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.claimStatus.hasClaimed}
                    onChange={(e) => handleFilterChange('claimStatus', 'hasClaimed', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Has made at least one claim</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.claimStatus.hasEligibleClaims}
                    onChange={(e) => handleFilterChange('claimStatus', 'hasEligibleClaims', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Has eligible claims (≥10 points)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}