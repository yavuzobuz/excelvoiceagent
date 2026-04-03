import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { ProfileSettings } from './pages/ProfileSettings';
import { FormulaLibrary } from './pages/FormulaLibrary';
import { MacroBuilder } from './pages/MacroBuilder';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/formulas" element={<FormulaLibrary />} />
          <Route path="/macro-builder" element={<MacroBuilder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
