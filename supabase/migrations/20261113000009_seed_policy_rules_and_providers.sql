-- ==============================================================================
-- NIRNAY Migration 009: Seed Statutory Rules, Lender Policies & Provider Catalog
-- Grounded in RBI/NHB Directives and Hero Housing Finance Credit Benchmarks
-- ==============================================================================

-- 1. Seed Credit Policy Rules
INSERT INTO public.credit_policy_rules 
(rule_code, rule_name, is_statutory, regulatory_reference, loan_type, metric, operator, threshold_value, severity_on_breach, is_active)
VALUES
-- A. Statutory RBI / NHB Housing Loan LTV Rules (Non-negotiable Statutory Mandate)
(
    'POL-HL-LTV-01',
    'RBI Statutory LTV Cap for Housing Loans up to Rs 30 Lakhs',
    true,
    'RBI Master Direction - HFCs (DOR.FIN.HFC.CC.No.120/03.10.136) Section 31',
    'home_loan',
    'LTV',
    '<=',
    '90.0%',
    'hard_decline',
    true
),
(
    'POL-HL-LTV-02',
    'RBI Statutory LTV Cap for Housing Loans between Rs 30 Lakhs and Rs 75 Lakhs',
    true,
    'RBI Master Direction - HFCs Section 31 & Annex II',
    'home_loan',
    'LTV',
    '<=',
    '80.0%',
    'hard_decline',
    true
),
(
    'POL-HL-LTV-03',
    'RBI Statutory LTV Cap for Housing Loans above Rs 75 Lakhs',
    true,
    'RBI Master Direction - HFCs Section 31 & Annex II',
    'home_loan',
    'LTV',
    '<=',
    '75.0%',
    'hard_decline',
    true
),
-- B. Statutory RBI Digital Lending Directions - Cooling-Off / Look-Up Period (Minimum 1 Day)
(
    'POL-COOLING-OFF',
    'RBI Mandatory Look-Up / Cooling-Off Period for Digital Lending',
    true,
    'RBI Digital Lending Directions, 2025 (Harmonized Look-Up Period Guidelines)',
    'all',
    'COOLING_OFF_DAYS',
    '>=',
    '1 Day',
    'hard_decline',
    true
),
-- C. Configurable Illustrative Lender Credit Policies (Pending formal Hero Housing Board Sign-off)
(
    'POL-LAP-LTV',
    'Configurable Illustrative LAP Collateral Benchmark LTV Ceiling (Lender Policy)',
    false,
    'Configurable Lender Policy (Illustrative 60.0% benchmark pending formal Hero Housing credit committee sign-off)',
    'lap',
    'LTV',
    '<=',
    '60.0%',
    'refer_to_underwriter',
    true
),
(
    'POL-FOIR-MAX',
    'Configurable Illustrative FOIR Benchmark Ceiling (Lender Policy)',
    false,
    'Configurable Lender Policy (Illustrative 55.0% benchmark pending formal Hero Housing credit committee sign-off)',
    'all',
    'FOIR',
    '<=',
    '55.0%',
    'refer_to_underwriter',
    true
),
(
    'POL-CIBIL-MIN',
    'Minimum Prime Bureau Score Benchmark for Automated Underwriting',
    false,
    'Configurable Lender Policy (Illustrative 650 bureau cut-off)',
    'all',
    'CIBIL_SCORE',
    '>=',
    '650',
    'refer_to_underwriter',
    true
),
(
    'POL-TENURE-HL',
    'Maximum Permissible Housing Loan Amortization Period',
    false,
    'Configurable Lender Policy (360 Months Program Schedule)',
    'home_loan',
    'MAX_TENURE',
    '<=',
    '360 Months',
    'hard_decline',
    true
),
(
    'POL-TENURE-LAP',
    'Maximum Permissible LAP Amortization Period',
    false,
    'Configurable Lender Policy (180 Months Program Schedule)',
    'lap',
    'MAX_TENURE',
    '<=',
    '180 Months',
    'hard_decline',
    true
)
ON CONFLICT (rule_code) DO UPDATE
SET rule_name = EXCLUDED.rule_name,
    is_statutory = EXCLUDED.is_statutory,
    regulatory_reference = EXCLUDED.regulatory_reference,
    threshold_value = EXCLUDED.threshold_value,
    severity_on_breach = EXCLUDED.severity_on_breach;

-- 2. Seed External Data Sources Catalog
INSERT INTO public.external_data_sources
(provider_code, provider_name, category, is_active, operational_mode)
VALUES
(
    'DIGILOCKER',
    'DigiLocker / MeriPehchaan (API Setu OAuth2 Framework)',
    'kyc',
    true,
    'sandbox_mock'
),
(
    'NSDL_PAN',
    'NSDL / UTI Infrastructure Technology Services PAN Verification',
    'kyc',
    true,
    'sandbox_mock'
),
(
    'CIBIL',
    'TransUnion CIBIL Consumer Credit Information Report',
    'bureau',
    true,
    'sandbox_mock'
),
(
    'ACCOUNT_AGGREGATOR',
    'Sahamati Account Aggregator (AA) Financial Information Provider (FIP)',
    'banking',
    true,
    'sandbox_mock'
),
(
    'LAND_REGISTRY',
    'State Inspector General of Registration (IGR) Land & Title Registry',
    'collateral',
    true,
    'sandbox_mock'
),
(
    'AML_WATCHLIST',
    'PMLA & OFAC Sanctions, PEP & Adverse Media Screening Feed',
    'aml',
    true,
    'sandbox_mock'
)
ON CONFLICT (provider_code) DO UPDATE
SET provider_name = EXCLUDED.provider_name,
    category = EXCLUDED.category,
    operational_mode = EXCLUDED.operational_mode;
