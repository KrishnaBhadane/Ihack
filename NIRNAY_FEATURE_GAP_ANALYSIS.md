# NIRNAY — Feature Gap Analysis & Codebase Audit

**Platform:** NIRNAY Digital Mortgage Underwriting Engine  
**Target Organization:** Hero Housing Finance Limited (HHFL)  
**Research Phase:** Phase 1 — Reference Research & Product Reverse Engineering  
**Scope:** Rigorous codebase inspection across all 8 hackathon requirements.  
**Audit Standard:** Strict distinction between database schema, mock UI, and working backend workflows.  

---

## 1. Executive Summary of Implementation Status

The existing NIRNAY repository possesses an institutional-grade database foundation (24 PostgreSQL domain tables, Row Level Security, private storage bucket configuration, and statutory triggers) and an editorial React frontend. 

However, evaluating the codebase against the reverse-engineered benchmarks reveals that several features currently exist primarily as **database schemas** or **simulated frontend state** rather than fully integrated end-to-end backend workflows.

### Architectural Reuse Mandate: Zero Duplicate Systems
To preserve system stability and maintain architectural cleanliness, the implementation strategy enforces **100% reuse and extension of existing assets**:
* **Underwriting Engine Reuse (`src/services/underwritingEngine.js`):** The existing engine already implements reducing-balance EMI, debt-to-income FOIR, statutory RBI Section 31 LTV caps, LAP policy benchmarks, and cooling-off checks. All new risk scoring (Requirement 4) and counterfactual solving (Requirement 8) will directly extend this single file rather than introducing a parallel engine.
* **Service Layer Reuse (`src/services/applicationService.js`):** The existing service already manages Supabase connectivity, atomic draft persistence (`save_application_draft_atomic`), client-side Web Crypto SHA-256 (`computeFileSHA256`), and short-lived signed URLs (`getDocumentSignedUrl`). All external data adapters and decision triggers will integrate into this existing service layer.
* **Database Schema Reuse (24 PostgreSQL Tables):** The existing database schema already contains the requisite domain models (`applications`, `applicant_details`, `financial_details`, `property_details`, `external_data_sources`, `external_verification_attempts`, `credit_policy_rules`, `risk_assessments`, `underwriting_decisions`, `audit_logs`). No redundant tables or parallel schemas will be introduced.
* **Workspace UI Reuse:** The existing 6-step customer wizard (`LoanApplicationWizard.jsx`), customer status tracker (`ApplicationDetailsPage.jsx`), and underwriter desk (`AdminApplicationWorkspace.jsx`) will be directly enhanced with the new widgets rather than rebuilt.

### Requirement Status Summary

| Req # | Requirement Area | Status | Core Implemented Assets | Primary Missing / Incomplete Workflow |
|---|---|---|---|---|
| **1** | External Data Source Integration | **PARTIALLY IMPLEMENTED** | DB tables (`external_data_sources`, `external_verification_attempts`); UI integration cards | Real Account Aggregator (AA) ingestion client; JSON transaction normalizer; live AA webhook handlers |
| **2** | Eligibility & Credit Policy Engine | **ALREADY IMPLEMENTED** | `underwritingEngine.js` with Section 31 LTV caps, FOIR, LAP LTV, cooling-off floor; `credit_policy_rules` table | Admin UI for dynamically updating credit policy rules without redeploying code |
| **3** | Fraud Detection & KYC/AML | **PARTIALLY IMPLEMENTED** | DB tables (`fraud_alerts`, `compliance_checks`); UI anomaly detection display | Automated document tampering detection (ELA/font forensics); live AML watchlist API adapter |
| **4** | Transparent Risk Scoring | **PARTIALLY IMPLEMENTED** | DB table (`risk_assessments`); visual risk gauge and risk factor cards in underwriter workspace | Multi-attribute scorecard calculation engine deriving risk points from ingested tradelines |
| **5** | Document & Property Verification | **PARTIALLY IMPLEMENTED** | Private Supabase Storage; Web Crypto SHA-256; 180s signed URLs; OCR metadata schema | Dual-track Legal Scrutiny (LSR) and Technical Valuation (TVR) empanelled advocate/valuer workflow |
| **6** | Regulatory & Compliance Checks | **ALREADY IMPLEMENTED** | Statutory LTV tiers (90/80/75%); stamp duty exclusion; DPDP Act consent logging in `consent_records` | Automated Key Fact Statement (KFS) PDF generator with Annual Percentage Rate (APR) schedule |
| **7** | Automated Instant Decisioning | **PARTIALLY IMPLEMENTED** | Atomic RPC `record_underwriting_decision`; `underwriting_decisions` table; underwriter review workspace | Straight-through processing (STP) auto-approval on intake submission for prime applications |
| **8** | Explainability & Governance | **PARTIALLY IMPLEMENTED** | Rule-by-rule citations; immutable `audit_logs` & `application_status_history` PostgreSQL triggers | Interactive "What-If" counterfactual scenario calculator for borrowers and underwriters |

---

## 2. Detailed Requirement Gap Analysis

---

### Requirement 1: External Data Source Integration (Benchmark: FinBox)

#### Existing Implementation
* **Database Layer:** [supabase/migrations/20261113000004_create_provider_registry_and_attempts.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000004_create_provider_registry_and_attempts.sql) defines `external_data_sources` and `external_verification_attempts` tables. Seeded with 6 external source records: `DIGILOCKER`, `NSDL_PAN`, `CIBIL`, `ACCOUNT_AGGREGATOR`, `LAND_REGISTRY`, and `AML_WATCHLIST`.
* **Frontend Layer:** [src/pages/customer/ApplicationDetailsPage.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/customer/ApplicationDetailsPage.jsx) and [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) display simulated verification badges (`DigiLocker Verified`, `NSDL PAN 100% Match`, `Account Aggregator Statement Verified`).
* **Service Layer:** [src/services/applicationService.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/applicationService.js) handles application intake and document uploads, but does NOT connect to live Account Aggregator or DigiLocker APIs.

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Data contracts, database schema, status tracking tables, and frontend verification UI badges.
* **What is Missing:**
  1. Real or sandbox Account Aggregator consent initiation and polling flow.
  2. Transaction classification engine that parses 6 months of bank statement transactions into income, EMI debits, and bounce tallies.
  3. Dynamic income recalculator that substitutes declared borrower income with AA-verified income.

#### Recommended Next Actions
* Build an Account Aggregator adapter in `src/services/externalDataService.js` that ingests standard Sahamati-formatted bank statement JSON feeds, computes Average Monthly Balance (AMB), counts inward return charges, and feeds verified cashflow into `underwritingEngine.js`.
* **Priority:** **High (P1)**

---

### Requirement 2: Eligibility & Credit Policy Engine (Benchmark: Provenir)

#### Existing Implementation
* **Engine Core:** [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js) contains fully working deterministic mathematical calculations:
  * `calculateEMI(principal, annualRate, tenureMonths)` — Standard reducing balance formula.
  * `calculateFOIR(existingObligations, proposedEMI, netMonthlyIncome)` — Strict debt-to-income ratio.
  * `calculateLTV(loanAmount, propertyMarketValue)` — Loan-to-value percentage.
  * `calculateMaxEligibleLoanAmount(...)` — Reverse-engineers maximum permissible loan from 55% FOIR ceiling.
  * `evaluateCreditPolicyRules(...)` — Evaluates statutory Home Loan LTV (90% <= 30L, 80% 30L-75L, 75% > 75L), LAP 60% benchmark, FOIR 55% ceiling, bureau 650 cut-off, and RBI cooling-off minimum 1 day.
* **Database Layer:** [supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql) contains `credit_policy_rules`, `credit_policy_versions`, and `preliminary_eligibility_assessments`. Seeded in Migration 009 with 9 institutional rules.
* **Customer Intake:** [src/pages/customer/LoanApplicationWizard.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/customer/LoanApplicationWizard.jsx) runs preliminary underwriting in Step 6 and records assessment rows upon submission.

#### Implementation Classification
* **Status:** **ALREADY IMPLEMENTED**
* **What Works:** Deterministic rule evaluation, statutory RBI Section 31 LTV rules, product segregation (HL vs LAP), and non-binding assessment persistence.
* **What is Missing / Can Be Improved:**
  1. Visual policy configuration panel allowing senior credit managers to adjust FOIR or LAP LTV benchmarks in the database without altering source code.
  2. Multi-tiered exception matrix mapping specific policy breaches to authorized approver levels (e.g. Branch Manager vs Zonal Credit Committee).

#### Recommended Next Actions
* Add an administrative Credit Policy Management view in `src/pages/admin/` enabling authorized staff to toggle rules in `credit_policy_rules`.
* **Priority:** **Medium (P2)**

---

### Requirement 3: Fraud Detection & KYC/AML (Benchmark: Sardine AI)

#### Existing Implementation
* **Database Layer:** [supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql) defines `fraud_alerts` table (`alert_category`, `severity`, `rule_triggered`, `description`, `is_resolved`).
* **Frontend Layer:** [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) renders the "Risk & Fraud Intelligence" tab with visual alerts, anomaly indicators, and AML watchlist status.
* **Mock Data:** [src/data/mockData.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/data/mockData.js) provides rich synthetic fraud scenarios (e.g., duplicate PAN velocity, circular bank deposits, employer address anomalies).

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Database alert tracking schema, underwriter alert triage UI, and data contracts.
* **What is Missing:**
  1. Automated document forensics engine scanning uploaded PDFs for graphic editing artifacts, suspicious creation tools, or font discrepancies.
  2. Name-matching algorithms (e.g. Jaro-Winkler or Levenshtein distance) checking phonetic and spelling deviations between declared applicant name, PAN card OCR, and bank account holder name.
  3. Duplicate collateral address detection across previous applications to prevent loan stacking.

#### Recommended Next Actions
* Implement client-side and server-side heuristic fraud screening in `src/services/fraudDetectionService.js`:
  * String distance comparison across PAN, Aadhaar, and Bank name.
  * PDF metadata inspection for prohibited authoring tools.
  * Multi-application collateral duplicate detection.
* **Priority:** **High (P2)**

---

### Requirement 4: Transparent Risk Scoring (Benchmark: Experian)

#### Existing Implementation
* **Database Layer:** [supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000005_create_policy_risk_and_assessments.sql) defines `risk_assessments` table (`pd_score`, `risk_category`, `risk_score_factors`).
* **Frontend Layer:** [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) visualizes a numerical risk score (0-100), default probability tier (`low`, `medium`, `high`), and an explainable list of positive and negative score drivers (e.g. `+18 pts Prime Bureau`, `+14 pts Conservative FOIR`).
* **Engine Core:** [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js) computes basic cashflow ratios (FOIR, LTV, DTI), but currently does not calculate the composite numerical 0-100 score dynamically from application inputs.

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Database structure, underwriter risk gauge presentation, and positive/negative factor attribution UI.
* **What is Missing:**
  1. A dynamic, transparent scorecard algorithm in code that calculates the 0-100 risk score and derives default probability from actual application variables (Bureau + FOIR + LTV + Employment Vintage).
  2. Documented weight distribution, calibrated score ranges, deterministic reason codes, and clear statutory vs internal model boundary disclaimers.

#### Calibrated Illustrative Internal Scorecard Specification
To ensure complete transparency and prevent research assumptions from being mistaken for econometric credit-default probability models, NIRNAY calibrates this additive model with documented weights, score cut-offs, and deterministic reason codes:

* **Score Formula:**
  $$\text{Composite Risk Score} = \text{Base (50)} + \Delta_{\text{Bureau}} + \Delta_{\text{FOIR}} + \Delta_{\text{LTV}} + \Delta_{\text{Vintage}}$$
  *(Clamped strictly between 0 and 100)*

* **Documented Factor Weights & Attribution Tiers:**
  | Risk Attribute | Input Parameter Range | Score Adjustment | Reason Code | Explanation |
  |---|---|---|---|---|
  | **Bureau Tier** ($\pm 20$ pts) | CIBIL $\ge 750$ | $+20$ pts | `RC_BUR_PRIME` | Excellent credit history, low default probability |
  | | CIBIL $700 - 749$ | $+10$ pts | `RC_BUR_GOOD` | Satisfactory credit track record |
  | | CIBIL $650 - 699$ | $0$ pts | `RC_BUR_MODERATE` | Borderline bureau score, requires manual verification |
  | | CIBIL $< 650$ or DPD $> 30$ | $-20$ pts | `RC_BUR_SUBPRIME` | Elevated credit risk / recent delinquencies |
  | **FOIR Stress** ($\pm 15$ pts) | $\text{FOIR} \le 40.0\%$ | $+15$ pts | `RC_FOIR_COMFORT` | Robust cashflow buffer for debt servicing |
  | | $\text{FOIR} \in (40.0\%, 50.0\%]$ | $+5$ pts | `RC_FOIR_ACCEPTABLE` | Adequate disposable income cushion |
  | | $\text{FOIR} \in (50.0\%, 55.0\%]$ | $0$ pts | `RC_FOIR_THRESHOLD` | Operating near internal policy ceiling |
  | | $\text{FOIR} > 55.0\%$ | $-15$ pts | `RC_FOIR_STRETCH` | Cashflow overleveraged, breach of standard policy |
  | **LTV Collateral Cushion** ($\pm 10$ pts) | $\text{LTV} \le 65.0\%$ | $+10$ pts | `RC_LTV_CONSERVATIVE` | Substantial borrower equity / liquidation buffer |
  | | $\text{LTV} \in (65.0\%, 75.0\%]$ | $+5$ pts | `RC_LTV_MODERATE` | Standard collateral safety margin |
  | | $\text{LTV} \in (75.0\%, 80.0\%]$ | $0$ pts | `RC_LTV_HIGH` | Modest collateral cushion |
  | | $\text{LTV} > 80.0\%$ | $-10$ pts | `RC_LTV_MAXED` | Low borrower equity, higher loss given default |
  | **Employment Vintage** ($\pm 5$ pts) | Current Stability $> 3$ Years | $+5$ pts | `RC_VINTAGE_STABLE` | Established occupational and income continuity |
  | | Current Stability $1 - 3$ Years | $+2$ pts | `RC_VINTAGE_ADEQUATE`| Standard occupational tenure |
  | | Current Stability $< 1$ Year | $-5$ pts | `RC_VINTAGE_PROBATION`| Recent job change / unproven income stability |

* **Calibrated Decision Thresholds:**
  * **$80 - 100$ (Low Risk / Prime):** Straight-Through Processing (STP) auto-sanction eligible (subject to clear title and zero fraud flags).
  * **$65 - 79$ (Moderate Risk / Standard):** Underwriter standard review path; approved with standard documentation.
  * **$50 - 64$ (Elevated Risk / Borderline):** Senior Credit Officer review; requires additional collateral, lower loan amount, or co-borrower addition.
  * **$< 50$ (High Risk / Subprime):** Policy decline or credit committee referral with exceptional risk mitigants.

* **Mandatory Governance Disclaimer & Limitations:**
  > [!IMPORTANT]
  > **Model Classification:** Illustrative Internal Risk Scorecard for Hackathon Prototype Decisioning — **NOT an Econometrically Validated Credit-Default Probability (PD) Model.**
  > **Limitations:** This scorecard is a deterministic rule-based multi-attribute weighting system. It has not been calibrated or backtested on empirical historical mortgage loan default panels from Hero Housing Finance Limited. It must not be cited as a Basel III / AIRB internal ratings-based or IFRS 9 Expected Credit Loss (ECL) statistical model.

#### Recommended Next Actions
* Extend the existing [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js) by implementing `calculateAdditiveRiskScore()` using the calibrated weights and reason codes above, saving results into the existing `risk_assessments` table.
* **Priority:** **High (P2)**

---

### Requirement 5: Document & Property Verification (Benchmark: BUMI)

#### Existing Implementation
* **Storage Layer:** [supabase/migrations/20261113000008_configure_storage_bucket_and_policies.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000008_configure_storage_bucket_and_policies.sql) provides private bucket `mortgage-documents` with strict RLS and anti-traversal path checks.
* **Security & Integrity:** [src/services/applicationService.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/applicationService.js) calculates authentic cryptographic Web Crypto SHA-256 digests (`computeFileSHA256`) and generates 180-second short-lived signed URLs (`getDocumentSignedUrl`).
* **Database Layer:** [supabase/migrations/20261113000002_create_core_application_dossier.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000002_create_core_application_dossier.sql) defines `property_details` (`property_type`, `property_stage`, `carpet_area_sqft`, `estimated_market_value`, `technical_valuation_amount`, `property_title_status`, `rera_number`).
* **UI Workspace:** [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) renders the Document OCR tab, extracted attributes, verified SHA-256 badge, and "Inspect Vault Document" action.

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Secure private storage, authentic cryptographic checksums, signed URLs, document version tracking, and property specifications.
* **What is Missing:**
  1. Formal Legal Scrutiny Report (LSR) workflow tracking (advocate assignment, 30-year title chain verification, encumbrance certificate status).
  2. Formal Technical Valuation Report (TVR) workflow tracking (valuer assignment, independent realizable market value, boundary check).
  3. Dynamic collateral valuation base calculation applying the institutional credit policy rule: $\text{Valuation Base} = \min(\text{Agreement Value}, \text{Valuer Realizable Value})$.

#### Regulatory & Policy Valuation Distinction
> [!NOTE]
> **Statutory RBI Mandate vs. Institutional Lender Policy:**
> - **Statutory Mandate (RBI HFC Master Directions 2021, Section 31):** Prescribes statutory LTV ceilings (90%, 80%, 75%) based on the total cost/value of the property and explicitly mandates the **strict exclusion of stamp duty, registration, and documentation charges** from the valuation base.
> - **Institutional Lender Policy (Prudent Credit Practice):** In mortgage underwriting, determining the collateral valuation base as $\min(\text{Agreement Value}, \text{Valuer Realizable Value})$ is an **institutional risk control** adopted by prudent HFCs to protect against over-invoicing and collusive purchase prices. It is governed under the HFC's Board-approved valuation policy (aligned with NHB / IBA valuation standards), not codified as a statutory mathematical formula within Section 31 text.

#### Recommended Next Actions
* Extend the collateral review module to support dual-track LSR and TVR verification, enforcing that LTV is computed on $\min(\text{Agreement Value}, \text{Valuer Realizable Value})$ as an internal credit policy rule.
* **Priority:** **High (P1)**

---

### Requirement 6: Regulatory & Compliance Checks (Benchmark: RBI / NHB)

#### Existing Implementation
* **Statutory LTV Caps:** [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js#L90-L116) implements Section 31 of the RBI HFC Master Directions:
  * Loans up to ₹30L: 90.0% cap
  * Loans ₹30L to ₹75L: 80.0% cap
  * Loans above ₹75L: 75.0% cap
* **Stamp Duty Exclusion:** Calculations explicitly separate stamp duty and registration charges from the property market value.
* **Statutory Cooling-Off Period:** Explicitly enforces a minimum 1-day cooling-off / look-up window in accordance with RBI Digital Lending Directions, 2025.
* **Digital Consent Framework:** [src/services/applicationService.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/applicationService.js#L253-L265) records statutory digital consent into `consent_records` with applicant ID, legal text version, IP address, user-agent, and 1-year validity under the DPDP Act, 2023.

#### Implementation Classification
* **Status:** **ALREADY IMPLEMENTED**
* **What Works:** Mandatory RBI Section 31 LTV caps, stamp duty exclusions, cooling-off rules, DPDP consent tracking, and regulatory citations.
* **What is Missing / Can Be Improved:**
  1. Automated generation of the standardized **Key Fact Statement (KFS)** format prescribed by RBI Fair Lending Conduct circulars, containing the Annual Percentage Rate (APR), detailed amortization schedule, and explicit zero-penal-interest terms.

#### Recommended Next Actions
* Implement a KFS generator utility in `src/services/complianceService.js` that compiles an official disclosure sheet for approved applications.
* **Priority:** **High (P2)**

---

### Requirement 7: Automated Instant Decisioning (Benchmark: Zest AI)

#### Existing Implementation
* **Tri-State Logic Core:** [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js#L262-L272) evaluates policy rules and categorizes cases into `passed` (Approve), `referred` (Refer), or `declined` (Reject).
* **Adjudication Workspace:** [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) provides an underwriter adjudication modal with outcome selection (`APPROVE`, `REJECT`, `REFER`), sanctioned loan terms, and decision remarks.
* **Transactional Persistence:** [supabase/migrations/20261113000010_remediation_fixes_and_rpcs.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000010_remediation_fixes_and_rpcs.sql) defines `public.record_underwriting_decision(...)`, which verifies staff credentials and atomically writes decisions, decision reasons, and status transitions.

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Underwriter adjudication workspace, atomic database persistence, decision reason capture, and tri-state evaluation logic.
* **What is Missing:**
  1. **Straight-Through Processing (STP) Auto-Sanction:** When a low-risk, prime application satisfies all statutory and policy rules upon intake, it currently enters `pending_underwriter_triage` rather than instantly generating an automated provisional sanction letter.
  2. Formal Adverse Action Notice generator that exports principal rejection reasons.

#### Recommended Next Actions
* Add an automated STP decisioning path on intake submission for super-prime cases, and generate downloadable Sanction / Adverse Action documents.
* **Priority:** **High (P1)**

---

### Requirement 8: Explainability & Governance (Benchmark: Fiddler AI)

#### Existing Implementation
* **Rule-by-Rule Transparency:** [src/services/underwritingEngine.js](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/services/underwritingEngine.js#L103-L215) returns an array of `policyEvaluations` where each rule includes its rule code, statutory flag, legal citation, actual metric, threshold, status, and human-readable explanation.
* **Underwriter Visibility:** [src/pages/admin/AdminApplicationWorkspace.jsx](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/src/pages/admin/AdminApplicationWorkspace.jsx) renders the Compliance and Risk tabs displaying every rule evaluated.
* **Immutable Audit Trail:** [supabase/migrations/20261113000006_create_decisions_audit_and_consents.sql](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/supabase/migrations/20261113000006_create_decisions_audit_and_consents.sql) attaches PostgreSQL trigger `trg_track_loan_app_status` to log every status transition into `application_status_history`, and protects `audit_logs` against user modification.

#### Implementation Classification
* **Status:** **PARTIALLY IMPLEMENTED**
* **What Works:** Transparent rule explanations, statutory citations, status transition history, and tamper-resistant audit logs.
* **What is Missing:**
  1. **Interactive "What-If" Counterfactual Engine:** Neither the customer portal nor the underwriter desk allows users to test counterfactual scenarios (e.g., "How does extending tenure by 36 months or increasing down payment by ₹3 Lakh affect FOIR and loan eligibility?").
  2. Explainability dashboard for model and policy version governance.

#### Recommended Next Actions
* Implement a client-side What-If Counterfactual Calculator in `src/components/common/CounterfactualSimulator.jsx` that dynamically simulates how adjusting loan amount, tenure, or income impacts the decision verdict in real time.
* **Priority:** **High (P2)**

---

## 3. Comprehensive Feature Status Ledger

```
+------------------------------------------------------+-------------------------+--------------------+
| Feature Component                                    | Implementation Status   | Target Requirement |
+------------------------------------------------------+-------------------------+--------------------+
| PostgreSQL 24 Domain Tables & Foreign Key Integrity  | ALREADY IMPLEMENTED     | Foundation         |
| Row Level Security (RLS) Multi-Tenant Data Isolation | ALREADY IMPLEMENTED     | Foundation         |
| Private Supabase Storage with Path Hardening         | ALREADY IMPLEMENTED     | Storage / Doc Mgmt |
| Web Crypto Native SHA-256 Checksum Calculation       | ALREADY IMPLEMENTED     | Storage / Doc Mgmt |
| Expiring Signed Document Download URLs               | ALREADY IMPLEMENTED     | Storage / Doc Mgmt |
| Statutory Section 31 Housing Loan LTV Caps           | ALREADY IMPLEMENTED     | Req 2 & Req 6      |
| Statutory Exclusion of Stamp Duty from Loan Base     | ALREADY IMPLEMENTED     | Req 6              |
| Statutory Minimum 1-Day Cooling-Off Rule Floor       | ALREADY IMPLEMENTED     | Req 6              |
| Statutory DPDP Act Digital Consent Logging           | ALREADY IMPLEMENTED     | Req 1 & Req 6      |
| Separate Home Loan vs LAP Policy Rules               | ALREADY IMPLEMENTED     | Req 2              |
| Atomic Underwriting Decision RPC Procedure           | ALREADY IMPLEMENTED     | Req 7              |
| Atomic Application Draft Save RPC Procedure          | ALREADY IMPLEMENTED     | Foundation         |
| Protected Route Guards & Staff RBAC                  | ALREADY IMPLEMENTED     | Foundation         |
| Account Aggregator Financial Ingestion Adapter       | MISSING                 | Req 1              |
| Multi-Bank Statement JSON Transaction Normalizer     | MISSING                 | Req 1              |
| Dynamic Policy Editor for Authorized Risk Staff      | MISSING                 | Req 2              |
| Automated Document Forensic & Tampering Heuristics   | MISSING                 | Req 3              |
| Dynamic 0-100 Scorecard Point Attribution Engine     | PARTIALLY IMPLEMENTED   | Req 4              |
| Dual-Track Legal (LSR) & Valuation (TVR) Workflow    | PARTIALLY IMPLEMENTED   | Req 5              |
| Conservative Realizable Value LTV Enforcement        | PARTIALLY IMPLEMENTED   | Req 5              |
| Automated Key Fact Statement (KFS) PDF Compiler      | MISSING                 | Req 6              |
| Straight-Through Processing (STP) Auto-Sanction      | PARTIALLY IMPLEMENTED   | Req 7              |
| Interactive What-If Counterfactual Scenario Engine   | MISSING                 | Req 8              |
+------------------------------------------------------+-------------------------+--------------------+
```

