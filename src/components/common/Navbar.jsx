import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import EligibilityCalculatorModal from './EligibilityCalculatorModal';
import { ShieldCheck, UserCheck, Briefcase, Menu, X, ArrowRight, ExternalLink, Calculator, LogOut, LogIn } from 'lucide-react';

export default function Navbar() {
  const { currentRole, currentUser, logout, applications } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  const isCustomer = currentRole === 'applicant';
  const isStaff = currentRole === 'bank_admin';
  const pendingUnderwriterCount = applications.filter(a => a.status === 'under_review').length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-brand-border">
      {/* Top institutional status banner */}
      <div className="bg-brand-ink text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide uppercase text-[10px] bg-brand-blue px-2 py-0.5 rounded text-white">
            Hero Housing Finance
          </span>
          <span className="text-slate-300 hidden sm:inline">
            Automated Mortgage Underwriting Platform &bull; RBI & DPDP Institutional Framework
          </span>
        </div>
        
        {/* Active Account Identity Pill */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-slate-800 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-medium text-white">{currentUser.name}</span>
              <span className="text-slate-400 text-[11px]">
                ({isStaff ? 'Staff Underwriter' : 'Borrower'})
              </span>
              <button
                onClick={handleLogout}
                className="ml-1 text-slate-400 hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white font-medium transition-colors"
              >
                Sign In
              </Link>
              <span className="text-slate-500">&bull;</span>
              <Link
                to="/register"
                className="text-brand-blue-light hover:text-white font-medium transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded bg-brand-ink text-white flex items-center justify-center font-display font-bold text-sm tracking-wider group-hover:bg-brand-blue transition-colors">
                N
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-lg text-brand-ink leading-tight">
                  NIRNAY
                </span>
                <span className="text-[10px] text-brand-muted uppercase tracking-wider font-medium">
                  Mortgage Intelligence
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded transition-colors ${
                  location.pathname === '/' ? 'text-brand-blue font-semibold' : 'text-brand-muted hover:text-brand-ink'
                }`}
              >
                Overview
              </Link>

              {currentUser && (
                isStaff ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={`px-3 py-1.5 rounded transition-colors ${
                        location.pathname === '/admin/dashboard' ? 'text-brand-blue font-semibold' : 'text-brand-muted hover:text-brand-ink'
                      }`}
                    >
                      Underwriting Queue
                      {pendingUnderwriterCount > 0 && (
                        <span className="ml-1.5 bg-amber-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {pendingUnderwriterCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/admin/applications"
                      className={`px-3 py-1.5 rounded transition-colors ${
                        location.pathname === '/admin/applications' ? 'text-brand-blue font-semibold' : 'text-brand-muted hover:text-brand-ink'
                      }`}
                    >
                      All Dossiers
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/customer/dashboard"
                      className={`px-3 py-1.5 rounded transition-colors ${
                        location.pathname === '/customer/dashboard' ? 'text-brand-blue font-semibold' : 'text-brand-muted hover:text-brand-ink'
                      }`}
                    >
                      My Applications
                    </Link>
                    <Link
                      to="/customer/apply"
                      className={`px-3 py-1.5 rounded transition-colors ${
                        location.pathname === '/customer/apply' ? 'text-brand-blue font-semibold' : 'text-brand-muted hover:text-brand-ink'
                      }`}
                    >
                      New Loan Application
                    </Link>
                  </>
                )
              )}
            </nav>
          </div>

          {/* User profile & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCalcOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-brand-ink bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-brand-blue" />
              <span>EMI Calculator</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-brand-border">
                <div className="text-right">
                  <div className="text-xs font-semibold text-brand-ink">{currentUser.name}</div>
                  <div className="text-[11px] text-brand-muted">
                    {currentUser.designation || (isStaff ? 'Credit Underwriter' : 'Mortgage Applicant')}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-blue-light text-brand-blue border border-blue-200 flex items-center justify-center font-bold text-xs">
                  {currentUser.avatarInitials}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded text-xs font-medium text-brand-ink border border-brand-border hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-xs"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-brand-muted hover:text-brand-ink"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-border bg-white px-4 pt-3 pb-4 space-y-2">
          {currentUser ? (
            <div className="text-xs font-medium text-brand-muted pb-2 border-b border-brand-border flex items-center justify-between">
              <div>
                Logged in: <strong className="text-brand-ink">{currentUser.name}</strong> ({isStaff ? 'Staff' : 'Borrower'})
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-brand-border">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-xs font-medium border border-brand-border rounded"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-xs font-semibold bg-brand-blue text-white rounded"
              >
                Register
              </Link>
            </div>
          )}

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-sm text-brand-ink hover:bg-brand-bg rounded"
          >
            Product Overview
          </Link>

          {currentUser && (
            isStaff ? (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-brand-ink hover:bg-brand-bg rounded"
                >
                  Underwriting Queue
                </Link>
                <Link
                  to="/admin/applications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-brand-ink hover:bg-brand-bg rounded"
                >
                  All Applications
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm text-brand-ink hover:bg-brand-bg rounded"
                >
                  My Dashboard
                </Link>
                <Link
                  to="/customer/apply"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-bg rounded"
                >
                  Start Loan Application
                </Link>
              </>
            )
          )}
        </div>
      )}

      {/* Calculator Modal */}
      <EligibilityCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />
    </header>
  );
}
