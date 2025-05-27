// src/components/Toast.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', duration = 3000 }) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!isVisible) return null;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };
  
  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };
  
  const getTextColor = () => {
    switch (type) {
      case 'success': return 'text-green-800';
      case 'error': return 'text-red-800';
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      default: return 'text-blue-800';
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <div className={`flex items-center p-4 rounded-lg shadow-lg border ${getBgColor()} max-w-md`}>
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className={`flex-1 ${getTextColor()}`}>
          {message}
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}