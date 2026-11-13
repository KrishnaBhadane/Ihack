import React, { useState } from 'react';
import { calculateEMI, calculateFOIR, formatINR } from '../../data/mockData';
import { X, Calculator, ArrowRight, ShieldCheck } from 'lucide-react';

export default function EligibilityCalculatorModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [loanType, setLoanType] = useState('home_loan'); // 'home_loan' | 'lap'
  const [monthlyIncome, setMonthlyIncome] = useState(120000);
  const [existingEMIs, setExistingEMIs] = useState(15000);
  const [desiredLoan, setDesiredLoan] = useState(4500000);
  const [tenureYears, setTenureYears] = useState(20);

  const interestRate = loanType === 'home_loan' ? 8.50 : 10.25;
  const tenureMonths = tenureYears * 12;
  const estimatedEMI = calculateEMI(desiredLoan, interestRate, tenureMonths);
  const calculatedFOIR = calculateFOIR(existingEMIs, estimatedEMI, monthlyIncome);
  const maxAffordableEMI = Math.max(0, monthlyIncome * 0.55 - existingEMIs);
  const maxEligibleLoan = Math.round(maxAffordableEMI * 105);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-brand-border shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-brand-blue-light text-brand-blue flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-brand-ink">
                Mortgage Eligibility & EMI Estimator
              </h3>
              <p className="text-xs text-brand-muted">
                Modeled on Hero Housing Finance lending benchmarks & NHB guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Loan Product Toggle */}
          <div className="flex rounded border border-brand-border p-1 bg-brand-bg">
            <button
              type="button"
              onClick={() => {
                setLoanType('home_loan');
                if (tenureYears > 30) setTenureYears(20);
              }}
              className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                loanType === 'home_loan'
                  ? 'bg-white text-brand-blue shadow-2xs font-bold'
                  : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              Home Loan (8.50% p.a. • Up to 30 Yrs)
            </button>
            <button
              type="button"
              onClick={() => {
                setLoanType('lap');
                if (tenureYears > 15) setTenureYears(15);
              }}
              className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                loanType === 'lap'
                  ? 'bg-white text-amber-800 shadow-2xs font-bold'
                  : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              Loan Against Property (10.25% p.a. • Up to 15 Yrs)
            </button>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-brand-ink">Net Monthly Income (₹)</span>
                <span className="font-bold text-brand-blue">{formatINR(monthlyIncome)}</span>
              </div>
              <input
                type="range"
                min={30000}
                max={500000}
                step={5000}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <span className="text-[10px] text-brand-muted">Min ₹30,000 — Max ₹5,00,000</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-brand-ink">Existing Monthly EMIs (₹)</span>
                <span className="font-bold text-brand-ink">{formatINR(existingEMIs)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={2500}
                value={existingEMIs}
                onChange={(e) => setExistingEMIs(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <span className="text-[10px] text-brand-muted">Total running loan installments</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-brand-ink">Desired Loan Amount (₹)</span>
                <span className="font-bold text-brand-blue">{formatINR(desiredLoan)}</span>
              </div>
              <input
                type="range"
                min={500000}
                max={15000000}
                step={100000}
                value={desiredLoan}
                onChange={(e) => setDesiredLoan(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <span className="text-[10px] text-brand-muted">Min ₹5,00,000 — Max ₹1.5 Cr</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-brand-ink">Loan Tenure</span>
                <span className="font-bold text-brand-ink">{tenureYears} Years ({tenureMonths} Mos)</span>
              </div>
              <input
                type="range"
                min={5}
                max={loanType === 'home_loan' ? 30 : 15}
                step={1}
                value={tenureYears}
                onChange={(e) => setTenureYears(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <span className="text-[10px] text-brand-muted">Max {loanType === 'home_loan' ? '30 Yrs for Home Loan' : '15 Yrs for LAP'}</span>
            </div>
          </div>

          {/* Real-time Eligibility Result Card (Tremor-inspired) */}
          <div className="p-4 rounded border border-brand-border bg-brand-bg/70 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded border border-brand-border">
                <span className="text-[11px] text-brand-muted block">Estimated Monthly EMI</span>
                <strong className="text-sm font-bold text-brand-ink block mt-0.5">{formatINR(estimatedEMI)}</strong>
              </div>
              <div className="bg-white p-3 rounded border border-brand-border">
                <span className="text-[11px] text-brand-muted block">Calculated FOIR</span>
                <strong className={`text-sm font-bold block mt-0.5 ${calculatedFOIR <= 55 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {calculatedFOIR}%
                </strong>
              </div>
              <div className="bg-white p-3 rounded border border-brand-border sm:col-span-2">
                <span className="text-[11px] text-brand-muted block">Estimated Maximum Eligible Loan</span>
                <strong className="text-sm font-bold text-brand-blue block mt-0.5">{formatINR(maxEligibleLoan)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-brand-border">
              <div className="flex items-center gap-1.5 text-brand-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-success" />
                <span>Based on maximum 55% FOIR statutory affordability cap.</span>
              </div>
              <span className={calculatedFOIR <= 55 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                {calculatedFOIR <= 55 ? 'Eligible for Quick Underwriting' : 'High Obligation — May require higher tenure'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-brand-border flex items-center justify-between">
          <span className="text-[11px] text-brand-muted">
            Indicative calculations only. Final sanction subject to credit assessment.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-2xs"
          >
            Apply with These Terms
          </button>
        </div>
      </div>
    </div>
  );
}

