import React from 'react';
import { Shield, Lock, FileCheck2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-brand-border text-xs text-brand-muted mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-brand-ink font-display font-bold text-sm">
              <span className="w-5 h-5 rounded bg-brand-ink text-white flex items-center justify-center text-xs">N</span>
              <span>NIRNAY Underwriting Intelligence</span>
            </div>
            <p className="text-brand-muted leading-relaxed max-w-md">
              Digitally automated mortgage underwriting engine built for Hero Housing Finance’s Housing Fintech Challenge.
              Calculates FOIR, LTV, credit risk probability, and verifies documents with explainable credit governance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-brand-ink uppercase tracking-wider text-[11px] mb-2">Supported Products</h4>
            <ul className="space-y-1.5">
              <li>Home Loans (Purchase & Construction)</li>
              <li>Loan Against Property (LAP)</li>
              <li>Refinance & Balance Transfer</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-brand-ink uppercase tracking-wider text-[11px] mb-2">Integrity & Standards</h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-brand-ink">
                <Shield className="w-3.5 h-3.5 text-brand-blue" />
                <span>NHB & RBI Direction Compliance</span>
              </div>
              <div className="flex items-center gap-1.5 text-brand-ink">
                <FileCheck2 className="w-3.5 h-3.5 text-brand-success" />
                <span>Fair Practices Code Aligned</span>
              </div>
              <div className="flex items-center gap-1.5 text-brand-ink">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Synthetic & Masked KYC Data</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © 2026 NIRNAY — Hero Housing Finance Housing Fintech Challenge Prototype.
          </div>
          <div className="p-2 bg-brand-bg rounded border border-brand-border text-slate-500 max-w-xl text-center sm:text-right">
            <strong>Demonstration Notice:</strong> All underwriting outputs, risk calculations, and document verifications are powered by realistic simulation data for prototype evaluation. Not a legally binding financial sanction.
          </div>
        </div>
      </div>
    </footer>
  );
}

