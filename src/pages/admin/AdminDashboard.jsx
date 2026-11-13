import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/common/StatusBadge';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { formatINR } from '../../data/mockData';
import {
  Search,
  Filter,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminDashboard() {
  const { applications, currentUser } = useApp();
  const [searchParams] = useSearchParams();
  const filterQuery = searchParams.get('filter');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterQuery === 'refer' ? 'under_review' : 'all');
  const [productFilter, setProductFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortField, setSortField] = useState('submissionDate');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // KPI Calculations
  const totalApps = applications.length;
  const pendingReview = applications.filter(a => a.status === 'under_review').length;
  const fraudFlagged = applications.filter(a => a.fraudAlerts && a.fraudAlerts.length > 0).length;
  const sanctioned = applications.filter(a => a.status === 'approved').length;

  // Filter & Sort Logic (TanStack Table inspired)
  const filteredApps = applications
    .filter(app => {
      const matchesSearch =
        app.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.panNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesProduct = productFilter === 'all' || app.loanType === productFilter;
      const matchesRisk = riskFilter === 'all' || app.riskCategory === riskFilter;
      const matchesAnomaly = filterQuery === 'anomalies' ? (app.fraudAlerts && app.fraudAlerts.length > 0) : true;
      return matchesSearch && matchesStatus && matchesProduct && matchesRisk && matchesAnomaly;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'submissionDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Linear-style Collapsible Sidebar */}
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Underwriting Workplace Area */}
      <div className="flex-1 overflow-x-hidden p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Workspace Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Hero Housing Underwriting Desk
              </span>
              <span className="text-xs text-brand-muted">
                • {currentUser.designation || 'Credit Underwriter'}
              </span>
            </div>
            <h1 className="font-display font-bold text-2xl text-brand-ink mt-1">
              Active Mortgage Dossier Queue
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              Review algorithmic assessment outcomes, inspect OCR verifications, and sign off credit decisions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-brand-border text-brand-muted shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-success" />
              <span>NHB & RBI Lending Policy Aligned</span>
            </span>
          </div>
        </div>

        {/* High-Impact KPI Tiles (Stripe / Mercury density) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-brand-border rounded p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-brand-muted">
              <span>Total Dossiers</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="font-display font-bold text-2xl text-brand-ink mt-1">
              {totalApps}
            </div>
            <span className="text-[11px] text-brand-muted mt-0.5 block">Total ingested cases</span>
          </div>

          <div className="bg-white border border-brand-border rounded p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
              <span>Pending Review (REFER)</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="font-display font-bold text-2xl text-amber-700 mt-1">
              {pendingReview}
            </div>
            <span className="text-[11px] text-amber-800 mt-0.5 block">Awaiting underwriter sign-off</span>
          </div>

          <div className="bg-white border border-brand-border rounded p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-red-800 font-semibold">
              <span>Anomalies & Discrepancies</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="font-display font-bold text-2xl text-red-700 mt-1">
              {fraudFlagged}
            </div>
            <span className="text-[11px] text-red-800 mt-0.5 block">Income or title alerts flagged</span>
          </div>

          <div className="bg-white border border-brand-border rounded p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>Sanctioned</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-display font-bold text-2xl text-emerald-700 mt-1">
              {sanctioned}
            </div>
            <span className="text-[11px] text-emerald-800 mt-0.5 block">Approved with terms</span>
          </div>
        </div>

        {/* Search & Multi-Filter Control Toolbar (TanStack / Linear inspired) */}
        <div className="bg-white border border-brand-border rounded p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-2xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by applicant, ID, or PAN..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-brand-border rounded focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-1.5 border border-brand-border rounded bg-white text-brand-ink focus:ring-1 focus:ring-brand-blue"
            >
              <option value="all">All Products</option>
              <option value="home_loan">Home Loan</option>
              <option value="lap">Loan Against Property</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-brand-border rounded bg-white text-brand-ink focus:ring-1 focus:ring-brand-blue"
            >
              <option value="all">All Statuses</option>
              <option value="under_review">Under Review (REFER)</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 border border-brand-border rounded bg-white text-brand-ink focus:ring-1 focus:ring-brand-blue"
            >
              <option value="all">All Risk Tiers</option>
              <option value="low">Low Risk</option>
              <option value="medium">Moderate Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
        </div>

        {/* High-Density Pipeline Table (TanStack Table & Linear inspired) */}
        <div className="bg-white border border-brand-border rounded overflow-hidden shadow-2xs">
          <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-display font-bold text-sm text-brand-ink">
              Application Registry
            </h2>
            <span className="text-xs text-brand-muted">
              Displaying {filteredApps.length} of {applications.length} loan dossiers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-brand-border text-slate-700 font-semibold select-none">
                <tr>
                  <th
                    onClick={() => toggleSort('id')}
                    className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Dossier Reference</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('applicantName')}
                    className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Applicant Profile</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-5 py-3">Product</th>
                  <th
                    onClick={() => toggleSort('loanAmountRequested')}
                    className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Requested Loan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('calculatedFOIR')}
                    className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>FOIR / LTV Ratios</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('creditBureauScore')}
                    className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>CIBIL & ML Risk</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-5 py-3">Current Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-borderSubtle">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-xs text-brand-muted">
                      No loan applications match your active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const hasCriticalAlert = app.fraudAlerts?.some(
                      f => f.severity === 'critical' || f.severity === 'high'
                    );

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-brand-ink">{app.id}</div>
                          <div className="text-[11px] text-brand-muted">
                            {new Date(app.submissionDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-brand-ink">{app.applicantName}</div>
                          <div className="text-[11px] text-brand-muted truncate max-w-[170px]">
                            {app.employerName}
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-medium text-brand-ink">
                            {app.loanType === 'home_loan' ? 'Home Loan' : 'LAP'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-brand-ink">
                            {formatINR(app.loanAmountRequested)}
                          </div>
                          <div className="text-[11px] text-brand-muted">
                            {app.tenureMonthsRequested / 12} Yrs ({app.tenureMonthsRequested} Mos)
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-medium ${
                                app.calculatedFOIR <= 55 ? 'text-brand-ink' : 'text-amber-700 font-bold'
                              }`}
                            >
                              FOIR: {app.calculatedFOIR}%
                            </span>
                            <span className="text-slate-300">/</span>
                            <span
                              className={`font-medium ${
                                app.calculatedLTV <= 80 ? 'text-brand-ink' : 'text-red-700 font-bold'
                              }`}
                            >
                              LTV: {app.calculatedLTV}%
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-brand-ink">
                              {app.creditBureauScore}
                            </span>
                            <StatusBadge status={app.riskCategory} type="risk" />
                          </div>
                          {hasCriticalAlert && (
                            <div className="text-[10px] text-red-600 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>Anomaly Alert Flagged</span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <StatusBadge status={app.status} />
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/admin/applications/${app.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-2xs"
                          >
                            <span>Open Dossier</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
