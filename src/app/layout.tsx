'use client';

import React, { useState } from 'react';
import DealDashboard from './deal-dashboard';
import GmailImportTester from './gmail-import-tester';

enum ViewMode {
  Dashboard = 'dashboard',
  GmailImport = 'gmail-import',
}

export default function AppLayout() {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.Dashboard);

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Deals Admin</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentView(ViewMode.Dashboard)}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              currentView === ViewMode.Dashboard
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentView(ViewMode.GmailImport)}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              currentView === ViewMode.GmailImport
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Gmail Import
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {currentView === ViewMode.Dashboard ? (
          <DealDashboard />
        ) : (
          <GmailImportTester />
        )}
      </div>
    </div>
  );
}