-- ==============================================================================
-- NIRNAY Migration 005: Credit Policy, Risk Scoring, Fraud & Compliance
-- Grounded in RBI/NHB Master Directions & Explainable Rule Scorecards
-- ==============================================================================

-- 1. Credit Policy Rules Catalog
CREATE TABLE IF NOT EXISTS public.credit_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'POL-HL-LTV-01', 'POL-FOIR-MAX', 'POL-LAP-LTV'
    rule_name VARCHAR(150) NOT NULL,
    is_statutory BOOLEAN NOT NULL, -- TRUE for RBI/NHB statutory mandates; FALSE for Hero Housing internal policies
    regulatory_reference VARCHAR(150), -- e.g. 'RBI Master Direction - HFCs Section 31'
    loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('home_loan', 'lap', 'all')),
    metric VARCHAR(50) NOT NULL, -- 'LTV', 'FOIR', 'CIBIL_SCORE', 'MIN_AGE', 'MAX_TENURE'
    operator VARCHAR(10) NOT NULL CHECK (operator IN ('<=', '>=', '<', '>', '==', 'in')),
    threshold_value VARCHAR(50) NOT NULL,
    severity_on_breach VARCHAR(20) NOT NULL CHECK (severity_on_breach IN ('hard_decline', 'refer_to_underwriter', 'warning')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Credit Policy Version Snapshots (Immutable Regulatory Version Tracking)
CREATE TABLE IF NOT EXISTS public.credit_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.credit_policy_rules(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    CONSTRAINT uq_policy_version UNIQUE (policy_id, version_number)
);

-- 3. Preliminary Eligibility Assessments (Indicative, Non-Binding Customer Assessment)
CREATE TABLE IF NOT EXISTS public.preliminary_eligibility_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    assessment_version INTEGER NOT NULL DEFAULT 1,
    is_binding BOOLEAN NOT NULL DEFAULT FALSE, -- ALWAYS FALSE: Prototype/in-principle calculation only
    calculated_foir NUMERIC(5,2) NOT NULL,
    calculated_ltv NUMERIC(5,2) NOT NULL,
    calculated_dti NUMERIC(5,2) NOT NULL,
    max_eligible_loan_amount NUMERIC(14,2) NOT NULL,
    estimated_emi NUMERIC(12,2) NOT NULL,
    benchmark_interest_rate NUMERIC(4,2) NOT NULL,
    policy_evaluation JSONB NOT NULL, -- Detailed array of evaluated rules and pass/fail reasons
    assessment_status VARCHAR(30) NOT NULL CHECK (assessment_status IN ('passed', 'referred', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elig_assess_app_id ON public.preliminary_eligibility_assessments(application_id);

-- 4. Fraud & Suspicious Activity Alerts
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    alert_code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'income_anomaly', 'tampered_document', 'transaction_bounce', 
        'identity_mismatch', 'duplicate_application'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    evidence JSONB,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_app_id ON public.fraud_alerts(application_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON public.fraud_alerts(severity);

-- 5. Risk Assessments & Explainable Drivers (Nullable scores until real data is available)
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    bureau_score INTEGER CHECK (bureau_score IS NULL OR (bureau_score >= 300 AND bureau_score <= 900)),
    probability_of_default NUMERIC(5,4) CHECK (probability_of_default IS NULL OR (probability_of_default >= 0 AND probability_of_default <= 1)),
    numerical_risk_score INTEGER CHECK (numerical_risk_score IS NULL OR (numerical_risk_score >= 0 AND numerical_risk_score <= 100)),
    risk_tier VARCHAR(20) NOT NULL DEFAULT 'unassessed' CHECK (risk_tier IN ('unassessed', 'low', 'medium', 'high')),
    risk_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_version VARCHAR(50) NOT NULL DEFAULT 'rule_scorecard_v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assess_app_id ON public.risk_assessments(application_id);

-- 6. Statutory & Regulatory Compliance Checks
CREATE TABLE IF NOT EXISTS public.compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    check_code VARCHAR(50) NOT NULL,
    authority VARCHAR(30) NOT NULL CHECK (authority IN ('RBI', 'NHB', 'PMLA', 'DPDP', 'INTERNAL_POLICY')),
    rule_name VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'REQUIRES_WAIVER')),
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_app_id ON public.compliance_checks(application_id);

