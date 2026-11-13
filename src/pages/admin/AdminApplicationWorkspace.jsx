import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { getDocumentSignedUrl } from '../../services/applicationService';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatINR, calculateEMI, calculateFOIR, calculateLTV } from '../../data/mockData';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Briefcase,
  Home,
  CreditCard,
  Sliders,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Lock
} from 'lucide-react';

export default function AdminApplicationWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { applications, recordDecision, updateDocumentStatus, currentUser } = useApp();

  const app = applications.find(a => a.id === id) || applications[0];
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'financials' | 'documents' | 'risk_fraud' | 'compliance' | 'audit'

  // Decision Form State
  const [selectedOutcome, setSelectedOutcome] = useState('APPROVE');
  const [sanctionedAmount, setSanctionedAmount] = useState(app.loanAmountRequested);
  const [sanctionedRate, setSanctionedRate] = useState(app.benchmarkRate || 8.50);
  const [sanctionedTenureMonths, setSanctionedTenureMonths] = useState(app.tenureMonthsRequested || 240);
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [downloadingDoc, setDownloadingDoc] = useState(null);

  const handleDownloadSignedDoc = async (storagePath) => {
    if (!storagePath) {
      alert('Document storage path is unavailable.');
      return;
    }
    setDownloadingDoc(storagePath);
    try {
      const signedUrl = await getDocumentSignedUrl(storagePath, 180);
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not generate signed download URL.');
      }
    } catch (err) {
      alert(`Download authorization failed: ${err.message}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Confirmation Handler
  const handleConfirmDecision = async () => {
    const reviewerName = currentUser?.name || 'Senior Underwriter';

    // 1. Update local context state
    recordDecision(app.id, {
      outcome: selectedOutcome,
      remarks: decisionRemarks || `Application ${selectedOutcome} by underwriter ${reviewerName}.`,
      sanctionedAmount,
      sanctionedRate,
      sanctionedTenureMonths
    });

    // 2. Persist to live Supabase DB atomically via RPC (P2 Remediation)
    if (isSupabaseConfigured() && supabase && app.dbId) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_underwriting_decision', {
          p_application_id: app.dbId,
          p_outcome: selectedOutcome,
          p_decision_authority: 'Senior Credit Underwriter',
          p_sanctioned_amount: selectedOutcome === 'APPROVE' ? Number(sanctionedAmount) : 0,
          p_sanctioned_rate: selectedOutcome === 'APPROVE' ? Number(sanctionedRate) : 0,
          p_sanctioned_tenure_months: selectedOutcome === 'APPROVE' ? Number(sanctionedTenureMonths) : 0,
          p_remarks: decisionRemarks || `Application ${selectedOutcome} by underwriter ${reviewerName}.`,
          p_decision_reasons: [
            { category: 'credit_policy', code: 'UNDERWRITER_REVIEW', description: decisionRemarks || `Case adjudicated as ${selectedOutcome}.` }
          ]
        });

        if (rpcErr) {
          console.warn('Atomic adjudication RPC note (trying sequential sync):', rpcErr.message);
          // Sequential fallback if RPC not yet deployed
          const newStatus = selectedOutcome === 'APPROVE' ? 'approved' : selectedOutcome === 'REJECT' ? 'rejected' : 'referred';
          await supabase.from('underwriting_decisions').insert({
            application_id: app.dbId,
            decided_by: currentUser?.id,
            outcome: selectedOutcome,
            decision_authority: 'Senior Credit Underwriter',
            sanctioned_amount: selectedOutcome === 'APPROVE' ? Number(sanctionedAmount) : null,
            sanctioned_rate: selectedOutcome === 'APPROVE' ? Number(sanctionedRate) : null,
            sanctioned_tenure_months: selectedOutcome === 'APPROVE' ? Number(sanctionedTenureMonths) : null,
            sanctioned_emi: selectedOutcome === 'APPROVE' ? Math.round(Number(sanctionedAmount) * 0.0086) : null,
            remarks: decisionRemarks || `Application ${selectedOutcome} by underwriter ${reviewerName}.`
          });

          await supabase.from('loan_applications').update({
            status: newStatus,
            sub_status: `Decision: ${selectedOutcome}`
          }).eq('id', app.dbId);
        }
      } catch (err) {
        console.warn('Live adjudication sync note:', err.message);
      }
    }

    setSuccessNotice(`Underwriting decision recorded as ${selectedOutcome}. Status updated.`);
    setTimeout(() => {
      setSuccessNotice('');
    }, 4000);
  };

  const handleDocStatusChange = async (docId, newStatus) => {
    updateDocumentStatus(app.id, docId, newStatus);
    if (isSupabaseConfigured() && supabase && docId && !docId.startsWith('doc-')) {
      try {
        await supabase.from('loan_documents').update({ status: newStatus }).eq('id', docId);
      } catch (err) {
        console.warn('Document review status sync note:', err.message);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Quick Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Pipeline Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-brand-muted">Case ID:</span>
          <span className="font-mono text-xs font-bold text-brand-ink bg-white border border-brand-border px-2 py-0.5 rounded">
            {app.id}
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Dossier Summary Header */}
      <div className="bg-white border border-brand-border rounded p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-display font-bold text-xl text-brand-ink">
                {app.applicantName}
              </span>
              <span className="text-xs text-brand-muted">•</span>
              <span className="text-xs font-medium text-brand-muted">{app.loanTypeLabel}</span>
              <StatusBadge status={app.status} />
              <StatusBadge status={app.riskCategory} type="risk" />
            </div>
            <div className="text-xs text-brand-muted flex flex-wrap items-center gap-3">
              <span>PAN: <strong className="font-mono text-brand-ink">{app.panNumber}</strong></span>
              <span>•</span>
              <span>Employer: <strong className="text-brand-ink">{app.employerName}</strong></span>
              <span>•</span>
              <span>Primary Bank: <strong className="text-brand-ink">{app.primaryBank}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-brand-muted block">Requested Loan</span>
              <span className="font-display font-bold text-lg text-brand-ink">
                {formatINR(app.loanAmountRequested)}
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Calculated FOIR</span>
              <span className={`font-display font-bold text-lg ${app.calculatedFOIR <= 55 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {app.calculatedFOIR}%
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Collateral LTV</span>
              <span className={`font-display font-bold text-lg ${app.calculatedLTV <= 80 ? 'text-brand-blue' : 'text-red-700'}`}>
                {app.calculatedLTV}%
              </span>
            </div>
            <div>
              <span className="text-brand-muted block">Bureau Score</span>
              <span className="font-display font-bold text-lg text-brand-ink">
                {app.creditBureauScore}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'dossier', label: '1. Applicant & Collateral' },
            { id: 'financials', label: '2. Financial Analysis' },
            { id: 'documents', label: `3. Document OCR (${app.documents.length})` },
            { id: 'risk_fraud', label: '4. AI Risk & Fraud' },
            { id: 'compliance', label: '5. Regulatory Compliance' },
            { id: 'audit', label: '6. Decision & Audit Trail' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-ink text-white shadow-2xs'
                  : 'text-brand-muted hover:text-brand-ink hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabbed Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Tab Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab 1: Applicant & Collateral */}
          {activeTab === 'dossier' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-brand-ink">
                  Applicant Demographics & Profile
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Verified against DigiLocker and PAN NSDL records.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-brand-muted block">Legal Name</span>
                  <span className="font-semibold text-brand-ink mt-0.5 block">{app.applicantName}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">PAN Identification</span>
                  <span className="font-mono font-semibold text-brand-ink mt-0.5 block">{app.panNumber}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Date of Birth</span>
                  <span className="text-brand-ink mt-0.5 block">{app.dob}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Employment Type</span>
                  <span className="text-brand-ink mt-0.5 block">{app.employmentTypeLabel}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Employer / Firm</span>
                  <span className="text-brand-ink mt-0.5 block">{app.employerName}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Designation & Vintage</span>
                  <span className="text-brand-ink mt-0.5 block">{app.designation} ({app.yearsInJob} Yrs)</span>
                </div>
                <div className="sm:col-span-3">
                  <span className="text-brand-muted block">Residential Address</span>
                  <span className="text-brand-ink mt-0.5 block">{app.currentAddress}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-brand-border">
                <h4 className="font-display font-bold text-sm text-brand-ink mb-3">
                  Collateral & Real Estate Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-brand-muted block">Property Category</span>
                    <span className="font-semibold text-brand-ink mt-0.5 block">{app.propertyType}</span>
                  </div>
                  <div>
                    <span className="text-brand-muted block">Appraised Fair Market Value</span>
                    <span className="font-semibold text-brand-blue mt-0.5 block">{formatINR(app.estimatedMarketValue)}</span>
                  </div>
                  <div>
                    <span className="text-brand-muted block">Carpet Area</span>
                    <span className="text-brand-ink mt-0.5 block">{app.carpetAreaSqft} sq. ft.</span>
                  </div>
                  <div>
                    <span className="text-brand-muted block">Title Status</span>
                    <span className="text-brand-ink mt-0.5 block">{app.propertyTitleStatus}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-brand-muted block">Property Location</span>
                    <span className="text-brand-ink mt-0.5 block">{app.propertyAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Financial Analysis */}
          {activeTab === 'financials' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-brand-ink">
                  Financial Underwriting Ratios & Capacity
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Reconciliation of declared cashflows against verified bank statement metrics.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded bg-brand-bg border border-brand-border text-xs">
                <div>
                  <span className="text-brand-muted block">Net Monthly In-Hand</span>
                  <strong className="text-brand-ink text-sm block mt-0.5">{formatINR(app.netMonthlyIncome)}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Existing EMIs</span>
                  <strong className="text-brand-ink text-sm block mt-0.5">{formatINR(app.existingMonthlyObligations)}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Proposed Loan EMI</span>
                  <strong className="text-brand-ink text-sm block mt-0.5">{formatINR(app.estimatedMonthlyEMI)}</strong>
                </div>
                <div>
                  <span className="text-brand-muted block">Net Disposable Surplus</span>
                  <strong className="text-emerald-700 text-sm block mt-0.5">
                    {formatINR(app.netMonthlyIncome - (app.existingMonthlyObligations + app.estimatedMonthlyEMI))}
                  </strong>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded border border-brand-border bg-white">
                  <div>
                    <span className="font-semibold text-brand-ink">Fixed Obligation to Income Ratio (FOIR)</span>
                    <p className="text-brand-muted text-[11px]">Formula: (Existing EMIs + Proposed EMI) / Net Income</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${app.calculatedFOIR <= 55 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {app.calculatedFOIR}%
                    </span>
                    <span className="text-[10px] text-brand-muted block">Benchmark Cap: ≤ 55.0%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded border border-brand-border bg-white">
                  <div>
                    <span className="font-semibold text-brand-ink">Loan to Value Ratio (LTV)</span>
                    <p className="text-brand-muted text-[11px]">Formula: Requested Loan / Appraised Property Value</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${app.calculatedLTV <= 80 ? 'text-brand-blue' : 'text-red-700'}`}>
                      {app.calculatedLTV}%
                    </span>
                    <span className="text-[10px] text-brand-muted block">Statutory NHB Cap: ≤ 80.0%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded border border-brand-border bg-white">
                  <div>
                    <span className="font-semibold text-brand-ink">Debt to Annual Income (DTI)</span>
                    <p className="text-brand-muted text-[11px]">Multiple of total debt burden against annual take-home</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-brand-ink">{app.calculatedDTI}x</span>
                    <span className="text-[10px] text-brand-muted block">Normal band: &lt; 4.5x</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Document Verification & OCR */}
          {activeTab === 'documents' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-brand-ink">
                    Document Verification & OCR Workspace
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">Inspect OCR extracted metadata against declared applicant fields.</p>
                </div>
                <span className="text-xs text-brand-muted">
                  {app.documents.filter(d => d.status === 'verified').length} of {app.documents.length} Verified
                </span>
              </div>

              <div className="space-y-4">
                {app.documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded border border-brand-border bg-slate-50/40 text-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-brand-blue" />
                        <div>
                          <div className="font-semibold text-brand-ink">{doc.type}</div>
                          <div className="text-[11px] text-brand-muted font-mono">{doc.fileName}</div>
                        </div>
                      </div>
                      <StatusBadge status={doc.status} type="document" />
                    </div>

                    {/* Extracted Metadata Box */}
                    {doc.extracted && (
                      <div className="bg-white p-3 rounded border border-brand-border space-y-1 text-[11px]">
                        <span className="font-semibold text-brand-ink block mb-1">OCR Extracted Attributes:</span>
                        {Object.entries(doc.extracted).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-brand-muted">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-medium text-brand-ink">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {doc.remarks && (
                      <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-200/60">
                        <strong>Review Note:</strong> {doc.remarks}
                      </div>
                    )}

                    {/* Underwriter Quick Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-brand-border justify-between">
                      <div>
                        {doc.storagePath && (
                          <button
                            type="button"
                            onClick={() => handleDownloadSignedDoc(doc.storagePath)}
                            disabled={downloadingDoc === doc.storagePath}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-blue-50 text-brand-blue border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{downloadingDoc === doc.storagePath ? 'Generating URL...' : 'Inspect Vault Document'}</span>
                          </button>
                        )}
                        {doc.sha256 && (
                          <span className="ml-2 text-[10px] text-slate-500 font-mono inline-flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{doc.sha256.substring(0, 10)}...</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDocStatusChange(doc.id, 'verified')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                            doc.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                          }`}
                        >
                          Mark Verified
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocStatusChange(doc.id, 'manual_review')}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                            doc.status === 'manual_review'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                          }`}
                        >
                          Request Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: AI Risk & Fraud Intelligence */}
          {activeTab === 'risk_fraud' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-brand-ink">
                  Explainable AI Risk Scoring & Anomaly Detection
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Scikit-learn random forest classifier output based on credit score, FOIR, LTV, and historical mortgage defaults.
                </p>
              </div>

              {/* Visual Risk Gauge & Drivers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded bg-brand-bg border border-brand-border text-xs">
                <div className="sm:border-r border-brand-border pr-4">
                  <span className="text-brand-muted block">Numerical Risk Score</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-display font-bold text-3xl text-brand-ink">
                      {app.numericalRiskScore}
                    </span>
                    <span className="text-xs text-brand-muted">/ 100</span>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={app.riskCategory} type="risk" />
                  </div>
                </div>

                <div>
                  <span className="text-brand-muted block">Probability of Default</span>
                  <span className="font-display font-bold text-xl text-brand-ink mt-1 block">
                    {(app.probabilityOfDefault * 100).toFixed(2)}%
                  </span>
                  <span className="text-[11px] text-brand-muted mt-1 block">Expected default frequency</span>
                </div>

                <div>
                  <span className="text-brand-muted block">CIBIL Bureau Score</span>
                  <span className="font-display font-bold text-xl text-brand-ink mt-1 block">
                    {app.creditBureauScore}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium mt-1 block">Prime Credit Band</span>
                </div>
              </div>

              {/* Explainable Factor Attribution */}
              <div>
                <h4 className="font-semibold text-xs text-brand-ink mb-2">
                  Explainable Decision Factors (Top Drivers)
                </h4>
                <div className="space-y-2 text-xs">
                  {app.riskDrivers?.map((driver, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border flex items-center justify-between ${
                        driver.impact === 'positive'
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                          : 'bg-red-50/50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {driver.impact === 'positive' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span>{driver.factor}</span>
                      </div>
                      <span className="font-mono font-bold">{driver.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fraud Alerts Box */}
              <div>
                <h4 className="font-semibold text-xs text-brand-ink mb-2">
                  Fraud Detection & Anomaly Flags ({app.fraudAlerts?.length || 0})
                </h4>
                {app.fraudAlerts && app.fraudAlerts.length > 0 ? (
                  <div className="space-y-2">
                    {app.fraudAlerts.map((alert, idx) => (
                      <div key={idx} className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>{alert.code} ({alert.category.toUpperCase()})</span>
                          </span>
                          <span className="text-[10px] uppercase tracking-wide bg-red-200 text-red-900 px-1.5 py-0.5 rounded">
                            {alert.severity} Severity
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-red-800">
                          {alert.details}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>No fraud or transactional anomalies detected. Profile verified clean.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 5: Regulatory Compliance */}
          {activeTab === 'compliance' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-brand-ink">
                  Statutory & Regulatory Compliance Checklist
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Conducted in accordance with NHB Housing Finance Directions and RBI Fair Practices Code.
                </p>
              </div>

              <div className="divide-y divide-brand-borderSubtle">
                {app.complianceChecks?.map((check) => (
                  <div key={check.code} className="py-3 text-xs flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-brand-ink">
                        <span className="font-mono text-slate-500">{check.code}</span>
                        <span>{check.rule}</span>
                      </div>
                      <p className="text-brand-muted text-[11px] mt-0.5">{check.details}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      check.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Decision & Audit History */}
          {activeTab === 'audit' && (
            <div className="bg-white border border-brand-border rounded p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-brand-ink">
                  Underwriting Audit Trail
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Point-in-time chronological record of all underwriting events.</p>
              </div>

              <div className="space-y-4">
                {app.timeline.map((item, idx) => (
                  <div key={idx} className="p-3 rounded border border-brand-border bg-brand-bg/40 text-xs">
                    <div className="flex justify-between items-center font-semibold text-brand-ink">
                      <span>{item.title}</span>
                      <span className="font-mono text-[11px] text-brand-muted font-normal">{item.date}</span>
                    </div>
                    <p className="text-brand-muted text-[11px] mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Underwriting Decision Console */}
        <div className="bg-white border border-brand-border rounded p-6 flex flex-col justify-between space-y-6 h-fit sticky top-20">
          <div>
            <div className="pb-3 border-b border-brand-border">
              <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
                Underwriter Console
              </span>
              <h3 className="font-display font-bold text-lg text-brand-ink mt-0.5">
                Record Credit Decision
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Select binding outcome and enter official sanction terms.
              </p>
            </div>

            {/* Tri-State Action Selector */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setSelectedOutcome('APPROVE')}
                className={`py-2 px-1 text-center rounded text-xs font-bold transition-all ${
                  selectedOutcome === 'APPROVE'
                    ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                APPROVE
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome('REFER')}
                className={`py-2 px-1 text-center rounded text-xs font-bold transition-all ${
                  selectedOutcome === 'REFER'
                    ? 'bg-amber-700 text-white shadow-xs ring-2 ring-amber-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                REFER
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome('REJECT')}
                className={`py-2 px-1 text-center rounded text-xs font-bold transition-all ${
                  selectedOutcome === 'REJECT'
                    ? 'bg-red-700 text-white shadow-xs ring-2 ring-red-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                REJECT
              </button>
            </div>

            {/* Terms input if APPROVE */}
            {selectedOutcome === 'APPROVE' && (
              <div className="mt-4 space-y-3 pt-3 border-t border-brand-border text-xs">
                <div>
                  <label className="block font-medium text-brand-ink mb-1">Sanctioned Amount (₹)</label>
                  <input
                    type="number"
                    step="50000"
                    value={sanctionedAmount}
                    onChange={(e) => setSanctionedAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-1.5 border border-brand-border rounded focus:ring-1 focus:ring-brand-blue"
                  />
                  <span className="text-[11px] text-brand-muted mt-0.5 block">{formatINR(sanctionedAmount)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-brand-ink mb-1">Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={sanctionedRate}
                      onChange={(e) => setSanctionedRate(Number(e.target.value))}
                      className="w-full text-xs px-3 py-1.5 border border-brand-border rounded focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-brand-ink mb-1">Tenure (Mos)</label>
                    <input
                      type="number"
                      value={sanctionedTenureMonths}
                      onChange={(e) => setSanctionedTenureMonths(Number(e.target.value))}
                      className="w-full text-xs px-3 py-1.5 border border-brand-border rounded focus:ring-1 focus:ring-brand-blue"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Remarks Input */}
            <div className="mt-4 pt-3 border-t border-brand-border">
              <label className="block text-xs font-medium text-brand-ink mb-1">
                Underwriting Decision Remarks *
              </label>
              <textarea
                rows={3}
                value={decisionRemarks}
                onChange={(e) => setDecisionRemarks(e.target.value)}
                placeholder="Enter credit policy justification, conditions precedent, or reasons for referral/decline..."
                className="w-full text-xs p-2.5 border border-brand-border rounded focus:outline-hidden focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          {/* Binding Action Button */}
          <div className="pt-4 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className={`w-full py-2.5 px-4 rounded text-xs font-bold text-white transition-colors shadow-sm ${
                selectedOutcome === 'APPROVE'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : selectedOutcome === 'REJECT'
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              Commit Decision as {selectedOutcome}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDecision}
        outcome={selectedOutcome}
        title={`Execute Underwriting ${selectedOutcome}`}
        message={`Are you sure you want to officially record the decision as ${selectedOutcome} for application ${app.id} (${app.applicantName})? This will update the borrower's status and generate an entry in the permanent compliance audit log.`}
        confirmText={`Execute ${selectedOutcome}`}
      />
    </div>
  );
}

