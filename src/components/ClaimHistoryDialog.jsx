import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { X, History, Calendar, Award, Clock, TrendingUp, AlertCircle } from 'lucide-react';

export default function ClaimHistoryDialog({ customer, isOpen, onClose }) {
  const [claimHistory, setClaimHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalClaims: 0,
    totalPointsClaimed: 0,
    firstClaimDate: null,
    lastClaimDate: null
  });

  useEffect(() => {
    if (isOpen && customer) {
      loadClaimHistory();
    }
  }, [isOpen, customer]);

  const loadClaimHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load claim history for the specific customer
      const { data: historyData, error: historyError } = await supabase
        .from('claim_history')
        .select('*')
        .eq('CUSTOMER CODE', customer.code)
        .order('claimed_at', { ascending: false });

      if (historyError) throw historyError;

      setClaimHistory(historyData || []);

      // Calculate statistics
      if (historyData && historyData.length > 0) {
        const totalClaims = historyData.length;
        const totalPointsClaimed = historyData.reduce((sum, claim) => sum + (claim.points_claimed || 0), 0);
        const firstClaimDate = historyData[historyData.length - 1].claimed_at;
        const lastClaimDate = historyData[0].claimed_at;

        setStats({
          totalClaims,
          totalPointsClaimed,
          firstClaimDate,
          lastClaimDate
        });
      } else {
        setStats({
          totalClaims: 0,
          totalPointsClaimed: 0,
          firstClaimDate: null,
          lastClaimDate: null
        });
      }

    } catch (error) {
      console.error('Error loading claim history:', error);
      setError('Failed to load claim history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 30) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return formatDate(dateString);
      }
    } catch (error) {
      return formatDate(dateString);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Claim History</h2>
              <p className="text-sm text-gray-600">
                {customer.name} ({customer.code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Claims</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalClaims}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Points Claimed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalPointsClaimed}</p>
                </div>
                <Award className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Available</p>
                  <p className="text-2xl font-bold text-purple-600">{customer.unclaimed || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Last Claim</p>
                  <p className="text-sm font-bold text-gray-700">
                    {stats.lastClaimDate ? formatRelativeTime(stats.lastClaimDate) : 'Never'}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading claim history...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 mb-2">Failed to load claim history</p>
                <p className="text-sm text-gray-500">{error}</p>
                <button
                  onClick={loadClaimHistory}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : claimHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <History className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Claim History</h3>
              <p className="text-gray-500 mb-4">
                This customer hasn't made any point claims yet.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>Current Status:</strong><br />
                  • Total Points: {customer.total || 0}<br />
                  • Available for Claim: {customer.unclaimed || 0}<br />
                  • Minimum to Claim: 5 points
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Claim Transactions ({claimHistory.length})
                </h3>
                <div className="text-sm text-gray-500">
                  Showing all claim history
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                 
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Claimed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Ago
                      </th>
                  
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {claimHistory.map((claim, index) => (
                      <tr key={claim.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                       
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <Award className="w-4 h-4 mr-1" />
                            {claim.points_claimed} points
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(claim.claimed_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatRelativeTime(claim.claimed_at)}
                        </td>
                     
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {claimHistory.map((claim) => (
                  <div key={claim.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Award className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-600">{claim.points_claimed} points</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500">#{claim.id}</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(claim.claimed_at)}
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatRelativeTime(claim.claimed_at)}
                      </div>
                 
                    </div>
                  </div>
                ))}
              </div>

           
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}