import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileText } from 'lucide-react';

export default function StatusBadge({ status, type = 'application' }) {
  // Application statuses
  const appStyles = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: FileText, label: 'Draft' },
    submitted: { bg: 'bg-blue-50', text: 'text-brand-blue', border: 'border-blue-200', icon: Clock, label: 'Submitted' },
    processing: { bg: 'bg-blue-50', text: 'text-brand-blue', border: 'border-blue-200', icon: Clock, label: 'Processing' },
    documents_required: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: AlertTriangle, label: 'Docs Required' },
    under_review: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock, label: 'Under Review' },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2, label: 'Sanctioned' },
    rejected: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle, label: 'Declined' },
  };

  // Document verification statuses
  const docStyles = {
    pending: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: Clock, label: 'Pending' },
    uploaded: { bg: 'bg-blue-50', text: 'text-brand-blue', border: 'border-blue-200', icon: FileText, label: 'Uploaded' },
    verified: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2, label: 'Verified' },
    manual_review: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: AlertTriangle, label: 'Manual Review' },
    failed: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle, label: 'Failed' },
  };

  // Risk tiers
  const riskStyles = {
    low: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle2, label: 'Low Risk' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: AlertTriangle, label: 'Moderate Risk' },
    high: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: XCircle, label: 'High Risk' },
  };

  const map = type === 'risk' ? riskStyles : type === 'document' ? docStyles : appStyles;
  const cfg = map[status] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', icon: Clock, label: status };
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

