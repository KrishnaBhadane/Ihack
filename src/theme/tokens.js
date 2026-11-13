/**
 * NIRNAY Design System Tokens
 * Hero Housing Finance - Digital Mortgage Underwriting
 */

export const TOKENS = {
  colors: {
    bg: '#F7F8FA',
    surface: '#FFFFFF',
    ink: '#172333',
    muted: '#687586',
    blue: {
      default: '#2457A7',
      hover: '#1B4588',
      light: '#EAF1FA',
    },
    border: '#E2E7ED',
    borderSubtle: '#EEF2F6',
    success: {
      default: '#237A57',
      light: '#EBF5F0',
      border: '#BFE3D3',
    },
    warning: {
      default: '#A56B18',
      light: '#FEF7EC',
      border: '#F9DFB8',
    },
    error: {
      default: '#B43B3B',
      light: '#FDF2F2',
      border: '#F6CACA',
    },
  },
  typography: {
    fontDisplay: '"Plus Jakarta Sans", sans-serif',
    fontBody: '"DM Sans", sans-serif',
  },
  statuses: {
    draft: { label: 'Draft', color: 'neutral' },
    submitted: { label: 'Submitted', color: 'info' },
    processing: { label: 'Processing', color: 'info' },
    documents_required: { label: 'Documents Required', color: 'warning' },
    under_review: { label: 'Under Review', color: 'warning' },
    approved: { label: 'Approved', color: 'success' },
    rejected: { label: 'Rejected', color: 'error' },
  },
  docStatuses: {
    pending: { label: 'Pending', color: 'neutral' },
    uploaded: { label: 'Uploaded', color: 'info' },
    verified: { label: 'Verified', color: 'success' },
    manual_review: { label: 'Manual Review', color: 'warning' },
    failed: { label: 'Failed', color: 'error' },
  },
  riskTiers: {
    low: { label: 'Low Risk', color: 'success', threshold: 'Score ≥ 75' },
    medium: { label: 'Moderate Risk', color: 'warning', threshold: 'Score 50-74' },
    high: { label: 'High Risk', color: 'error', threshold: 'Score < 50' },
  },
  decisionOutcomes: {
    approve: { label: 'APPROVE', color: 'success', description: 'Application satisfies all configured credit policies.' },
    refer: { label: 'REFER', color: 'warning', description: 'Application requires underwriter investigation or additional documents.' },
    reject: { label: 'REJECT', color: 'error', description: 'Application violates statutory or internal credit policy limits.' },
  }
};

