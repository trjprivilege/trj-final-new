// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Key,
  Menu,
  X,
  CloudUpload,
  List as ListIcon,
  User,
} from 'lucide-react';

import UploadData from '../components/UploadData';
import CustomerDetails from '../components/CustomerDetails';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [view, setView] = useState('Customer List'); // Default to Customer List

  const profileMenuRef = useRef();
  const navigate = useNavigate();

  // Load current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Define your nav items
  const navItems = [
    { name: 'Upload Data', icon: <CloudUpload className="w-5 h-5" /> },
    { name: 'Customer List', icon: <ListIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header - for both desktop and mobile */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center justify-between px-4 py-3 w-full">
        <div className="flex items-center">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden mr-4 text-gray-600 hover:text-gray-800"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="lg:hidden font-bold text-blue-600 text-xl">TRJ</div>
          <h1 className="hidden lg:block text-xl font-semibold text-gray-800">{view}</h1>
        </div>
        
        {/* Profile Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center space-x-2 rounded-full bg-gray-100 p-2 hover:bg-gray-200"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              {initial}
            </div>
          </button>
          
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-40">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  setPwdModalOpen(true);
                  setProfileMenuOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Key className="w-4 h-4 mr-2" /> Change Password
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop only */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="px-6 py-6">
            <h1 className="text-2xl font-bold text-blue-600">TRJ Dashboard</h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setView(item.name)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  view === item.name
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span className="ml-3 font-medium">{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75" 
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="fixed z-40 inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-blue-600">TRJ Dashboard</h1>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 px-4 py-4 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setView(item.name);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg text-left ${
                      view === item.name
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3 font-medium">{item.name}</span>
                  </button>
                ))}
              </nav>
              <div className="p-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => {
                    setPwdModalOpen(true);
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
                >
                  <Key className="w-4 h-4 mr-2" /> Change Password
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 bg-gray-50 rounded-md hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {view === 'Upload Data' ? <UploadData /> : <CustomerDetails />}
        </main>
      </div>

      {/* Change Password Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ChangePasswordForm onClose={() => setPwdModalOpen(false)} user={user} />
        </div>
      )}
    </div>
  );
}

// Improved ChangePasswordForm component
function ChangePasswordForm({ onClose, user }) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPwd.length < 6) return setError('New password must be ≥ 6 chars');
    if (newPwd !== confirmPwd) return setError('Passwords do not match');

    setLoading(true);
    // reauthenticate
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPwd,
    });
    if (signInErr) {
      setLoading(false);
      return setError('Incorrect current password');
    }
    // update
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (updateErr) return setError(updateErr.message);
    onClose();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4 animate-fadeIn"
    >
      <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div>
        <label htmlFor="current-pwd" className="block text-sm font-medium text-gray-700 mb-1">
          Current Password
        </label>
        <input
          id="current-pwd"
          type="password"
          value={oldPwd}
          onChange={(e) => setOldPwd(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 mb-1">
          New Password (min 6 characters)
        </label>
        <input
          id="new-pwd"
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          required
          minLength={6}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          id="confirm-pwd"
          type="password"
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-24"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            'Update'
          )}
        </button>
      </div>
    </form>
  );
}