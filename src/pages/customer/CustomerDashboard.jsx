import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/common/StatusBadge';
import { formatINR } from '../../data/mockData';
import { ArrowRight, FilePlus, Clock, CheckCircle2, AlertTriangle, ChevronRight, FileText } from 'lucide-react';

export default function CustomerDashboard() {
  const { applications, currentUser } = useApp();

  // Filter applications that belong to the logged-in customer or general test cases
  const customerApps = applications;

  const activeApp = customerApps.find(a => a.status === 'under_review' || a.status === 'processing' || a.status === 'submitted') || customerApps[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-border">
        <div>
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
            Applicant Workspace
          </span>
          <h1 className="font-display font-bold text-2xl text-brand-ink mt-0.5">
            Welcome, {currentUser.name}
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Track your mortgage underwriting progress, verify uploaded documents, and review loan sanction letters.
          </p>
        </div>

        <Link
          to="/customer/apply"
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-sm self-start sm:self-auto"
        >
          <FilePlus className="w-4 h-4" />
          <span>Apply for New Loan</span>
        </Link>
      </div>

      {/* Active Application Highlight Banner */}
      {activeApp && (
        <div className="bg-white border border-brand-border rounded p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-brand-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500">{activeApp.id}</span>
                <StatusBadge status={activeApp.status} />
                <span className="text-xs text-brand-muted">• Submitted on {new Date(activeApp.submissionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <h2 className="font-display font-bold text-xl text-brand-ink">
                {activeApp.loanTypeLabel}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/customer/applications/${activeApp.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-brand-ink bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <span>View Offer & Ratios</span>
              </Link>
              <Link
                to={`/customer/applications/${activeApp.id}/tracking`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover transition-colors"
              >
                <span>Track Progress</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
            <div>
              <span className="text-brand-muted block">Requested Amount</span>
              <span className="font-display font-bold text-base text-brand-ink mt-0.5 block">
                {formatINR(activeApp.loanAmountRequested)}
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Estimated EMI</span>
              <span className="font-display font-bold text-base text-brand-ink mt-0.5 block">
                {formatINR(activeApp.estimatedMonthlyEMI)} / mo
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Max Permissible FOIR</span>
              <span className="font-display font-bold text-base text-brand-ink mt-0.5 block">
                {activeApp.calculatedFOIR}% <span className="text-[11px] font-normal text-brand-muted">(Limit 55%)</span>
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Documents Verified</span>
              <span className="font-display font-bold text-base text-emerald-700 mt-0.5 block">
                {activeApp.documents.filter(d => d.status === 'verified').length} of {activeApp.documents.length} verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Structured Applications Table */}
      <div className="bg-white border border-brand-border rounded overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-brand-ink">
            Application History
          </h3>
          <span className="text-xs text-brand-muted">
            {customerApps.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-brand-border text-slate-700 font-semibold">
              <tr>
                <th className="px-6 py-3">Reference No.</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Requested Loan</th>
                <th className="px-6 py-3">Collateral Valuation</th>
                <th className="px-6 py-3">Calculated LTV</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-borderSubtle">
              {customerApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-medium text-brand-ink">
                    {app.id}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-brand-ink">
                    {app.loanTypeLabel}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-brand-ink">
                    {formatINR(app.loanAmountRequested)}
                  </td>
                  <td className="px-6 py-3.5 text-brand-muted">
                    {formatINR(app.estimatedMarketValue)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-medium text-brand-ink">{app.calculatedLTV}%</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-2">
                    <Link
                      to={`/customer/applications/${app.id}`}
                      className="text-brand-blue hover:underline font-semibold"
                    >
                      Offer
                    </Link>
                    <span className="text-slate-300">|</span>
                    <Link
                      to={`/customer/applications/${app.id}/tracking`}
                      className="text-brand-muted hover:text-brand-ink font-medium"
                    >
                      Timeline
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helpful Underwriting Guidance Note */}
      <div className="bg-brand-bg border border-brand-border rounded p-4 text-xs text-brand-muted flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-brand-ink">How NIRNAY assesses your loan:</strong> Upon submitting your application and uploading mandatory income and property records, our underwriting engine cross-checks KYC with DigiLocker, pulls credit bureau data, verifies FOIR & LTV against statutory guidelines, and alerts human underwriters if an exception requires review.
        </div>
      </div>
    </div>
  );
}

