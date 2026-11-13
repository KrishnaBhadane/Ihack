import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import EligibilityCalculatorModal from '../../components/common/EligibilityCalculatorModal';
import { ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Calculator, FileText, BarChart3, Lock, Award, Landmark } from 'lucide-react';
import { formatINR } from '../../data/mockData';

export default function LandingPage() {
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Editorial Financial Hero (Inspired by Mercury + Hero Housing Finance) */}
      <section className="bg-white border-b border-brand-border py-16 sm:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            {/* Regulatory Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-brand-blue-light border border-blue-200 text-brand-blue text-xs font-semibold mb-6">
              <Landmark className="w-3.5 h-3.5 text-brand-blue" />
              <span>Hero Housing Finance • NHB Regn. No. 07.0159.17</span>
            </div>

            {/* Editorial Headline */}
            <h1 className="font-display font-bold text-4xl sm:text-6xl text-brand-ink tracking-tight leading-[1.12]">
              Digital Mortgage Underwriting for the Modern Borrower.
            </h1>

            <p className="mt-6 text-base sm:text-lg text-brand-muted leading-relaxed max-w-2xl">
              NIRNAY transforms traditional weeks of mortgage paperwork into an automated credit assessment engine. 
              We verify documents, test statutory FOIR and LTV ratios, screen fraud anomalies, and deliver explainable loan decisions.
            </p>

            {/* Action Bar */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/customer/apply"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold bg-brand-blue text-white hover:bg-brand-blue-hover transition-colors shadow-sm"
              >
                <span>Start Loan Application</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => setIsCalcOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-semibold bg-white text-brand-ink border border-brand-border hover:bg-slate-50 transition-colors"
              >
                <Calculator className="w-4 h-4 text-brand-blue" />
                <span>Calculate Eligibility</span>
              </button>

              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded text-xs font-medium text-brand-muted hover:text-brand-ink transition-colors"
              >
                <span>Enter Underwriter Desk</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>

            {/* Live Benchmark Rates Ticker */}
            <div className="mt-12 pt-6 border-t border-brand-border grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-brand-muted block">Home Loan Rates</span>
                <span className="font-display font-bold text-lg text-brand-ink block mt-0.5">
                  8.50% <span className="text-xs font-normal text-brand-muted">p.a. onwards</span>
                </span>
                <span className="text-[11px] text-brand-muted">Statutory LTV up to 80%</span>
              </div>
              <div>
                <span className="text-brand-muted block">Loan Against Property (LAP)</span>
                <span className="font-display font-bold text-lg text-brand-ink block mt-0.5">
                  10.25% <span className="text-xs font-normal text-brand-muted">p.a. onwards</span>
                </span>
                <span className="text-[11px] text-brand-muted">Collateral LTV up to 60%</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-brand-muted block">Decisioning Velocity</span>
                <span className="font-display font-bold text-lg text-emerald-700 block mt-0.5">
                  Automated
                </span>
                <span className="text-[11px] text-brand-muted">Explainable risk scoring</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Mortgage Products Comparison (Structured Financial Architecture) */}
      <section className="py-16 border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <span className="text-xs font-bold text-brand-blue uppercase tracking-wider">
              Lending Portfolios
            </span>
            <h2 className="font-display font-bold text-3xl text-brand-ink mt-1">
              Engineered for Both Acquisition & Collateral Monetisation
            </h2>
            <p className="text-xs text-brand-muted mt-2 leading-relaxed">
              Every loan application is evaluated under dedicated credit policy scorecards configured for distinct risk profiles and collateral security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Home Loan Card */}
            <div className="bg-white border border-brand-border rounded p-8 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                  <div>
                    <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                      Product 01
                    </span>
                    <h3 className="font-display font-bold text-2xl text-brand-ink mt-0.5">
                      Home Loan (Purchase & Construction)
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-brand-blue text-xs font-bold rounded">
                    LTV ≤ 80%
                  </span>
                </div>

                <p className="text-xs text-brand-muted mt-4 leading-relaxed">
                  Finances the acquisition, construction, or extension of residential properties. Underwritten against borrower income stability, builder approvals, and clean encumbrance.
                </p>

                <div className="mt-6 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Max Statutory LTV</span>
                    <span className="font-medium text-brand-ink">Up to 80% (NHB Direction Cap)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Max Permissible Tenure</span>
                    <span className="font-medium text-brand-ink">Up to 30 Years (360 Months)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Benchmark Lending Rate</span>
                    <span className="font-semibold text-brand-blue">8.50% p.a.</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-brand-muted">Eligible Borrowers</span>
                    <span className="font-medium text-brand-ink">Salaried & Self-Employed</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-brand-border flex items-center justify-between">
                <Link
                  to="/customer/apply"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue-hover"
                >
                  <span>Apply for Home Loan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="text-xs text-brand-muted hover:text-brand-ink"
                >
                  View EMI Schedule
                </button>
              </div>
            </div>

            {/* LAP Card */}
            <div className="bg-white border border-brand-border rounded p-8 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                  <div>
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      Product 02
                    </span>
                    <h3 className="font-display font-bold text-2xl text-brand-ink mt-0.5">
                      Loan Against Property (LAP)
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded">
                    LTV ≤ 60%
                  </span>
                </div>

                <p className="text-xs text-brand-muted mt-4 leading-relaxed">
                  Unlocks liquidity by mortgaging an existing, debt-free residential or commercial property. Ideal for business expansion, working capital, or education funding.
                </p>

                <div className="mt-6 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Max Collateral LTV</span>
                    <span className="font-medium text-brand-ink">Up to 60% (Hero Housing Limit)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Max Permissible Tenure</span>
                    <span className="font-medium text-brand-ink">Up to 15 Years (180 Months)</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-brand-borderSubtle">
                    <span className="text-brand-muted">Benchmark Lending Rate</span>
                    <span className="font-semibold text-amber-800">10.25% p.a.</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-brand-muted">Collateral Status</span>
                    <span className="font-medium text-brand-ink">Freehold Registered Title</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-brand-border flex items-center justify-between">
                <Link
                  to="/customer/apply"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:text-brand-blue-hover"
                >
                  <span>Apply for LAP</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="text-xs text-brand-muted hover:text-brand-ink"
                >
                  View EMI Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Underwriting Workflow Lifecycle (TCS + Linear Inspired) */}
      <section className="py-16 bg-white border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-xl">
            <span className="text-xs font-bold text-brand-blue uppercase tracking-wider">
              Architecture & Lifecycle
            </span>
            <h2 className="font-display font-bold text-2xl text-brand-ink mt-1">
              End-to-End Mortgage Verification Engine
            </h2>
            <p className="text-xs text-brand-muted mt-1">
              Designed for automated STP (Straight-Through-Processing) with human exception routing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded border border-brand-border bg-brand-bg/50 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-blue">01 / INTAKE</span>
              <h4 className="font-display font-semibold text-sm text-brand-ink">Digital Application & Consent</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Applicant enters financials, collateral specifications, and provides legally binding digital consent for bureau and KYC queries.
              </p>
            </div>

            <div className="p-5 rounded border border-brand-border bg-brand-bg/50 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-blue">02 / VERIFICATION</span>
              <h4 className="font-display font-semibold text-sm text-brand-ink">OCR & External Trust Anchors</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Simulated DigiLocker Aadhaar, CIBIL bureau pull, bank statement salary parsing, and municipal land-registry verification.
              </p>
            </div>

            <div className="p-5 rounded border border-brand-border bg-brand-bg/50 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-blue">03 / ASSESSMENT</span>
              <h4 className="font-display font-semibold text-sm text-brand-ink">Credit Policy & ML Risk Score</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Calculates FOIR and LTV against statutory limits. ML model estimates default probability with clear factor attribution.
              </p>
            </div>

            <div className="p-5 rounded border border-brand-border bg-brand-bg/50 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-blue">04 / DECISIONING</span>
              <h4 className="font-display font-semibold text-sm text-brand-ink">Tri-State Sanction Engine</h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Routine clean profiles receive automated APPROVE; policy violations trigger REJECT; borderline files are routed to REFER.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Configured Underwriting Standards Table (TanStack Table inspired) */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-brand-ink">
                Configured Underwriting Policy Limits
              </h2>
              <p className="text-xs text-brand-muted mt-0.5">
                Active thresholds enforced during automated preliminary assessment.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted bg-white border border-brand-border px-3 py-1.5 rounded">
              <ShieldCheck className="w-4 h-4 text-brand-success" />
              <span>NHB Housing Finance Directions 2021 Compliant</span>
            </span>
          </div>

          <div className="bg-white border border-brand-border rounded overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-brand-border text-slate-700 font-semibold">
                <tr>
                  <th className="px-5 py-3">Rule Code</th>
                  <th className="px-5 py-3">Underwriting Parameter</th>
                  <th className="px-5 py-3">Product Applicability</th>
                  <th className="px-5 py-3">Policy Threshold</th>
                  <th className="px-5 py-3">Regulatory Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-borderSubtle">
                <tr>
                  <td className="px-5 py-3.5 font-mono font-medium text-brand-ink">POL-HL-LTV</td>
                  <td className="px-5 py-3.5 font-medium text-brand-ink">Loan to Value (LTV) Cap</td>
                  <td className="px-5 py-3.5">Home Loan</td>
                  <td className="px-5 py-3.5 font-semibold text-brand-blue">≤ 80.0%</td>
                  <td className="px-5 py-3.5 text-brand-muted">NHB Statutory ceiling for loans up to ₹75 Lakhs</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-mono font-medium text-brand-ink">POL-LAP-LTV</td>
                  <td className="px-5 py-3.5 font-medium text-brand-ink">Collateral LTV Cap</td>
                  <td className="px-5 py-3.5">Loan Against Property</td>
                  <td className="px-5 py-3.5 font-semibold text-amber-800">≤ 60.0%</td>
                  <td className="px-5 py-3.5 text-brand-muted">Hero Housing Finance risk mitigation benchmark</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-mono font-medium text-brand-ink">POL-FOIR-MAX</td>
                  <td className="px-5 py-3.5 font-medium text-brand-ink">Fixed Obligation to Income (FOIR)</td>
                  <td className="px-5 py-3.5">All Products</td>
                  <td className="px-5 py-3.5 font-semibold text-brand-ink">≤ 55.0%</td>
                  <td className="px-5 py-3.5 text-brand-muted">Ensures borrower retains min 45% disposable buffer</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-mono font-medium text-brand-ink">POL-CIBIL-MIN</td>
                  <td className="px-5 py-3.5 font-medium text-brand-ink">Minimum Credit Bureau Score</td>
                  <td className="px-5 py-3.5">All Products</td>
                  <td className="px-5 py-3.5 font-semibold text-emerald-800">≥ 650</td>
                  <td className="px-5 py-3.5 text-brand-muted">Automated threshold; lower scores routed to REFER</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Eligibility Calculator Modal */}
      <EligibilityCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
      />
    </div>
  );
}
