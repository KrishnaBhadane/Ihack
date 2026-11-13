# NIRNAY — Practical AI/ML Strategy & Deterministic Rules Framework

**Platform:** NIRNAY Digital Mortgage Underwriting Engine  
**Target Organization:** Hero Housing Finance Limited (HHFL)  
**Research Phase:** Phase 1 — Reference Research & Product Reverse Engineering  
**Scope:** Pragmatic evaluation of Artificial Intelligence (AI) and Machine Learning (ML) versus Deterministic Business Logic in Indian mortgage underwriting.  
**Guiding Principle:** Grounded in institutional reality. Rejects black-box default models where training data is unavailable; prioritizes explainable, regulatory-defensible automation.  

---

## 1. Executive Strategy & The Mortgage Data Reality

In digital mortgage lending, adopting machine learning indiscriminately introduces severe legal, regulatory, and credit risks. Unlike unsecured consumer micro-lending (where loans default in 60-90 days and large datasets can be harvested rapidly), mortgages operate on **15 to 30-year amortization horizons** with substantial physical collateral and strict RBI/NHB fair-lending oversight.

### The Fundamental Constraint: Absence of Labelled Default Data
* **The Reality:** In this hackathon environment, NIRNAY **does not possess a genuine, historical, multi-year labelled mortgage repayment dataset** containing default/non-default outcomes, macro-economic cycles, and borrower recovery histories.
* **The Danger of Fabricated ML Models:** Training a black-box supervised classification model (e.g. XGBoost, Logistic Regression, or Neural Networks) on synthetic data produces artificial correlation, non-defensible credit predictions, and severe hallucinations that violate RBI Fair Lending Practices.
* **The Solution:** Adopt a **hybrid architectural model**:
  1. **Deterministic Rule Engines** for statutory compliance, cashflow ratios (FOIR), collateral caps (LTV), and credit policy knockouts where mathematical precision and legal adherence are mandatory.
  2. **Applied Narrow AI / Heuristics** for computer vision OCR, document classification, text parsing, behavioral anomaly detection, and explainable feature attribution.

---

## 2. Decision Matrix: AI/ML vs. Deterministic Rules

| Underwriting Capability | Recommended Technical Approach | Justification | Regulatory Defensibility |
|---|---|---|---|
| **Statutory LTV Compliance** | **100% Deterministic Rule** | RBI Section 31 LTV caps (90/80/75%) are rigid statutory mandates. ML must never predict or approximate a legal cap. | Absolute |
| **Cashflow & Debt-to-Income (FOIR)** | **100% Deterministic Rule** | Cashflow arithmetic ($\text{EMI} / \text{Income}$) is pure financial math. An algorithm should not guess debt-servicing limits. | Absolute |
| **Document Classification** | **Narrow AI (LayoutLM / Vision)** | Classifying whether an uploaded file is a PAN card, salary slip, bank statement, or sale deed is an ideal computer vision task. | High |
| **Document OCR & Attribute Extraction** | **Narrow AI (OCR + Regex/NLP)** | Extracting names, dates, PAN numbers, and salary figures across hundreds of document formats requires robust OCR models. | High |
| **Document Tampering Detection** | **Heuristics + Vision AI (ELA)** | Detecting digital PDF manipulation (inconsistent fonts, graphic editor metadata, altered compression) stops synthetic fraud. | High |
| **Bank Statement Parsing** | **Regex & Deterministic Classification** | Categorizing transactions into salary, EMI, and bounces is best handled by deterministic pattern matching and lookup dictionaries. | High |
| **Credit Risk Scoring** | **Additive Scorecard (Experian-Style)** | Transparent weighted points model (Bureau + Income + LTV + Stability) allows exact driver explanation without black boxes. | High |
| **Mortgage Default Prediction (PD)** | **RULE-BASED PROXY (NOT SUPERVISED ML)** | **Rejected for Phase 1.** No labelled repayment dataset exists. Proposing a deep learning default predictor is fraudulent. | Low (if black-box) |
| **Decision Explainability & What-If** | **Deterministic Counterfactual Math** | Calculating how an increase in down payment or tenure lowers FOIR to meet policy thresholds is mathematically exact. | Absolute |

---

## 3. Deep-Dive Evaluation of Proposed AI/ML Capabilities

---

### Capability 1: Document Classification & Orientation Detection

1. **Problem Solved:** Borrowers upload document files into incorrect categories (e.g., uploading a property title deed under "Salary Slip" or an electricity bill under "PAN Card").
2. **Required Input Data:** Raw file images (rendered from PDF, JPEG, or PNG) uploaded during Step 5 of the intake wizard.
3. **Suitable Model / Approach:** Pre-trained multi-modal document classifier (e.g., lightweight LayoutLMv3 or zero-shot CLIP/Vision Transformer) fine-tuned on standard Indian identity and financial forms.
4. **Sufficiency of Deterministic Rules:** Insufficient. File names (e.g. `Scan_001.pdf`) and raw file extensions do not reveal document content.
5. **Labelled Training Data Requirement:** Low. Pre-trained off-the-shelf document classification models require only a handful of representative reference templates for Indian document types.
6. **Workflow Integration:** Executes immediately upon upload in `applicationService.js`. If the classified document type contradicts the selected category, the UI flags a warning: `"Uploaded document appears to be an Aadhaar Card, but was submitted as a Bank Statement."`
7. **Explainability:** Displays classification confidence score (e.g., `PAN Card: 98.4% Confidence`).
8. **Implementation Complexity:** **Medium**

---

### Capability 2: OCR & Key Entity Extraction

1. **Problem Solved:** Manual data entry of PAN numbers, dates of birth, employer names, and bank statement figures is slow and error-prone.
2. **Required Input Data:** Uploaded identity cards, salary slips, and title deeds in private Supabase Storage.
3. **Suitable Model / Approach:** Hybrid OCR pipeline: Tesseract OCR or cloud vision engine coupled with deterministic regex post-processors (e.g. regex for standard 10-character alphanumeric PAN format `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).
4. **Sufficiency of Deterministic Rules:** Regex alone cannot extract text from image pixels; vision OCR is mandatory, but post-extraction validation must be 100% deterministic.
5. **Labelled Training Data Requirement:** None. Leverages pre-trained optical character recognition engines.
6. **Workflow Integration:** Populates the `ocr_extracted_fields` database table. In `AdminApplicationWorkspace.jsx`, underwriter sees side-by-side comparison of declared vs OCR-extracted attributes.
7. **Explainability:** High. Highlights the exact bounding box and text segment on the document preview.
8. **Implementation Complexity:** **Medium**

---

### Capability 3: Document Tampering & Digital Manipulation Forensics

1. **Problem Solved:** Fraudsters modify income figures on PDF salary slips using editors like Adobe Acrobat or Photoshop, or alter bank balances before applying.
2. **Required Input Data:** Uploaded PDF document byte streams and metadata headers.
3. **Suitable Model / Approach:** Forensic heuristic analysis:
   * **PDF Object Tree Parser:** Inspects `/Producer` and `/Creator` metadata tags for prohibited software (e.g., Photoshop, Canva, PDFescape, Illustrator).
   * **Font Consistency Check:** Detects multiple conflicting font families or altered embedded fonts in numerical table columns.
   * **Error Level Analysis (ELA):** Analyzes JPEG compression artifact variance to detect pasted numerical digits.
4. **Sufficiency of Deterministic Rules:** Partially. Metadata parsing and font enumeration are completely deterministic. ELA is an established image processing algorithm.
5. **Labelled Training Data Requirement:** None required for metadata and structural font analysis.
6. **Workflow Integration:** If tampering markers are detected, inserts a `CRITICAL` alert into the `fraud_alerts` table, disabling straight-through auto-sanction and requiring underwriter manual inspection.
7. **Explainability:** Fully explainable: cites exact metadata findings (e.g., `"Document created with Adobe Photoshop CC 2023; inconsistent font Arial-Bold detected in Net Pay column"`).
8. **Implementation Complexity:** **High**

---

### Capability 4: Bank Statement Transaction Parsing & Categorization

1. **Problem Solved:** Raw bank statement transaction streams contain hundreds of cryptic narration strings (`NEFT-CMS-INFY-SAL`, `ACH-D-HDFC-HL`, `INW RET-CHQ`) that must be classified into usable underwriting variables.
2. **Required Input Data:** Consented Account Aggregator (AA) JSON feeds or parsed bank statement transaction tables.
3. **Suitable Model / Approach:** Deterministic regular expression pattern matching and keyword dictionaries, combined with unsupervised clustering (TF-IDF + Cosine Similarity) for novel transaction narrations.
4. **Sufficiency of Deterministic Rules:** **90% Sufficient.** In India, banking narrations follow standard RBI payment clearing patterns (NACH, NEFT, IMPS, UPI, ECS). A comprehensive dictionary of 200 keywords covers the vast majority of salary and loan repayment transactions.
5. **Labelled Training Data Requirement:** Minimal. Standard keyword taxonomy for Indian banks.
6. **Workflow Integration:** Outputs normalized financial metrics (`verifiedNetMonthlyIncome`, `existingMonthlyObligations`, `inwardBouncesCount`, `averageMonthlyBalance`) into `financial_details`.
7. **Explainability:** 100% explainable: every tagged EMI lists the source transaction date, amount, and narration string.
8. **Implementation Complexity:** **Medium**

---

### Capability 5: Transparent Additive Risk Scoring (The Non-Black-Box Alternative)

1. **Problem Solved:** Providing a comprehensive numerical credit score (0-100) that synthesizes credit history, cashflow margin, and collateral security without relying on an unverified black-box model.
2. **Required Input Data:** Verified bureau score, calculated FOIR, calculated LTV, employment vintage, and liquid assets.
3. **Suitable Model / Approach:** **Empirical Additive Scorecard Model** (modelled on Experian PowerCurve and FICO methodologies):
   $$\text{Risk Score} = 50 + \Delta_{\text{Bureau}} + \Delta_{\text{FOIR}} + \Delta_{\text{LTV}} + \Delta_{\text{Stability}}$$
   * *Bureau Component (&plusmn;20 pts):* Credit score 750+ yields +20 pts; score < 650 deducts 15 pts.
   * *Cashflow Margin (&plusmn;15 pts):* FOIR < 40% yields +15 pts; FOIR > 55% deducts 15 pts.
   * *Collateral Cushion (&plusmn;10 pts):* LTV < 70% yields +10 pts; LTV at ceiling yields 0 pts.
   * *Employment Vintage (&plusmn;5 pts):* Job vintage > 5 years yields +5 pts.
4. **Sufficiency of Deterministic Rules:** **100% Sufficient.** The additive scorecard is deterministic, fully predictable, and universally accepted by regulatory bank examiners.
5. **Labelled Training Data Requirement:** None. Parameters are calibrated against standard HFC credit underwriting guidelines.
6. **Workflow Integration:** Persisted into `risk_assessments` table and rendered on the underwriter dashboard with individual contribution bars.
7. **Explainability:** Perfect mathematical transparency. Every point awarded or deducted has an explicit causal reason.
8. **Implementation Complexity:** **Low / Medium**

---

### Capability 6: Interactive "What-If" Counterfactual Optimization

1. **Problem Solved:** When an application is declined or referred due to an elevated FOIR or LTV, borrowers and loan officers do not know what specific adjustments are required to achieve approval.
2. **Required Input Data:** Declared income, requested loan amount, proposed interest rate, requested tenure, property valuation.
3. **Suitable Model / Approach:** **Constrained Mathematical Optimization / Inverse Calculation**:
   Solves for boundary variables that bring FOIR &le; 55% and LTV &le; statutory cap:
   * *Scenario A (Tenure Extension):* Calculates the minimum tenure increase needed to reduce monthly EMI below the FOIR threshold.
   * *Scenario B (Loan Haircut / Down Payment):* Calculates the exact equity contribution required to bring requested principal within statutory LTV limits.
   * *Scenario C (Co-Applicant Addition):* Computes the minimum co-borrower monthly income needed to satisfy debt servicing.
4. **Sufficiency of Deterministic Rules:** **100% Sufficient.** Counterfactuals in mortgage lending are exact mathematical inversions of standard amortization equations.
5. **Labelled Training Data Requirement:** None.
6. **Workflow Integration:** Embedded as an interactive simulator in `ApplicationDetailsPage.jsx` and `AdminApplicationWorkspace.jsx`.
7. **Explainability:** Absolute. Translates complex financial constraints into clear recommendations: `"Increase down payment by ₹3,50,000 OR extend tenure by 36 months to qualify for automatic sanction."`
8. **Implementation Complexity:** **Low / Medium**

---

## 4. Summary of Technical Recommendations for NIRNAY

```
+-----------------------------------+--------------------+-----------------------+-----------------------------+
| Feature Capability                | Primary Mechanism  | Training Data Needed? | Recommendation for NIRNAY   |
+-----------------------------------+--------------------+-----------------------+-----------------------------+
| Statutory LTV & RBI Slabs         | Deterministic Math | None                  | IMPLEMENT IMMEDIATELY (P1)  |
| FOIR & Amortization Arithmetic    | Deterministic Math | None                  | IMPLEMENT IMMEDIATELY (P1)  |
| Additive Credit Risk Scorecard    | Weighted Scorecard | None                  | IMPLEMENT IMMEDIATELY (P1)  |
| What-If Counterfactual Simulator  | Inverse Amort.     | None                  | IMPLEMENT IMMEDIATELY (P1)  |
| Bank Narration Keyword Parser     | Regex / Dictionary | None                  | IMPLEMENT IN PHASE 2 (P2)   |
| PDF Metadata Tampering Forensics  | PDF Object Parser  | None                  | IMPLEMENT IN PHASE 2 (P2)   |
| OCR Key Entity Extraction         | Vision OCR + Regex | Pre-trained Only      | IMPLEMENT IN PHASE 2 (P2)   |
| Deep-Learning Default Predictor   | Supervised ML      | Millions of rows      | REJECT / DO NOT IMPLEMENT   |
+-----------------------------------+--------------------+-----------------------+-----------------------------+
```

