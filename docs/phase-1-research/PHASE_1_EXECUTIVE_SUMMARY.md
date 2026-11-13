# NIRNAY — Phase 1 Executive Research Summary

**Platform:** NIRNAY Digital Mortgage Underwriting Platform  
**Target Organization:** Hero Housing Finance Limited (HHFL)  
**Deliverable:** Phase 1 — Reference Research & Product Reverse Engineering Summary  
**Documentation Suite:** `docs/phase-1-research/`  
**Date:** 2026-11-13  
**Status:** Phase 1 Complete — Ready for Review & Approval  

---

## 1. Executive Brief

This study concludes the Phase 1 reverse-engineering and architecture research for NIRNAY. By analyzing eight market-leading platforms—**FinBox**, **Provenir**, **Sardine AI**, **Experian**, **BUMI**, **Reserve Bank of India (RBI)**, **Zest AI**, and **Fiddler AI**—we have translated global best practices into a unified, institutional digital mortgage underwriting framework tailored for Hero Housing Finance.

This phase was conducted strictly in **research and documentation mode**. Existing application code, database schemas, and authentication triggers remain untouched, stable, and verified.

---

## 2. Key Discoveries from the 8 Reference Platforms

```
+-------------------+-----------------------------+--------------------------------------------------------------------+
| Reference Target  | Domain Evaluated            | Most Valuable Extracted Component Adapted to NIRNAY                |
+-------------------+-----------------------------+--------------------------------------------------------------------+
| 1. FinBox         | External Data Integration   | Smart AA routing + multi-bank JSON statement categorization        |
| 2. Provenir       | Credit Policy Engine        | Hierarchical knockout rules + separate HL vs LAP policy branches   |
| 3. Sardine AI     | Fraud & KYC/AML Screening   | PDF object metadata forensics + cross-document name discrepancy    |
| 4. Experian       | Risk Scoring & Strategy     | Additive empirical scorecard (0-100) with positive/negative drivers |
| 5. BUMI           | Property Verification       | Dual-track Legal Scrutiny (LSR) + Technical Valuation (TVR)        |
| 6. RBI Master Dir.| Statutory Compliance        | Strict Section 31 LTV caps (90/80/75%) + stamp duty exclusion      |
| 7. Zest AI        | Automated Decisioning       | Tri-state routing (Approve/Reject/Refer) + adverse action reasons  |
| 8. Fiddler AI     | Explainability & Governance | Interactive What-If counterfactual math + immutable audit ledger   |
+-------------------+-----------------------------+--------------------------------------------------------------------+
```

---

## 3. Current Implementation Status vs. Hackathon Requirements

Auditing the existing NIRNAY repository against the benchmark capabilities reveals that while our **database foundation (24 PostgreSQL tables, RLS, private vault, and atomic RPCs)** is complete, functional gaps exist in external data ingestion, automated forensics, and straight-through decisioning:

```
+-------------------------------------------------+-------------------------+------------------------------------------+
| Hackathon Requirement Area                      | Codebase Audit Status   | Key Implementation Gap                   |
+-------------------------------------------------+-------------------------+------------------------------------------+
| 1. External Data Source Integration (FinBox)    | PARTIALLY IMPLEMENTED   | Ingesting real/sandbox AA JSON feeds     |
| 2. Eligibility & Internal Credit Policy (Provenir)| ALREADY IMPLEMENTED   | Admin UI for runtime policy rule updates |
| 3. Fraud Detection & KYC/AML (Sardine)          | PARTIALLY IMPLEMENTED   | Automated PDF metadata tampering parser  |
| 4. Transparent Risk Scoring (Experian)          | PARTIALLY IMPLEMENTED   | Dynamic 0-100 additive scorecard in code |
| 5. Document & Property Verification (BUMI)      | PARTIALLY IMPLEMENTED   | Dual-track LSR (Advocate) & TVR (Valuer) |
| 6. Regulatory & Compliance Checks (RBI / NHB)   | ALREADY IMPLEMENTED     | Automated Key Fact Statement (KFS) PDF   |
| 7. Automated Instant Decisioning (Zest AI)      | PARTIALLY IMPLEMENTED   | Straight-through (STP) auto-sanction     |
| 8. Explainability & Governance (Fiddler AI)     | PARTIALLY IMPLEMENTED   | Interactive What-If counterfactual tool  |
+-------------------------------------------------+-------------------------+------------------------------------------+
```

---

## 4. Key AI/ML & Engineering Decisions

1. **Rejection of Unsubstantiated Black-Box Default Predictors:**  
   Because this hackathon project does not possess a multi-year labelled mortgage repayment dataset, we reject training a synthetic deep learning credit default model. Proposing a black-box model without training data is unacceptable under RBI fair lending guidelines.
2. **Adoption of Transparent Empirical Additive Scorecards:**  
   We implement an Experian-style additive scorecard ($50 + \Delta_{\text{bureau}} + \Delta_{\text{foir}} + \Delta_{\text{ltv}} + \Delta_{\text{vintage}}$), providing 100% mathematical explainability and regulatory defensibility.
3. **Application of Narrow AI for Document Forensics & Extraction:**  
   Applied vision AI is reserved for document classification and OCR extraction, while metadata heuristics (detecting Photoshop/Canva manipulation in PDFs) provide high-leverage fraud detection without massive data dependencies.
4. **Mathematical Counterfactuals (What-If Optimization):**  
   We solve for exact mathematical boundaries (calculating the precise tenure extension or down-payment haircut needed to bring an applicant into compliance), providing actionable guidance to borrowers and loan officers.

---

## 5. Master Roadmap & Recommended Next Phase

The complete technical findings have been structured into five companion research artifacts inside `docs/phase-1-research/`:
1. [REFERENCE_PLATFORM_ANALYSIS.md](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/docs/phase-1-research/REFERENCE_PLATFORM_ANALYSIS.md) — Exhaustive reverse engineering of all 8 platforms.
2. [NIRNAY_FEATURE_GAP_ANALYSIS.md](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/docs/phase-1-research/NIRNAY_FEATURE_GAP_ANALYSIS.md) — Line-by-line audit of existing codebase against benchmark features.
3. [NIRNAY_UNIFIED_WORKFLOW.md](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/docs/phase-1-research/NIRNAY_UNIFIED_WORKFLOW.md) — 10-stage end-to-end mortgage lifecycle with Mermaid diagrams.
4. [NIRNAY_AI_ML_STRATEGY.md](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/docs/phase-1-research/NIRNAY_AI_ML_STRATEGY.md) — Rigorous analysis of AI/ML vs deterministic rules.
5. [NIRNAY_PHASED_IMPLEMENTATION_ROADMAP.md](file:///Users/krishnabhadane/Documents/Mumbai%20Hackthon/docs/phase-1-research/NIRNAY_PHASED_IMPLEMENTATION_ROADMAP.md) — 4-phase non-destructive execution plan.

### Recommended Next Action
Proceed to **Phase 2: Credit Engines & Data Orchestration** upon approval, focusing on:
* Integrating the dynamic 0-100 additive risk scorecard into `src/services/underwritingEngine.js`.
* Building the interactive What-If counterfactual scenario simulator component.
* Implementing the Account Aggregator bank statement transaction normalizer.

