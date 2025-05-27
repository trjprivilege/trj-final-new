// src/components/Customers.jsx
import React from 'react';
import { Edit, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function Customers({ customers, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-500">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
        <p className="text-lg text-gray-500">No customers found</p>
        <p className="text-sm text-gray-400 mt-1">Try clearing your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claimed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unclaimed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.place}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.mobile}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.total_points}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.claimed_points}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {customer.unclaimed_points}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge customer={customer} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-800 flex items-center">
                    <Edit className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <div className="space-y-3 p-4">
          {customers.map((customer) => (
            <div key={customer.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-base font-semibold">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.code}</p>
                </div>
                <StatusBadge customer={customer} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500">Place</p>
                  <p className="font-medium">{customer.place}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mobile</p>
                  <p className="font-medium">{customer.mobile}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Points</p>
                  <p className="font-medium">{customer.total_points}</p>
                </div>
                <div>
                  <p className="text-gray-500">Claimed</p>
                  <p className="font-medium">{customer.claimed_points}</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="flex items-center text-blue-600 text-sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ customer }) {
  let Icon, bgColor, textColor, text;
  
  if (!customer.eligible) {
    Icon = AlertCircle;
    bgColor = 'bg-red-100';
    textColor = 'text-red-800';
    text = 'Not Eligible';
  } else if (customer.claimed_points > 0) {
    Icon = CheckCircle;
    bgColor = 'bg-green-100';
    textColor = 'text-green-800';
    text = 'Claimed';
  } else {
    Icon = Clock;
    bgColor = 'bg-blue-100';
    textColor = 'text-blue-800';
    text = 'Eligible';
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      <Icon className="h-3 w-3 mr-1" />
      {text}
    </span>
  );
}