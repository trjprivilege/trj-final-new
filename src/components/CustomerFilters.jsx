import React, { useMemo, useState } from 'react';
import { Search, Filter, Calendar, SlidersHorizontal, X } from 'lucide-react';

const pointFieldLabels = [
  ['minTotal', 'Min Total'],
  ['maxTotal', 'Max Total'],
  ['minClaimed', 'Min Claimed'],
  ['maxClaimed', 'Max Claimed'],
  ['minUnclaimed', 'Min Unclaimed'],
  ['maxUnclaimed', 'Max Unclaimed']
];

export default function CustomerFilters({
  query,
  setQuery,
  filters,
  handleFilterChange,
  clearFilters,
  isFilterPanelOpen,
  setIsFilterPanelOpen
}) {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  const formatDate = (iso) => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return iso;
    return `${day}/${month}/${year}`;
  };

  const getPastDateIso = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getTodayIso = () => new Date().toISOString().split('T')[0];

  const getYesterdayIso = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  };

  const getWeekRange = (offsetWeeks = 0) => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset + (offsetWeeks * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    };
  };

  const setDatePreset = (days) => {
    handleFilterChange('dateRange', 'startDate', getPastDateIso(days));
    handleFilterChange('dateRange', 'endDate', todayIso);
  };

  const setTodayPreset = () => {
    const today = getTodayIso();
    handleFilterChange('dateRange', 'startDate', today);
    handleFilterChange('dateRange', 'endDate', today);
  };

  const setYesterdayPreset = () => {
    const yesterday = getYesterdayIso();
    handleFilterChange('dateRange', 'startDate', yesterday);
    handleFilterChange('dateRange', 'endDate', yesterday);
  };

  const setThisWeekPreset = () => {
    const range = getWeekRange(0);
    handleFilterChange('dateRange', 'startDate', range.startDate);
    handleFilterChange('dateRange', 'endDate', range.endDate);
  };

  const setLastWeekPreset = () => {
    const range = getWeekRange(-1);
    handleFilterChange('dateRange', 'startDate', range.startDate);
    handleFilterChange('dateRange', 'endDate', range.endDate);
  };

  const clearSingleFilter = (category, field, defaultValue = '') => {
    handleFilterChange(category, field, defaultValue);
  };

  const activeChips = [];

  if (query.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: ${query.trim()}`,
      onRemove: () => setQuery('')
    });
  }

  if (filters.dateRange.startDate || filters.dateRange.endDate) {
    activeChips.push({
      key: 'date-range',
      label: `Date: ${formatDate(filters.dateRange.startDate) || 'Any'} - ${formatDate(filters.dateRange.endDate) || 'Any'}`,
      onRemove: () => {
        clearSingleFilter('dateRange', 'startDate', '');
        clearSingleFilter('dateRange', 'endDate', '');
      }
    });
  }

  pointFieldLabels.forEach(([field, label]) => {
    const value = filters.points[field];
    if (value !== '' && value !== null && value !== undefined) {
      activeChips.push({
        key: field,
        label: `${label}: ${value}`,
        onRemove: () => clearSingleFilter('points', field, '')
      });
    }
  });

  if (filters.claimStatus.hasClaimed) {
    activeChips.push({
      key: 'has-claimed',
      label: 'Has made a claim',
      onRemove: () => clearSingleFilter('claimStatus', 'hasClaimed', false)
    });
  }

  if (filters.claimStatus.hasEligibleClaims) {
    activeChips.push({
      key: 'eligible-claims',
      label: 'Eligible claims >= 5',
      onRemove: () => clearSingleFilter('claimStatus', 'hasEligibleClaims', false)
    });
  }

  const activeFilterCount = activeChips.length;
  const hasActiveFiltersOrSearch = activeFilterCount > 0;

  return (
    <div className="mb-6 flex flex-col space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="relative w-full lg:max-w-2xl">
          <input
            type="text"
            placeholder="Search by code, name or mobile..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 border border-sky-200 rounded-xl bg-gradient-to-r from-sky-50 via-white to-cyan-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute top-1/2 left-3.5 transform -translate-y-1/2 text-gray-400" size={18} />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 border border-blue-200"
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs rounded-full bg-blue-600 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={clearFilters}
            disabled={!hasActiveFiltersOrSearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-700 rounded-xl hover:from-rose-100 hover:to-orange-100 border border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={16} />
            Clear All
          </button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Active Filters</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="text-blue-500 hover:text-blue-700"
                aria-label={`Remove ${chip.label}`}
                title={`Remove ${chip.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isFilterPanelOpen
            ? 'max-h-[1400px] opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-2 pointer-events-none'
        }`}
        aria-hidden={!isFilterPanelOpen}
      >
        <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-100 space-y-5 transform transition-transform duration-300 ease-out shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-cyan-700" />
                <h4 className="text-sm font-semibold text-gray-800">Date Range</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-start-date">Start Date</label>
                  <input
                    id="filter-start-date"
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => handleFilterChange('dateRange', 'startDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-end-date">End Date</label>
                  <input
                    id="filter-end-date"
                    type="date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => handleFilterChange('dateRange', 'endDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={setTodayPreset}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setYesterdayPreset}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={setThisWeekPreset}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={setLastWeekPreset}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  Last Week
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(30)}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(90)}
                  className="px-2.5 py-1 text-xs rounded-full border border-cyan-200 bg-cyan-100/70 hover:bg-cyan-100 text-cyan-800"
                >
                  Last 90 Days
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-emerald-700" />
                <h4 className="text-sm font-semibold text-gray-800">Claim Status</h4>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.claimStatus.hasClaimed}
                    onChange={(e) => handleFilterChange('claimStatus', 'hasClaimed', e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Has made at least one claim</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.claimStatus.hasEligibleClaims}
                    onChange={(e) => handleFilterChange('claimStatus', 'hasEligibleClaims', e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Has eligible claims ({'>='}5 points)</span>
                </label>
              </div>

              <div className="text-xs rounded-lg border border-emerald-200 bg-emerald-100/70 text-emerald-800 p-2.5">
                Claims must be in multiples of 5 points. Minimum eligibility is 5 points.
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 space-y-3 shadow-sm">
              <div className="w-full flex items-center text-sm font-semibold text-gray-800">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-amber-700" />
                  Advanced Points Range
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-min-total">Min Total</label>
                  <input
                    id="filter-min-total"
                    type="number"
                    min="0"
                    value={filters.points.minTotal}
                    onChange={(e) => handleFilterChange('points', 'minTotal', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-max-total">Max Total</label>
                  <input
                    id="filter-max-total"
                    type="number"
                    min="0"
                    value={filters.points.maxTotal}
                    onChange={(e) => handleFilterChange('points', 'maxTotal', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-min-claimed">Min Claimed</label>
                  <input
                    id="filter-min-claimed"
                    type="number"
                    min="0"
                    value={filters.points.minClaimed}
                    onChange={(e) => handleFilterChange('points', 'minClaimed', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-max-claimed">Max Claimed</label>
                  <input
                    id="filter-max-claimed"
                    type="number"
                    min="0"
                    value={filters.points.maxClaimed}
                    onChange={(e) => handleFilterChange('points', 'maxClaimed', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-min-unclaimed">Min Unclaimed</label>
                  <input
                    id="filter-min-unclaimed"
                    type="number"
                    min="0"
                    value={filters.points.minUnclaimed}
                    onChange={(e) => handleFilterChange('points', 'minUnclaimed', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="filter-max-unclaimed">Max Unclaimed</label>
                  <input
                    id="filter-max-unclaimed"
                    type="number"
                    min="0"
                    value={filters.points.maxUnclaimed}
                    onChange={(e) => handleFilterChange('points', 'maxUnclaimed', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
