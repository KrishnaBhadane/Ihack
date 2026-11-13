# NIRNAY — Phased Implementation Roadmap & Engineering Plan

**Platform:** NIRNAY Digital Mortgage Underwriting Engine  
**Target Organization:** Hero Housing Finance Limited (HHFL)  
**Research Phase:** Phase 1 — Reference Research & Product Reverse Engineering  
**Scope:** Actionable, non-destructive execution plan translating research findings into working full-stack features.  
**Constraint:** Strict preservation of existing working assets (PostgreSQL 24 tables, RLS policies, Web Crypto SHA-256, atomic RPCs, and ProtectedRoute guards).  

---

## 1. Roadmap Overview & Architectural Principles

To ensure systematic delivery without regressing working functionality, implementation is broken down into four sequential phases following this research study.

### Three Non-Negotiable Engineering Principles
1. **Regulatory Accuracy & Legal Demarcation:**
   - **Statutory Mandate (RBI HFC Master Directions 2021, Section 31):** Enforces statutory LTV caps (90% for $\le 30\text{L}$, 80% for $30\text{L}-75\text{L}$, 75% for $> 75\text{L}$) and the strict statutory exclusion of stamp duty, registration, and documentation charges from the property cost base.
   - **Institutional Credit Policy:** The rule taking the lower of Agreement Value and Empanelled Valuer Realizable Value $\min(V_{\text{agreement}}, V_{\text{realizable}})$ is an **institutional risk control** adopted under HHFL's Board-approved valuation policy (aligned with NHB / IBA guidelines), not a statutory legislative formula in Section 31.
2. **Scorecard Calibration & Mandatory Governance Disclaimers:**
   - The 0–100 risk score is an **illustrative internal multi-attribute additive scorecard** with documented weights, deterministic reason codes, and calibrated decision cut-offs.
   - It carries an explicit disclaimer designating it as an illustrative prototype model, strictly distinguishing it from an econometrically backtested credit-default probability (PD) model.
3. **Maximizing Existing Codebase Reuse (Zero Redundant Systems):**
   - **`underwritingEngine.js`:** All mathematical logic (scorecard calculation, counterfactual solving, and statutory checks) will directly extend this single existing engine. No duplicate calculation services will be created.
   - **`applicationService.js`:** All data orchestration (Account Aggregator payload intake, document vaulting, and decision triggers) will extend this existing service, reusing atomic RPCs `save_application_draft_atomic` and `record_underwriting_decision`.
   - **Database Schema:** 100% reuse of the 24 active PostgreSQL tables in Supabase. No duplicate tables or parallel schemas.
   - **UI Workspaces:** Direct enhancement of the existing 6-step customer wizard (`LoanApplicationWizard.jsx`), customer tracking page (`ApplicationDetailsPage.jsx`), and underwriter desk (`AdminApplicationWorkspace.jsx`).

```
+----------------------------------------------------------------------------------------------------+
| [PHASE 1: RESEARCH & BLUEPRINT] (CURRENT - COMPLETED)                                              |
| In-depth reverse engineering of 8 benchmark platforms, gap analysis, and AI/ML strategy.          |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| [PHASE 2: ENGINES & DATA ORCHESTRATION]                                                            |
| Dynamic 0-100 Additive Scorecard, What-If Counterfactual Simulator, and AA Statement Normalizer.   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| [PHASE 3: PROPERTY DUAL-TRACK & FRAUD FORENSICS]                                                   |
| Dual-track Legal (LSR) & Valuation (TVR) workflow, PDF metadata tampering checks, and KFS builder.|
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
| [PHASE 4: STRAIGHT-THROUGH AUTO-SANCTION & AUDIT HARDENING]                                        |
| Straight-Through Processing (STP) auto-sanction letter, Adverse Action reason notices, end-to-end.  |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Execution Plans

---

### Phase 2: Credit Engines & Data Orchestration

#### Objective
Elevate the core underwriting engine from static cashflow formulas to a dynamic additive risk scorecard with interactive counterfactual what-if simulation, and implement the Account Aggregator bank statement normalizer, extending existing services without duplicating code.

#### Features to Build
1. **Dynamic Additive Risk Scorecard (Experian-Style):** Implements the transparent 0-100 risk scoring algorithm directly inside [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js) using calibrated weights:
   * **Formula:** $\text{Score} = \text{Base (50)} + \Delta_{\text{bureau}} + \Delta_{\text{foir}} + \Delta_{\text{ltv}} + \Delta_{\text{vintage}}$ (clamped to $[0, 100]$).
   * **Weights:** Bureau ($\pm 20$ pts), FOIR ($\pm 15$ pts), LTV ($\pm 10$ pts), Vintage ($\pm 5$ pts).
   * **Reason Codes:** Deterministic strings (`RC_BUR_PRIME`, `RC_FOIR_STRETCH`, `RC_LTV_CONSERVATIVE`, `RC_VINTAGE_STABLE`).
   * **Thresholds:** Prime $\ge 80$, Standard $65-79$, Borderline $50-64$, High Risk $< 50$.
   * **Model Governance Disclaimer:** Explicitly designated as an illustrative internal prototype model, not a validated econometric credit-default probability model.
2. **Interactive What-If Counterfactual Simulator (Fiddler-Style):** Embedded in customer and underwriter views to calculate exact parameter shifts (tenure extension or equity addition) required to overcome policy breaches.
3. **Account Aggregator Financial Normalizer (FinBox-Style):** Service module that parses structured bank statement transaction streams into verified net income, recurring NACH debt obligations, and inward return tallies.

#### Dependencies
* Working `underwritingEngine.js` (Already verified in repo).
* Active `preliminary_eligibility_assessments` and `risk_assessments` tables.

#### Frontend Work
* Create [src/components/common/CounterfactualSimulator.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/components/common/CounterfactualSimulator.jsx) providing interactive sliders for loan amount, tenure, and down payment.
* Mount simulator in [src/pages/customer/ApplicationDetailsPage.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/customer/ApplicationDetailsPage.jsx) and [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx).

#### Backend & Service Work
* Extend [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js) with `calculateAdditiveRiskScore()` and `solveCounterfactualRecommendation()`.
* Create `src/services/externalDataService.js` to handle Account Aggregator JSON parsing and transaction tagging, integrating directly with `applicationService.js`.

#### Database Work
* None required (Existing `risk_assessments` and `external_data_sources` tables already support the JSON schema).

#### Testing Requirements
* Unit test: Verify additive scorecard produces identical 0-100 scores across identical financial profiles.
* Functional test: Verify that increasing loan amount past 80% LTV immediately triggers counterfactual recommendation.

#### Completion Criteria
* Underwriter workspace renders live 0-100 score with positive/negative driver breakdown.
* Customer portal allows testing What-If scenarios without reloading or altering database records.

---

### Phase 3: Collateral Dual-Track & Fraud Forensics

#### Objective
Implement the BUMI-style dual-track property verification workflow (Legal Scrutiny Report & Technical Valuation Report) and Sardine-style forensic heuristics for uploaded document tampering.

#### Features to Build
1. **Dual-Track Collateral Review (BUMI-Style):** Independent review panels for empaneled advocate title search (LSR) and empaneled valuer physical inspection (TVR), enforcing the institutional credit policy rule: $\text{Valuation Base} = \min(\text{Agreement Value}, \text{Realizable Value})$, while strictly preserving statutory Section 31 LTV caps and stamp duty exclusion.
2. **Document Tampering Heuristics (Sardine-Style):** Forensic analysis of uploaded PDF metadata inspecting `/Producer` and `/Creator` headers for prohibited editing software (Photoshop, Canva, PDFescape).
3. **Regulatory Key Fact Statement (KFS) Generator (RBI-Style):** Automated generation of the standardized KFS disclosure sheet displaying Annual Percentage Rate (APR) and statutory look-up cooling-off terms.

#### Dependencies
* Phase 2 scorecard and property details models.
* Existing private Supabase Storage `mortgage-documents`.

#### Frontend Work
* Enhance the Property Collateral tab in [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) with dual verification status toggles for Legal Scrutiny and Technical Valuation.
* Add Key Fact Statement preview and download modal.

#### Backend & Service Work
* Create `src/services/fraudDetectionService.js` to execute PDF metadata inspection and cross-document name matching.
* Create `src/services/complianceService.js` to compile standardized KFS and APR schedules.

#### Database Work
* Idempotent check: Ensure existing `property_details` and `fraud_alerts` schema columns are fully utilized (no new tables needed).

#### Testing Requirements
* Forensic test: Upload a PDF edited in Photoshop and verify that a `CRITICAL` fraud alert is recorded in `fraud_alerts`.
* Valuation test: Set technical valuation lower than declared value and verify statutory LTV recalculates automatically.

#### Completion Criteria
* Property review displays separate advocate and valuer sign-offs.
* Manipulated PDFs trigger automated fraud warnings in the underwriter desk.

---

### Phase 4: Straight-Through Auto-Sanction & Final Hardening

#### Objective
Activate the automated Straight-Through Processing (STP) auto-sanction pathway for prime applications, generate formal Adverse Action notices for declines, and finalize the complete end-to-end demonstration.

#### Features to Build
1. **Straight-Through Processing (STP) Auto-Sanction (Zest-Style):** If an application achieves a risk score $\ge 80$, $\text{LTV} \le \text{statutory cap} - 5\%$, $\text{FOIR} \le 45\%$, clean title, and zero fraud alerts, it transitions automatically to provisional sanction upon submission.
2. **Regulatory Adverse Action Notice:** Compiles principal adverse action reason codes for rejected applications in compliance with fair-lending standards.
3. **Formal PDF Document Generation:** Formatted institutional Hero Housing Finance sanction letter with digital seal and KFS annexure.

#### Dependencies
* Phases 2 and 3 completed and verified.
* Existing atomic RPC `record_underwriting_decision`.

#### Frontend Work
* Enhance [src/pages/customer/LoanApplicationWizard.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/customer/LoanApplicationWizard.jsx) Step 6 to display immediate auto-sanction confirmation when STP criteria are satisfied.
* Enhance [src/pages/customer/ApplicationDetailsPage.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/customer/ApplicationDetailsPage.jsx) with downloadable Sanction Letter and Adverse Action documents.

#### Backend & Service Work
* Connect `submitApplication` in [src/services/applicationService.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/applicationService.js) to trigger the STP decision engine automatically before defaulting to underwriter triage.

#### Database Work
* None required (Uses existing `underwriting_decisions` and `decision_reasons` tables).

#### Testing Requirements
* End-to-end test with `applicant@herohousing.in`: Submit clean prime dossier and verify instant auto-sanction letter generation.
* End-to-end test with `underwriter@herohousing.in`: Adjudicate referred case and verify atomic status update.

#### Completion Criteria
* Both customer and underwriter journeys operate 100% end-to-end with persistent database records, zero mock bypasses, and verified statutory compliance.

---

## 3. Engineering Work Breakdown Matrix

```
+-------+--------------------------------------+-------------+--------------------------+---------------------+
| Phase | Core Deliverable                     | Code Impact | Target Source Files      | Verification Method |
+-------+--------------------------------------+-------------+--------------------------+---------------------+
| 2.1   | Additive Risk Scorecard Engine       | Extend Core | underwritingEngine.js    | Jest / Node script  |
| 2.2   | Interactive Counterfactual Simulator | New UI      | CounterfactualSim.jsx    | Browser Interaction |
| 2.3   | Account Aggregator Data Normalizer   | New Service | externalDataService.js   | JSON Parser Test    |
| 3.1   | Dual-Track Legal & Valuation Review  | UI & Logic  | AdminWorkspace.jsx       | Underwriter Flow    |
| 3.2   | PDF Metadata Tampering Forensics     | New Service | fraudDetectionService.js | Sample File Test    |
| 3.3   | Key Fact Statement (KFS) Generator   | New Service | complianceService.js     | PDF Export Check    |
| 4.1   | Straight-Through Processing (STP)    | Orchestrate | applicationService.js    | Instant Intake Test |
| 4.2   | Adverse Action Regulatory Notices    | UI & Logic  | ApplicationDetails.jsx   | Decline Export Test |
| 4.3   | Final End-to-End Hardening & Demo    | Integration | Full Application Suite   | Multi-User Scenario |
+-------+--------------------------------------+-------------+--------------------------+---------------------+
```

