# NIRNAY — Reference Platform Analysis & Reverse Engineering Study

**Platform:** NIRNAY (Digital Mortgage Underwriting Engine)  
**Target Institution:** Hero Housing Finance Limited (HHFL)  
**Research Phase:** Phase 1 — Reference Research & Product Reverse Engineering  
**Scope:** In-depth investigation of 8 benchmark fintech platforms across the 8 core hackathon requirements.  
**Investigation Mode:** REA (Reverse Engineer Anything), official documentation scrutiny, and public technical asset extraction.  
**Rule Adherence:** Research-only document. No codebase mutations or schema alterations performed.  

---

## 1. Executive Research Overview

This document presents a structured reverse-engineering analysis of eight global and Indian fintech platforms selected to benchmark the core functional modules of NIRNAY. Rather than cloning monolithic architectures, this study isolates the strongest individual component patterns—data ingestion pipelines, directed acyclic graph (DAG) decision workflows, behavioral device fingerprinting, multi-layered property legal/technical assessments, explainable credit scoring, and statutory compliance checks—and adapts them into an institutional mortgage underwriting blueprint for Hero Housing Finance.

### Reference Platform Mapping

| Req # | Hackathon Requirement | Benchmark Platform | Official URL / Product Link | Primary Observable Architectural Pattern |
|---|---|---|---|---|
| **1** | External Data Integration | **FinBox** | `https://www.finbox.in/products/account-aggregator` | Multi-FIP Account Aggregator routing, bank statement JSON parsing, cashflow metric derivation |
| **2** | Credit Policy & Eligibility | **Provenir** | `https://www.provenir.com/platform/decisioning/` | Visual low-code DAG decision orchestration, knockout rule execution, product-specific policies |
| **3** | Fraud Detection & KYC/AML | **Sardine AI** | `https://www.sardine.ai/` | Behavioral telemetry, document tampering detection, True Piercing proxy unmasking, consortium AML |
| **4** | Risk Scoring | **Experian** | `https://www.experian.com/business/solutions/credit-decisioning` | PowerCurve strategy management, scorecard point attribution, risk-based pricing segmentation |
| **5** | Property & Document Verification | **BUMI** | `https://www.bumi.co.in/` | Parallel Legal Scrutiny (LSR) & Technical Valuation (TVR), empanelled advocate/valuer portal |
| **6** | Regulatory & Statutory Compliance | **Reserve Bank of India (RBI)** | `https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12654` | Master Direction – HFCs Section 31 LTV caps, stamp duty exclusions, Digital Lending Directions 2025 |
| **7** | Automated Instant Decisioning | **Zest AI** | `https://www.zest.ai/` | Tri-state routing (Approve / Reject / Refer), straight-through processing (STP), adverse action reason codes |
| **8** | Explainability & Governance | **Fiddler AI** | `https://www.fiddler.ai/explainable-ai` | Shapley value (SHAP) local/global feature attributions, what-if counterfactuals, model drift observability |

---

## 2. Platform 1: FinBox — External Data Source Integration & Account Aggregator

### 2.1. Product Overview & Purpose
FinBox (`finbox.in`) operates enterprise financial infrastructure for Indian regulated entities (banks and NBFCs). Its flagship **BankConnect** and **Account Aggregator (AA)** suite automates the ingestion, normalization, fraud screening, and underwriting analytics of applicant bank statements and financial assets.

### 2.2. Architectural Workflow & Data Journey

```
[Borrower Phone / Identifier]
        │
        ▼
[Smart AA Router (Finvu / Setu / Anumati / CAMS)] ──(Consent Rejection)──► [Fallback: NetBanking / PDF Upload]
        │
        ▼
[Consent Artifact Signed (RBI AA Framework)]
        │
        ▼
[FIP Data Retrieval: Encrypted JSON Financial Feeds]
        │
        ▼
[BankConnect Ingestion Engine (150+ Bank Formats Normalized)]
        │
        ├──► [Transaction Categorization Engine (Salary, Business, Rent, EMI)]
        ├──► [Cashflow & Liquidity Profiler (AMB, Inward Bounces, Net Disposable Income)]
        └──► [Statement Tampering & Circular Transaction Detector]
        │
        ▼
[Normalized Financial Ledger Fed to Underwriting Engine (FOIR / Cashflow Ratios)]
```

### 2.3. Key Features & Reverse-Engineered Findings

1. **Smart AA Routing Layer:** In the Indian AA ecosystem, individual Financial Information Providers (FIP banks) frequently suffer downtime. FinBox uses dynamic router failovers across multiple Financial Information User (FIU) gateways (such as Finvu, Setu, and Anumati) to maximize consent-to-pull success rates.
2. **Deterministic Transaction Tagging:** Raw bank statement line items are mapped into standard accounting buckets:
   * **Salary Credits:** Verified by detecting recurring employer narration strings, NEFT/RTGS transaction codes, and vintage patterns.
   * **Debt Obligations:** Identifies existing EMIs via recurring NACH/ECS debit mandates, loan provider keywords, and fixed monthly dates.
   * **Bounces & Dishonor:** Specifically tallies inward return charges (`INW RET`, `CHEQUE RETURN`, `ECS BOUNCE`), directly feeding into credit policy knockouts.
   * **Average Monthly Balance (AMB):** Computed across daily end-of-day balances rather than simple month-end snapshots to identify cashflow volatility.
3. **Hybrid Fallback Workflow:** If an applicant's bank is not live on the AA framework or OTP verification fails, the journey falls back gracefully to NetBanking scraping or password-protected PDF statement upload with automated PDF password extraction.

### 2.4. Feature Extraction Table (FinBox)

| Field | Detail |
|---|---|
| **Reference Feature** | Smart Account Aggregator Routing & BankConnect Financial Normalization |
| **Problem Solved** | Manual bank statements are easily manipulated, slow to verify, and format-inconsistent across 150+ banks. |
| **Workflow** | User initiates AA consent &rarr; Router connects to best FIP gateway &rarr; Decrypts JSON feed &rarr; Parses transactions &rarr; Generates verified income & obligation metrics. |
| **Input Data** | Borrower Mobile No., Bank Selection, AA Consent Artifact, Bank Statement JSON / PDF. |
| **Processing** | Multi-bank schema normalization, transaction classification, recurring EMI detection, inward bounce counting. |
| **Output Data** | Verified Monthly Income, Existing Monthly Obligations, Average Monthly Balance (AMB), Bounce Count. |
| **Exception Handling** | If AA consent expires or fails: triggers fallback to manual statement upload; if statement is password-protected: prompts applicant for statement password with OCR verification. |
| **NIRNAY Adaptation** | Integrate into `src/services/applicationService.js` to populate `financial_details` and `external_verification_attempts` automatically, bypassing self-declared income bias. |
| **Priority** | **Critical (P1)** |
| **Evidence / Source** | [FinBox Account Aggregator](https://www.finbox.in/products/account-aggregator) & FinBox BankConnect Technical Specifications. |

---

## 3. Platform 2: Provenir — Eligibility & Credit Policy Engine

### 3.1. Product Overview & Purpose
Provenir (`provenir.com`) is a global credit risk decisioning platform that separates credit policy logic from application code. It provides risk teams with a visual, low-code interface to build, simulate, and deploy complex credit decision workflows without developer intervention.

### 3.2. Architectural Workflow & Decision Logic

```
[Loan Dossier Input]
        │
        ▼
[Stage 1: Pre-Screen Knockout Rules] (Age < 21, Blacklisted Pin Code, NSDL PAN Invalid)
   ├── FAIL ──► [Hard Decline: Adverse Action Notice Generated]
   └── PASS
        │
        ▼
[Stage 2: Statutory Regulatory Gates] (RBI HFC Mandatory LTV Caps: 90% / 80% / 75%)
   ├── FAIL ──► [Hard Decline: Statutory Cap Breach]
   └── PASS
        │
        ▼
[Stage 3: Product-Specific Credit Policy Matrix]
   ├── [Home Loan Policy DAG] ──► Max LTV 80-90%, FOIR 55%, Min Vintage 2 yrs
   └── [LAP Policy DAG]       ──► Max LTV 60% (Lender Benchmark), FOIR 50%, Cashflow Haircut
        │
        ▼
[Stage 4: Exception & Deviation Routing]
   ├── Clean Pass  ──► [Auto-Approval Pathway]
   ├── Minor Risk  ──► [Referred to Credit Committee with Compensating Factors Checklist]
   └── Hard Breach ──► [Automated Rejection]
```

### 3.3. Key Features & Reverse-Engineered Findings

1. **Separation of Policy from Code:** Credit policies are treated as versioned configuration trees rather than hardcoded `if/else` statements. This allows instant updates when statutory or internal policies shift.
2. **Deterministic Rule Execution Hierarchy:** Rules are evaluated in strict tiered sequence:
   * *Knock-out Rules:* Immediate termination if fundamental eligibility criteria fail.
   * *Statutory Limits:* Hard non-negotiable regulatory boundaries.
   * *Lender Policy Rules:* Soft thresholds capable of triggering exceptions or underwriter referrals.
3. **Product-Specific Rule Branches:** Recognizes that Home Loans (secured purchase of residential shelter) and Loans Against Property (unrestricted cash-out liquidity against existing collateral) carry fundamentally different risk profiles, applying distinct LTV and debt-servicing benchmarks.

### 3.4. Feature Extraction Table (Provenir)

| Field | Detail |
|---|---|
| **Reference Feature** | Hierarchical Credit Policy Rules Engine & Decision Matrix |
| **Problem Solved** | Hardcoding policy rules inside application code makes policy changes brittle, slow to audit, and prone to silent failures. |
| **Workflow** | Ingest application &rarr; Run knockout filter &rarr; Check statutory RBI caps &rarr; Apply product-specific policy (HL vs LAP) &rarr; Output rule-by-rule scorecard. |
| **Input Data** | Declared & verified financial metrics, collateral valuation, bureau score, applicant vintage. |
| **Processing** | Rule evaluation against threshold matrices, condition tagging (`PASS`, `FAIL`, `REFER`), exception categorization. |
| **Output Data** | Structured `policy_evaluations` array with rule code, statutory flag, threshold, actual value, and deviation explanation. |
| **Exception Handling** | Soft threshold breaches route the application to human underwriter queue with mandatory compensating factors checklist. |
| **NIRNAY Adaptation** | Structure `src/services/underwritingEngine.js` and `credit_policy_rules` table to support dynamic policy evaluation with independent HL and LAP rule branches. |
| **Priority** | **Critical (P1)** |
| **Evidence / Source** | [Provenir Decisioning Platform](https://www.provenir.com/platform/decisioning/) & Provenir Decision Studio Documentation. |

---

## 4. Platform 3: Sardine AI — Fraud Detection, Identity Proofing & KYC/AML

### 4.1. Product Overview & Purpose
Sardine (`sardine.ai`) is an enterprise fraud prevention and compliance platform specializing in device telemetry, behavioral biometrics, and multi-layered document fraud detection to combat synthetic identity theft and unauthorized digital loan applications.

### 4.2. Architectural Workflow & Fraud Screening Pipeline

```
[Client Web / Mobile Session]
        │
        ├──► [Device Telemetry: Canvas Fingerprint, WebGL, Battery API, Screen Coords]
        ├──► [Network Inspection: True Piercing™ VPN / Residential Proxy Detection]
        └──► [Behavioral Biometrics: Keystroke Flight Time, Copy-Paste Detection, Tab Switching]
        │
        ▼
[Document Intake Forensics]
        │
        ├──► [PDF Object Tree Parsing: Font Inconsistencies, Software Creation Tools (Canva, Photoshop)]
        ├──► [Image Forensics: Error Level Analysis (ELA), EXIF Timestamp Tampering]
        └──► [Cross-Document OCR Field Mismatch: Name on PAN vs Name on Bank Statement]
        │
        ▼
[AML & Sanctions Screening]
        │
        └──► [Watchlists: UN Sanctions, OFAC, CBI/ED Records, PEP Database]
        │
        ▼
[Consortium Sonar Network Check: Duplicate PAN / Collateral Address Hits]
        │
        ▼
[Unified Fraud Risk Score (0-100) + Explainable Anomaly Badges]
```

### 4.3. Key Features & Reverse-Engineered Findings

1. **Behavioral Biometrics & Typing Telemetry:** Distinguishes genuine borrowers filling out their own details from fraudsters running lists of stolen identities. Rapid copy-pasting of PAN numbers, erratic window-switching, and absence of natural keystroke hesitations generate fraud signals.
2. **Document Tampering Forensics:** Scans uploaded loan documents (salary slips, bank statements, title deeds) for digital manipulation markers:
   * Metadata showing modification in graphic editors (e.g. Photoshop, PDFescape).
   * Inconsistent font metrics or misaligned text blocks on financial statements.
   * Compression artifact discrepancies via Error Level Analysis (ELA).
3. **Consortium Anti-Fraud Intelligence (Sonar):** Cross-checks identifiers (PAN, phone, property address) across multiple lenders to identify loan stacking (applying for multiple mortgages on the same property simultaneously).

### 4.4. Feature Extraction Table (Sardine AI)

| Field | Detail |
|---|---|
| **Reference Feature** | Multi-Layered Document Forensics & AML Watchlist Screening |
| **Problem Solved** | Borrowers and intermediaries submit fabricated income slips, doctored bank statements, or undisclosed collateral mortgages. |
| **Workflow** | Document uploaded &rarr; Header/metadata parsed &rarr; Forensic OCR scans font alignment &rarr; Watchlist screening against PEP/AML databases &rarr; Generates fraud alerts. |
| **Input Data** | Uploaded document bytes, applicant PAN, full legal name, IP address, device user-agent. |
| **Processing** | Metadata extraction, string distance comparison against verified KYC, PEP database lookup. |
| **Output Data** | Fraud risk flags, severity level (`CRITICAL`, `WARNING`, `INFO`), anomaly explanations. |
| **Exception Handling** | Document tampering flags mark application status as `REFER_TO_FRAUD_OPS`, locking auto-approval. |
| **NIRNAY Adaptation** | Wire into `fraud_alerts` and `compliance_checks` tables; render dedicated "Fraud & Anomaly Intelligence" tab in `AdminApplicationWorkspace.jsx`. |
| **Priority** | **High (P2)** |
| **Evidence / Source** | [Sardine AI Platform](https://www.sardine.ai/) & Sardine Device Intelligence Whitepaper. |

---

## 5. Platform 4: Experian — Risk Scoring & Decision Strategy

### 5.1. Product Overview & Purpose
Experian (`experian.com`) provides institutional credit risk scoring and strategy management through its **PowerCurve** suite. It translates raw credit bureau tradelines and applicant characteristics into a multi-dimensional risk score, driving risk-based loan pricing and underwriting segmentation.

### 5.2. Architectural Workflow & Credit Attribute Synthesis

```
[CIBIL / Experian Bureau Ingestion]
        │
        ▼
[Credit Tradeline Attribute Extraction]
   ├── Delinquency Depth: 30/60/90+ Days Past Due (DPD) in last 24 months
   ├── Credit Utilization: Revolving balance vs credit card limit
   ├── Inquiry Velocity: Number of hard bureau inquiries in last 90 days
   └── Secured vs Unsecured Ratio: Mortgage/Auto loan vintage vs Personal/Payday loans
        │
        ▼
[Dual-Scorecard Aggregation Engine]
   ├── Bureau Scorecard (e.g. CIBIL Score 300 - 900)
   └── Application Scorecard (Income Stability, Vintage, Collateral Equity Cushion)
        │
        ▼
[Unified Numerical Risk Score (0 - 100) & Risk Tier Categorization]
   ├── Super Prime (80 - 100): Lowest Default Probability &rarr; Benchmark Rate
   ├── Prime (65 - 79): Moderate Low Risk &rarr; Standard Rate
   ├── Near Prime (50 - 64): Borderline Risk &rarr; Risk Premium Spread (+50 to +100 bps)
   └── Subprime (< 50): High Default Risk &rarr; Rejection or Severe Loan Haircut
        │
        ▼
[Score Breakdown Attribution: Key Positive & Negative Score Drivers]
```

### 5.3. Key Features & Reverse-Engineered Findings

1. **Credit Attribute Derivation:** Raw bureau XML/JSON feeds are parsed into standardized credit attributes (e.g., `TOTAL_ACTIVE_TRADELINES`, `MAX_DPD_LAST_12M`, `UNSECURED_DEBT_RATIO`).
2. **Transparent Additive Factor Breakdown:** Instead of presenting an unexplainable number, the score is built additively:
   $$\text{Score} = \text{Base Points} + \sum (\text{Driver Impact Points})$$
   Top positive drivers (e.g., "7+ years clean repayment vintage (+18 pts)") and top negative drivers (e.g., "High revolving card utilization (-12 pts)") are surfaced directly to underwriters.
3. **Risk-Based Pricing (RBP):** The final risk score directly dictates the loan offer terms: prime applicants receive benchmark rates (e.g., 8.50% for Home Loans), while lower scores trigger statutory risk premiums or reduced LTV allowances.

### 5.4. Feature Extraction Table (Experian)

| Field | Detail |
|---|---|
| **Reference Feature** | PowerCurve Risk Scoring & Additive Scorecard Factor Breakdown |
| **Problem Solved** | A single bureau score lacks contextual transparency regarding income adequacy, collateral cushion, and repayment resilience. |
| **Workflow** | Ingest bureau tradelines & dossier metrics &rarr; Calculate credit attributes &rarr; Apply scorecard weights &rarr; Output 0-100 numerical risk score with top drivers. |
| **Input Data** | Bureau tradelines, DPD history, requested loan amount, net monthly income, property valuation. |
| **Processing** | Attribute extraction, weighted scorecard aggregation, risk tier segmentation (`super_prime`, `prime`, `near_prime`, `subprime`). |
| **Output Data** | Numerical risk score, default probability tier, risk-based interest rate adjustment, top 4 score drivers. |
| **Exception Handling** | Thin-file / New-to-Credit (NTC) applicants without tradeline history route to cashflow-based underwriting using bank statements. |
| **NIRNAY Adaptation** | Implement transparent scorecard attribution in `src/services/underwritingEngine.js` and persist to `risk_assessments` table. |
| **Priority** | **High (P2)** |
| **Evidence / Source** | [Experian Credit Decisioning Solutions](https://www.experian.com/business/solutions/credit-decisioning) & Experian PowerCurve Documentation. |

---

## 6. Platform 5: BUMI — Property Legal Scrutiny & Technical Valuation

### 6.1. Product Overview & Purpose
BUMI (`bumi.co.in`) is an Indian mortgage verification platform that digitizes and coordinates the two indispensable physical collateral pillars of mortgage underwriting: **Legal Scrutiny (Title Search)** and **Technical Valuation**.

### 6.2. Architectural Workflow & Collateral Appraisal Pipeline

```
[Property Collateral Registered in Loan Dossier]
        │
        ├────────────────────────────────┐
        ▼                                ▼
[Stream A: Legal Title Scrutiny]    [Stream B: Technical Valuation]
        │                                │
        ▼                                ▼
[Empanelled Advocate Assigned]       [Empanelled Valuer Assigned]
        │                                │
[30-Year Title Chain Search]         [Physical Site Inspection]
   ├── Mother Deed to Current Sale      ├── Geo-tagged Photos & GPS Bounds
   ├── Encumbrance Certificate (EC)     ├── Carpet Area vs Super Built-up
   └── Sub-Registrar Records Check      └── Construction Stage & Quality
        │                                │
        ▼                                ▼
[Legal Scrutiny Report (LSR)]        [Technical Valuation Report (TVR)]
   ├── Title: Freehold / Leasehold      ├── Fair Market Value (FMV)
   ├── Marketability: Clear / Defective ├── Realizable Value (RV)
   └── Encumbrances / Legal Queries     └── Distress Sale Value (DSV)
        │                                │
        └──────────────┬─────────────────┘
                       │
                       ▼
[Unified Collateral Verdict & Statutory LTV Computation]
  (Calculates LTV based strictly on the lower of TVR Realizable Value or Agreement Value)
```

### 6.3. Key Features & Reverse-Engineered Findings

1. **Parallel Independent Verification:** Legal scrutiny and physical technical appraisal run concurrently without blocking each other.
2. **Standardized Collateral Output Contracts:**
   * *LSR (Legal Scrutiny Report):* Outputs definitive legal marketability (`CLEAR_TITLE`, `CONDITIONAL_TITLE`, `DEFECTIVE_TITLE`) with a checklist of missing link documents.
   * *TVR (Technical Valuation Report):* Provides three distinct valuation figures: Fair Market Value (FMV), Realizable Value (typically 85-90% of FMV), and Distress Sale Value (70-75% of FMV).
3. **Prudent LTV Benchmark Basis:** In accordance with institutional underwriting standards, the statutory LTV cap is computed against the **lower** of the agreement purchase price and the valuer's independent realizable value.

### 6.4. Feature Extraction Table (BUMI)

| Field | Detail |
|---|---|
| **Reference Feature** | Dual-Track Legal Scrutiny Report (LSR) & Technical Valuation Report (TVR) Workflow |
| **Problem Solved** | Property legal defects, overvalued collateral, or unapproved building deviations lead to severe recovery losses. |
| **Workflow** | Application triggers collateral inspection &rarr; Routes case to advocate & valuer &rarr; Ingests title search & site valuation &rarr; Recomputes LTV based on conservative appraisal. |
| **Input Data** | Property address, carpet area, survey/khasra number, builder details, title deed scans, site photographs. |
| **Processing** | Title chain validation, market valuation comparison, statutory LTV recalculation against technical appraisal. |
| **Output Data** | Legal clearance verdict, verified carpet area, realizable market value, collateral risk flags. |
| **Exception Handling** | Title defect or valuation shortfall automatically pauses straight-through sanction and requires credit committee waiver. |
| **NIRNAY Adaptation** | Connect `property_details` and `loan_documents` with structured legal/technical fields and conservative valuation logic. |
| **Priority** | **Critical (P1)** |
| **Evidence / Source** | [BUMI Mortgage Verification Infrastructure](https://www.bumi.co.in/). |

---

## 7. Platform 6: Reserve Bank of India (RBI) — Regulatory & Compliance Framework

### 7.1. Official Publications & Statutory Scope
Primary Source: **Master Direction – Non-Banking Financial Company – Housing Finance Company (Reserve Bank) Directions, 2021** (Updated circulars via `rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12654`).  
Supporting Frameworks: **RBI Digital Lending Directions (2022/2025)**, **NHB Fair Practices Code (FPC)**, and **Digital Personal Data Protection (DPDP) Act, 2023**.

### 7.2. Statutory Mandates vs. Internal Lender Policies

A critical finding of this research is the rigorous legal distinction between **statutory non-negotiable regulations** and **internal Board-approved lender policies**:

```
+----------------------------------------------------------------------------------------------------+
|                                    STATUTORY MANDATORY REGULATIONS                                 |
|                                (Enforced by RBI / NHB Master Directions)                           |
+----------------------------------------------------------------------------------------------------+
| 1. Section 31 Housing Loan LTV Caps:                                                               |
|    - Loans <= Rs. 30 Lakh  : Maximum LTV = 90.0%                                                   |
|    - Loans 30L to 75 Lakh  : Maximum LTV = 80.0%                                                   |
|    - Loans > Rs. 75 Lakh   : Maximum LTV = 75.0%                                                   |
| 2. Exclusion of Stamp Duty & Registration: Must NOT be funded into housing loan cost (unless <=10L).|
| 3. Statutory Cooling-Off Floor: Minimum 1 day look-up period with zero-penalty exit.               |
| 4. Fair Lending Conduct (2024): All-in Annual Percentage Rate (APR) disclosure; penal charges      |
|    must NOT be levied as compounded penal interest.                                                |
| 5. DPDP Act, 2023: Explicit, informed digital consent recorded with IP, timestamp, and purpose.    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                               CONFIGURABLE INTERNAL LENDER POLICIES                                |
|                     (Hero Housing Finance Credit Committee Discretionary Benchmarks)               |
+----------------------------------------------------------------------------------------------------+
| 1. LAP Collateral LTV Cap: Configurable illustrative 60.0% benchmark (Non-housing loan).          |
| 2. Cashflow Ceiling (FOIR): Configurable illustrative 55.0% max permissible obligation.            |
| 3. Minimum Bureau Score: Configurable illustrative 650 cut-off for prime interest rate tier.       |
| 4. Maximum Tenures: 30 years for Home Loans, 15 years for Loans Against Property.                  |
+----------------------------------------------------------------------------------------------------+
```

### 7.3. Feature Extraction Table (RBI / NHB Regulatory Checks)

| Field | Detail |
|---|---|
| **Reference Feature** | Automated Regulatory Compliance Verifier & Statutory Disclosure Engine |
| **Problem Solved** | Failure to adhere to RBI LTV caps, cooling-off mandates, or KFS disclosures results in severe regulatory penalties and legal vulnerability. |
| **Workflow** | Ingest loan amount & property cost &rarr; Calculate net LTV (excluding stamp duty) &rarr; Verify against Section 31 statutory tier &rarr; Generate Key Fact Statement (KFS) with APR. |
| **Input Data** | Loan amount requested, property cost, stamp duty breakdown, repayment schedule, borrower consent metadata. |
| **Processing** | Statutory threshold comparison, APR calculation, cooling-off window validation, consent artifact verification. |
| **Output Data** | Traceable compliance record (`compliance_checks` table), standardized Key Fact Statement (KFS). |
| **Exception Handling** | Statutory LTV breach triggers immediate **Hard Decline**; internal policy breach triggers **Underwriter Referral**. |
| **NIRNAY Adaptation** | Encoded in `STATUTORY_POLICY_CONFIG` in `src/services/underwritingEngine.js` and stored in `compliance_checks`. |
| **Priority** | **Critical (P1)** |
| **Evidence / Source** | [RBI Master Direction - HFCs](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12654) Section 31 & RBI Digital Lending Directions. |

---

## 8. Platform 7: Zest AI — Automated Instant Decisioning Engine

### 8.1. Product Overview & Purpose
Zest AI (`zest.ai`) provides automated credit underwriting software for financial institutions. It specializes in high straight-through processing (STP) rates while generating legally compliant, automated adverse action reasons for denied applications.

### 8.2. Architectural Workflow & Tri-State Adjudication

```
[Complete Application Dossier]
        │
        ▼
[Decision Engine Evaluation Gate]
        ├── Statutory Compliance Pass? ────── NO ──► [AUTO-DECLINE]
        ├── Fraud / AML Screening Clear? ──── NO ──► [AUTO-DECLINE or FRAUD REFER]
        ├── Property Legal Title Marketable?─ NO ──► [PROPERTY REFER]
        └── FOIR & LTV Ratios Acceptable? ─── NO ──► [CREDIT REFER / DECLINE]
        │
        ▼
[Tri-State Decision Matrix]
   ├── 1. APPROVE (Auto-Sanction)
   │     └── Score >= 75, LTV & FOIR well within caps, clean title, zero fraud flags.
   │         Outputs: Formal Sanction Letter with Term, Rate, EMI, and Conditions Precedent.
   │
   ├── 2. REJECT (Adverse Action)
   │     └── Hard statutory decline, active write-off, unmarketable title, or critical fraud flag.
   │         Outputs: Automated Adverse Action Notice citing principal denial reasons.
   │
   └── 3. REFER (Human-in-the-Loop Adjudication)
         └── Borderline FOIR (50-60%), minor valuation shortfall, thin credit history.
             Outputs: Routed to Underwriter Workspace with specific exception check items.
```

### 8.3. Key Features & Reverse-Engineered Findings

1. **Straight-Through Processing (STP) Guardrails:** Clear-cut, prime applications with verified income and unencumbered property collateral receive automated instant sanctions in seconds, reducing turnaround time from weeks to minutes.
2. **Contextual Adverse Action Reasons:** If an application is rejected, the engine isolates the exact contributing causes (e.g., `["Statutory LTV cap breached by 4.2%", "FOIR of 64% exceeds cashflow ceiling", "Bureau tradeline default within 12 months"]`), satisfying regulatory transparency standards.
3. **Structured Underwriter Referral Queue:** Borderline applications are not rejected blindly; they are placed in a triaged queue with specific guidance on which parameters require human review or mitigating factors.

### 8.4. Feature Extraction Table (Zest AI)

| Field | Detail |
|---|---|
| **Reference Feature** | Tri-State Automated Decision Engine with Specific Adverse Action Reason Codes |
| **Problem Solved** | Manual underwriting creates severe operational bottlenecks, inconsistent credit decisions, and opaque customer rejections. |
| **Workflow** | Evaluate composite dossier &rarr; Route to APPROVE, REJECT, or REFER &rarr; Generate formal sanction terms or regulatory adverse action reasons. |
| **Input Data** | Policy evaluations, risk score, fraud flags, property appraisal, compliance checks. |
| **Processing** | Multi-gate decision logic, automated term calculation (sanctioned rate, tenure, EMI), reason code generation. |
| **Output Data** | Adjudication record (`underwriting_decisions`), decision reasons (`decision_reasons`), formal sanction letter data. |
| **Exception Handling** | Ambiguous cases route to senior underwriters with a pre-populated risk summary. |
| **NIRNAY Adaptation** | Integrated into `src/pages/admin/AdminApplicationWorkspace.jsx` and atomic RPC `record_underwriting_decision`. |
| **Priority** | **Critical (P1)** |
| **Evidence / Source** | [Zest AI Credit Decisioning Engine](https://www.zest.ai/). |

---

## 9. Platform 8: Fiddler AI — Explainable AI (XAI) & Model Governance

### 9.1. Product Overview & Purpose
Fiddler AI (`fiddler.ai`) is an enterprise AI observability and explainability platform. It enables risk and compliance officers to understand, audit, and explain complex algorithmic decisions using cooperative game theory (Shapley values / SHAP) and interactive counterfactual what-if analysis.

### 9.2. Architectural Workflow & Explainability Framework

```
[Algorithmic Underwriting Prediction]
        │
        ▼
[Explainability Layer (TreeSHAP / Cooperative Game Theory)]
   ├── Local Attribution: How much did applicant's Net Income contribute to approval?
   └── Global Attribution: What features drive default across the entire mortgage portfolio?
        │
        ▼
[Interactive What-If / Counterfactual Engine]
   └── Borrower Asks: "Why was my requested loan amount of ₹60L not approved?"
   └── System Computes: "To qualify for ₹60L, applicant must either:
         (a) Increase tenure from 15 to 20 years (reduces FOIR to 51.2%), OR
         (b) Add co-applicant with >= ₹35,000 net monthly income."
        │
        ▼
[Audit & Traceability Vault]
   ├── Immutable Snapshot of Model / Rule Version
   ├── Input Vector Checksum
   └── Reproducible Decision Record for Regulatory Audits
```

### 9.3. Key Features & Reverse-Engineered Findings

1. **Local Feature Attribution (Shapley Values):** Deconstructs the credit assessment into exact mathematical contributions, ensuring that no decision is a black box.
2. **Counterfactual "What-If" Recommendations:** Generates actionable guidance for loan officers and applicants on how an initially declined or referred application can be restructured into an approvable mortgage.
3. **Reproducible Decision Auditing:** Every decision records the exact timestamp, rule engine version, and input vector, allowing auditors to replay the exact underwriting decision years later.

### 9.4. Feature Extraction Table (Fiddler AI)

| Field | Detail |
|---|---|
| **Reference Feature** | Shapley-Based Feature Attribution & Interactive Counterfactual What-If Analysis |
| **Problem Solved** | Black-box AI/ML models cannot explain why an applicant was rejected, violating regulatory fair lending and governance mandates. |
| **Workflow** | Decision rendered &rarr; Compute feature attributions &rarr; Identify marginal boundary shifts for counterfactuals &rarr; Store immutable audit bundle. |
| **Input Data** | Application parameters, model scoring weights, decision thresholds. |
| **Processing** | SHAP value approximation, counterfactual optimization (minimal parameter adjustment to cross approval threshold). |
| **Output Data** | Visual feature attribution bar chart, counterfactual qualification advice, audit trail log. |
| **Exception Handling** | If feature values lie outside training distribution: flags data drift anomaly and refers to manual audit. |
| **NIRNAY Adaptation** | Embed into `src/pages/customer/ApplicationDetailsPage.jsx` and `AdminApplicationWorkspace.jsx` to show explainable risk breakdowns and counterfactual suggestions. |
| **Priority** | **High (P2)** |
| **Evidence / Source** | [Fiddler AI Explainable AI Platform](https://www.fiddler.ai/explainable-ai). |

---

## 10. Research Limitations & Inaccessible Boundaries

In compliance with our ethical reverse-engineering guidelines, the following boundaries were strictly observed:
1. **Private Dashboard Boundaries:** Internal production dashboards of Provenir, Experian PowerCurve, and Sardine require private enterprise licensing and multi-factor corporate authentication. Features for these platforms were verified using official product whitepapers, API reference guides, and publicly demonstrated product documentation. No private authentication was bypassed.
2. **Proprietary Risk Scoring Models:** Experian and Zest AI maintain proprietary, trade-secret machine learning weights and credit bureau data lakes. The underlying mathematical principles (additive scorecards, Shapley values, tri-state routing) were extracted without copying proprietary weights.
3. **Live External Provider Sandbox:** Live Indian Account Aggregators (Sahamati) and property registries require commercial HFC licensing and live sandbox API keys. The interfaces and data contracts are modelled on official RBI Account Aggregator schemas and public API documentation.

