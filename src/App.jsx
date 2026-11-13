import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPage from './pages/public/LandingPage';
import AuthPage from './pages/public/AuthPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import LoanApplicationWizard from './pages/customer/LoanApplicationWizard';
import ApplicationDetailsPage from './pages/customer/ApplicationDetailsPage';
import ApplicationTrackingPage from './pages/customer/ApplicationTrackingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplicationWorkspace from './pages/admin/AdminApplicationWorkspace';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-brand-bg text-brand-ink flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />

              {/* Customer Portal (Protected: Authenticated Users) */}
              <Route
                path="/customer/dashboard"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/apply"
                element={
                  <ProtectedRoute>
                    <LoanApplicationWizard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/applications/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/applications/:id/tracking"
                element={
                  <ProtectedRoute>
                    <ApplicationTrackingPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin / Underwriter Portal (Protected: Staff Only) */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requireStaff>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/applications"
                element={
                  <ProtectedRoute requireStaff>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/applications/:id"
                element={
                  <ProtectedRoute requireStaff>
                    <AdminApplicationWorkspace />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
