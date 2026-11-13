-- ==============================================================================
-- NIRNAY Migration 001: Extensions, Profiles, Roles & Auth Triggers
-- Grounded in RBI/NHB Institutional Governance Architecture
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Roles Table (Strict RBAC - decoupled from client metadata)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('customer', 'underwriter', 'reviewer', 'super_admin')),
    assigned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

-- Indexes for Role Lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 4. Revoke dangerous table permissions from public/anon/authenticated
REVOKE ALL ON public.user_roles FROM public, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 5. Security Definer Helper Functions (Pinned search_path protects against search_path injection)
CREATE OR REPLACE FUNCTION public.is_bank_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('underwriter', 'reviewer', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    detected_role VARCHAR;
BEGIN
    -- Only allow users to check their own role, or allow verified bank staff to inspect roles
    IF target_user_id != auth.uid() AND NOT public.is_bank_staff() THEN
        RAISE EXCEPTION 'Access denied: Cannot inspect other user roles.';
    END IF;

    SELECT role INTO detected_role
    FROM public.user_roles
    WHERE user_id = target_user_id
    ORDER BY CASE
        WHEN role = 'super_admin' THEN 1
        WHEN role = 'underwriter' THEN 2
        WHEN role = 'reviewer' THEN 3
        ELSE 4
    END
    LIMIT 1;

    RETURN COALESCE(detected_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Hardware-Grade Role Protection Trigger
-- Guarantees customers CANNOT grant themselves staff roles through ANY path
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow the initial signup trigger to provision baseline 'customer' role
    IF TG_OP = 'INSERT' AND NEW.role = 'customer' AND NEW.user_id = auth.uid() THEN
        RETURN NEW;
    END IF;

    -- For any other insertion, update, or deletion, caller MUST be a verified super_admin
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Privilege escalation blocked: Only an authorized Super Admin can grant or modify user roles.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles();

-- 7. Trigger to Automatically Create Profile & Assign 'customer' Role on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_name VARCHAR(150);
BEGIN
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert into public.profiles
    INSERT INTO public.profiles (id, full_name, email, phone)
    VALUES (
        NEW.id,
        raw_name,
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    -- Assign baseline 'customer' role (Elevated roles require explicit administrative migration/RPC)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ==============================================================================
-- NIRNAY Migration 002: Core Loan Application Dossier
-- Home Loan & Loan Against Property (LAP) Data Models with Immutability Triggers
-- ==============================================================================

-- 1. Loan Applications Master Table
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('home_loan', 'lap')),
    loan_purpose VARCHAR(50) NOT NULL CHECK (loan_purpose IN (
        'purchase', 'construction', 'balance_transfer', 
        'business_expansion', 'working_capital', 'general_personal'
    )),
    loan_amount_requested NUMERIC(14,2) NOT NULL CHECK (loan_amount_requested >= 100000 AND loan_amount_requested <= 100000000),
    tenure_months_requested INTEGER NOT NULL CHECK (tenure_months_requested >= 12 AND tenure_months_requested <= 360),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'submitted', 'in_verification', 'underwriting_review', 
        'referred', 'approved', 'rejected', 'withdrawn', 'sanctioned'
    )),
    sub_status VARCHAR(50) NOT NULL DEFAULT 'intake_in_progress',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON public.loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_assigned_to ON public.loan_applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_loan_applications_loan_type ON public.loan_applications(loan_type);

-- 2. Primary Applicant Demographics & KYC Details
CREATE TABLE IF NOT EXISTS public.applicant_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    dob DATE NOT NULL CHECK (dob <= CURRENT_DATE - INTERVAL '18 years'),
    pan_number VARCHAR(10) NOT NULL CHECK (pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    marital_status VARCHAR(20) NOT NULL CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    current_address TEXT NOT NULL,
    residence_stability_years INTEGER NOT NULL DEFAULT 1 CHECK (residence_stability_years >= 0),
    permanent_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicant_details_pan ON public.applicant_details(pan_number);

-- 3. Co-Applicants Table
CREATE TABLE IF NOT EXISTS public.co_applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    co_applicant_type VARCHAR(30) NOT NULL CHECK (co_applicant_type IN ('financial_borrower', 'non_financial_guarantor')),
    full_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    dob DATE NOT NULL CHECK (dob <= CURRENT_DATE - INTERVAL '18 years'),
    pan_number VARCHAR(10) CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'),
    net_monthly_income NUMERIC(12,2) DEFAULT 0 CHECK (net_monthly_income >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_applicants_app_id ON public.co_applicants(application_id);

-- 4. Employment & Professional Details
CREATE TABLE IF NOT EXISTS public.employment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    employment_type VARCHAR(30) NOT NULL CHECK (employment_type IN (
        'salaried', 'self_employed_professional', 'self_employed_non_professional'
    )),
    employer_or_business_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    vintage_years INTEGER NOT NULL CHECK (vintage_years >= 0),
    gstin VARCHAR(15) CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Financial Details & Disposable Liquidity
CREATE TABLE IF NOT EXISTS public.financial_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    stated_gross_monthly_income NUMERIC(12,2) NOT NULL CHECK (stated_gross_monthly_income >= 0),
    stated_net_monthly_income NUMERIC(12,2) NOT NULL CHECK (stated_net_monthly_income > 0),
    verified_net_monthly_income NUMERIC(12,2) CHECK (verified_net_monthly_income IS NULL OR verified_net_monthly_income >= 0),
    existing_monthly_obligations NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (existing_monthly_obligations >= 0),
    liquid_assets NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (liquid_assets >= 0),
    primary_bank VARCHAR(100) NOT NULL,
    salary_credit_mode VARCHAR(30) NOT NULL DEFAULT 'bank_transfer' CHECK (salary_credit_mode IN ('bank_transfer', 'cheque', 'cash')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Property Collateral Specifications
CREATE TABLE IF NOT EXISTS public.property_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID UNIQUE NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN (
        'ready_apartment', 'under_construction_flat', 'independent_house', 
        'commercial_unit', 'plot_and_construction'
    )),
    property_stage VARCHAR(30) NOT NULL CHECK (property_stage IN ('ready_to_move', 'under_construction', 'resale')),
    property_address TEXT NOT NULL,
    carpet_area_sqft INTEGER NOT NULL CHECK (carpet_area_sqft > 0),
    estimated_market_value NUMERIC(14,2) NOT NULL CHECK (estimated_market_value > 0),
    technical_valuation_amount NUMERIC(14,2) CHECK (technical_valuation_amount IS NULL OR technical_valuation_amount > 0),
    property_title_status VARCHAR(50) NOT NULL,
    rera_number VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Immutability Enforcement Procedure for Loan Applications
-- Prevents submitted applications from being edited through direct database requests
CREATE OR REPLACE FUNCTION public.enforce_application_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- If application is already submitted or locked, prevent customer modifications
    IF (OLD.status != 'draft' OR OLD.is_locked = TRUE) AND NOT public.is_bank_staff() THEN
        RAISE EXCEPTION 'Direct edit rejected: Submitted or locked applications cannot be modified by applicants.';
    END IF;

    -- If customer is updating a draft, strictly guard privileged transitions
    IF NOT public.is_bank_staff() THEN
        -- Customers can only keep status as 'draft' or transition to 'submitted'
        IF NEW.status NOT IN ('draft', 'submitted') THEN
            RAISE EXCEPTION 'Privilege violation: Applicants cannot transition applications to %.', NEW.status;
        END IF;

        -- If submitting, lock application automatically
        IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
            NEW.is_locked := TRUE;
            NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
            NEW.sub_status := 'pending_underwriter_triage';
        END IF;

        -- Applicants cannot alter assigned underwriter
        IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
            RAISE EXCEPTION 'Privilege violation: Applicants cannot assign underwriters.';
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_app_immutability ON public.loan_applications;
CREATE TRIGGER trg_enforce_app_immutability
    BEFORE UPDATE ON public.loan_applications
    FOR EACH ROW EXECUTE FUNCTION public.enforce_application_immutability();

-- 8. Immutability Enforcement for Child Tables
CREATE OR REPLACE FUNCTION public.prevent_child_mutation_if_submitted()
RETURNS TRIGGER AS $$
DECLARE
    parent_app_id UUID;
    parent_status VARCHAR;
    parent_locked BOOLEAN;
BEGIN
    parent_app_id := COALESCE(NEW.application_id, OLD.application_id);

    SELECT status, is_locked INTO parent_status, parent_locked
    FROM public.loan_applications
    WHERE id = parent_app_id;

    IF (parent_status != 'draft' OR parent_locked = TRUE) AND NOT public.is_bank_staff() THEN
        RAISE EXCEPTION 'Direct edit rejected: Application child records are locked after submission.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach child table triggers
DROP TRIGGER IF EXISTS trg_lock_applicant_details ON public.applicant_details;
CREATE TRIGGER trg_lock_applicant_details
    BEFORE INSERT OR UPDATE OR DELETE ON public.applicant_details
    FOR EACH ROW EXECUTE FUNCTION public.prevent_child_mutation_if_submitted();

DROP TRIGGER IF EXISTS trg_lock_co_applicants ON public.co_applicants;
CREATE TRIGGER trg_lock_co_applicants
    BEFORE INSERT OR UPDATE OR DELETE ON public.co_applicants
    FOR EACH ROW EXECUTE FUNCTION public.prevent_child_mutation_if_submitted();

DROP TRIGGER IF EXISTS trg_lock_employment_details ON public.employment_details;
CREATE TRIGGER trg_lock_employment_details
    BEFORE INSERT OR UPDATE OR DELETE ON public.employment_details
    FOR EACH ROW EXECUTE FUNCTION public.prevent_child_mutation_if_submitted();

DROP TRIGGER IF EXISTS trg_lock_financial_details ON public.financial_details;
CREATE TRIGGER trg_lock_financial_details
    BEFORE INSERT OR UPDATE OR DELETE ON public.financial_details
    FOR EACH ROW EXECUTE FUNCTION public.prevent_child_mutation_if_submitted();

DROP TRIGGER IF EXISTS trg_lock_property_details ON public.property_details;
CREATE TRIGGER trg_lock_property_details
    BEFORE INSERT OR UPDATE OR DELETE ON public.property_details
    FOR EACH ROW EXECUTE FUNCTION public.prevent_child_mutation_if_submitted();
-- ==============================================================================
-- NIRNAY Migration 003: Document Management, Versioning & Verification
-- Secure Document Dossier with Full Version History & Tamper Checking
-- ==============================================================================

-- 1. Loan Documents Header Table
CREATE TABLE IF NOT EXISTS public.loan_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'pan_card', 'address_proof', 'salary_slips', 
        'bank_statements', 'property_title', 'itr_financials'
    )),
    document_subtype VARCHAR(50) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'uploaded', 'under_review', 'verified', 'failed', 'additional_info_required'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_doc_subtype UNIQUE (application_id, document_subtype)
);

CREATE INDEX IF NOT EXISTS idx_loan_documents_app_id ON public.loan_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_loan_documents_status ON public.loan_documents(status);

-- 2. Document Versions (Preserves previous files when re-uploaded or modified)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.loan_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 15728640), -- 15MB statutory max
    mime_type VARCHAR(100) NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
    sha256_checksum VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_doc_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON public.document_versions(document_id);

-- 3. Document Verification & OCR Results
CREATE TABLE IF NOT EXISTS public.document_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id UUID NOT NULL REFERENCES public.document_versions(id) ON DELETE CASCADE,
    verification_method VARCHAR(50) NOT NULL, -- 'ocr_tesseract_v1', 'nsdl_api_mock', 'manual_underwriter_review'
    extracted_data JSONB,
    confidence_score NUMERIC(5,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
    tamper_detected BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status VARCHAR(30) NOT NULL CHECK (verification_status IN (
        'verified', 'failed', 'tamper_suspected', 'manual_review'
    )),
    underwriter_remarks TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_verifications_ver_id ON public.document_verifications(document_version_id);

-- ==============================================================================
-- NIRNAY Migration 004: External Providers Registry & Verification Attempts
-- Provider-Adapter Architecture for DigiLocker, NSDL, CIBIL, & Account Aggregator
-- ==============================================================================

-- 1. External Data Sources Catalog
CREATE TABLE IF NOT EXISTS public.external_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code VARCHAR(50) UNIQUE NOT NULL, -- 'DIGILOCKER', 'NSDL_PAN', 'CIBIL', 'ACCOUNT_AGGREGATOR', 'LAND_REGISTRY', 'AML_WATCHLIST'
    provider_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('kyc', 'bureau', 'banking', 'collateral', 'aml')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    operational_mode VARCHAR(20) NOT NULL DEFAULT 'sandbox_mock' CHECK (operational_mode IN ('sandbox_mock', 'production_authorized')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. External Verification Attempts Ledger (Auditable, Idempotent Third-Party Calls)
CREATE TABLE IF NOT EXISTS public.external_verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.external_data_sources(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'not_configured', 'awaiting_consent', 'pending', 'successful', 'failed', 'manual_review'
    )),
    request_metadata JSONB,
    response_metadata JSONB,
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_verify_app_id ON public.external_verification_attempts(application_id);
CREATE INDEX IF NOT EXISTS idx_ext_verify_source_id ON public.external_verification_attempts(source_id);
CREATE INDEX IF NOT EXISTS idx_ext_verify_status ON public.external_verification_attempts(status);

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

-- ==============================================================================
-- NIRNAY Migration 006: Underwriting Decisions, Status History & Audit Logs
-- Binding Credit Decisions, Immutable Audit Trails & DPDP Consent Lifecycles
-- ==============================================================================

-- 1. Underwriting Decisions (Formal Binding Sanction / Decline by Underwriter)
CREATE TABLE IF NOT EXISTS public.underwriting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    decided_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decision_authority VARCHAR(50) NOT NULL DEFAULT 'Underwriting Desk',
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('APPROVE', 'REJECT', 'REFER')),
    sanctioned_amount NUMERIC(14,2) CHECK (sanctioned_amount IS NULL OR sanctioned_amount > 0),
    sanctioned_rate NUMERIC(4,2) CHECK (sanctioned_rate IS NULL OR sanctioned_rate > 0),
    sanctioned_tenure_months INTEGER CHECK (sanctioned_tenure_months IS NULL OR (sanctioned_tenure_months >= 12 AND sanctioned_tenure_months <= 360)),
    sanctioned_emi NUMERIC(12,2) CHECK (sanctioned_emi IS NULL OR sanctioned_emi > 0),
    sanction_valid_until DATE,
    conditions_precedent TEXT,
    remarks TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_app_id ON public.underwriting_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_decided_by ON public.underwriting_decisions(decided_by);

-- 2. Standardized Decision Reasons (RBI Fair Practice Code Justifications)
CREATE TABLE IF NOT EXISTS public.decision_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES public.underwriting_decisions(id) ON DELETE CASCADE,
    reason_code VARCHAR(50) NOT NULL,
    reason_description TEXT NOT NULL
);

-- 3. Application Status History (Chronological Status Progression)
CREATE TABLE IF NOT EXISTS public.application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_status_history_app_id ON public.application_status_history(application_id);

-- 4. Audit Logs (Strictly Append-Only Non-Repudiation Compliance Log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'SUBMIT_APPLICATION', 'DECISION_RECORDED', 'DOCUMENT_DOWNLOADED', 'CONSENT_GRANTED'
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 5. Revoke ALL Mutating Privileges on Audit Logs at Database Permission Level
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM public, anon, authenticated;

-- 6. Immutability Protection Trigger for Audit Logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable and cannot be modified, deleted, or truncated.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_protect_audit_logs
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_protect_audit_logs_truncate ON public.audit_logs;
CREATE TRIGGER trg_protect_audit_logs_truncate
    BEFORE TRUNCATE ON public.audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- 7. Digital Consent Records (DPDP Act 2023 & RBI Digital Lending Directions)
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
        'bureau_inquiry', 'digilocker_fetch', 'account_aggregator_access', 'underwriting_processing'
    )),
    legal_text_version VARCHAR(20) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_app_id ON public.consent_records(application_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON public.consent_records(user_id);

-- 8. Trigger to Track Status Transitions in application_status_history
CREATE OR REPLACE FUNCTION public.track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.application_status_history (
            application_id,
            previous_status,
            new_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(auth.uid(), NEW.user_id),
            COALESCE(NEW.sub_status, 'Status updated')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_track_loan_app_status ON public.loan_applications;
CREATE TRIGGER trg_track_loan_app_status
    AFTER UPDATE ON public.loan_applications
    FOR EACH ROW EXECUTE FUNCTION public.track_application_status_change();
-- ==============================================================================
-- NIRNAY Migration 007: Comprehensive Row Level Security (RLS) Policies
-- Strict Multi-Tenant Isolation & Role-Based Access Control on All 24 Tables
-- ==============================================================================

-- Enable RLS across all 24 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preliminary_eligibility_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_bank_staff() = true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. USER_ROLES (Strict: Customers CANNOT grant or edit roles)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can read own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_bank_staff() = true);

CREATE POLICY "Super admin can manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_super_admin() = true)
    WITH CHECK (public.is_super_admin() = true);

-- ------------------------------------------------------------------------------
-- 3. LOAN_APPLICATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view own applications" ON public.loan_applications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_bank_staff() = true);

CREATE POLICY "Borrowers can create draft application for self" ON public.loan_applications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND status = 'draft' AND is_locked = false);

CREATE POLICY "Borrowers can update own draft application" ON public.loan_applications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id AND status = 'draft' AND is_locked = false)
    WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'submitted'));

CREATE POLICY "Bank staff can update application status and assignment" ON public.loan_applications
    FOR UPDATE TO authenticated
    USING (public.is_bank_staff() = true)
    WITH CHECK (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 4. APPLICANT_DETAILS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view own applicant details" ON public.applicant_details
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Borrowers can insert own applicant details" ON public.applicant_details
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

CREATE POLICY "Borrowers can update own draft applicant details" ON public.applicant_details
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

-- ------------------------------------------------------------------------------
-- 5. CO_APPLICANTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Access co-applicants via application ownership" ON public.co_applicants
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Manage co-applicants on draft applications" ON public.co_applicants
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

-- ------------------------------------------------------------------------------
-- 6. EMPLOYMENT_DETAILS
-- ------------------------------------------------------------------------------
CREATE POLICY "Access employment via application ownership" ON public.employment_details
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Manage employment on draft applications" ON public.employment_details
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

-- ------------------------------------------------------------------------------
-- 7. FINANCIAL_DETAILS
-- ------------------------------------------------------------------------------
CREATE POLICY "Access financials via application ownership" ON public.financial_details
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Borrowers can manage draft financials" ON public.financial_details
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

CREATE POLICY "Bank staff can update verified income" ON public.financial_details
    FOR UPDATE TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 8. PROPERTY_DETAILS
-- ------------------------------------------------------------------------------
CREATE POLICY "Access property via application ownership" ON public.property_details
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Manage property on draft applications" ON public.property_details
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid() AND a.status = 'draft' AND a.is_locked = false)
    );

-- ------------------------------------------------------------------------------
-- 9. LOAN_DOCUMENTS & VERSIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Access documents via application ownership" ON public.loan_documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Borrowers can create doc placeholders" ON public.loan_documents
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND a.user_id = auth.uid())
    );

CREATE POLICY "Bank staff can update document review status" ON public.loan_documents
    FOR UPDATE TO authenticated
    USING (public.is_bank_staff() = true);

CREATE POLICY "Access document versions via document ownership" ON public.document_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.loan_documents d
            JOIN public.loan_applications a ON a.id = d.application_id
            WHERE d.id = document_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true)
        )
    );

CREATE POLICY "Borrowers can upload new document versions" ON public.document_versions
    FOR INSERT TO authenticated
    WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.loan_documents d
            JOIN public.loan_applications a ON a.id = d.application_id
            WHERE d.id = document_id AND a.user_id = auth.uid() AND (a.status = 'draft' OR a.status = 'in_verification')
        )
    );

-- ------------------------------------------------------------------------------
-- 10. DOCUMENT_VERIFICATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view verification summary" ON public.document_verifications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.document_versions v
            JOIN public.loan_documents d ON d.id = v.document_id
            JOIN public.loan_applications a ON a.id = d.application_id
            WHERE v.id = document_version_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true)
        )
    );

CREATE POLICY "Bank staff can insert/update document verifications" ON public.document_verifications
    FOR ALL TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 11. EXTERNAL_DATA_SOURCES & ATTEMPTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Bank staff can view external data sources" ON public.external_data_sources
    FOR SELECT TO authenticated
    USING (public.is_bank_staff() = true);

CREATE POLICY "Bank staff can view verification attempts" ON public.external_verification_attempts
    FOR SELECT TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 12. CREDIT_POLICY_RULES & VERSIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read active policy rules" ON public.credit_policy_rules
    FOR SELECT TO authenticated
    USING (is_active = true OR public.is_bank_staff() = true);

CREATE POLICY "Super admin can manage policy rules" ON public.credit_policy_rules
    FOR ALL TO authenticated
    USING (public.is_super_admin() = true);

CREATE POLICY "Bank staff can view policy versions" ON public.credit_policy_versions
    FOR SELECT TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 13. PRELIMINARY_ELIGIBILITY_ASSESSMENTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view own eligibility assessment" ON public.preliminary_eligibility_assessments
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Bank staff can create eligibility assessments" ON public.preliminary_eligibility_assessments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 14. FRAUD_ALERTS (Strict: Customers NEVER see fraud flags)
-- ------------------------------------------------------------------------------
CREATE POLICY "Only bank staff can view fraud alerts" ON public.fraud_alerts
    FOR SELECT TO authenticated
    USING (public.is_bank_staff() = true);

CREATE POLICY "Only bank staff can update fraud alerts" ON public.fraud_alerts
    FOR UPDATE TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 15. RISK_ASSESSMENTS & COMPLIANCE_CHECKS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers view own compliance checks" ON public.compliance_checks
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Bank staff view risk assessments" ON public.risk_assessments
    FOR SELECT TO authenticated
    USING (public.is_bank_staff() = true);

CREATE POLICY "Bank staff can manage compliance and risk" ON public.compliance_checks
    FOR ALL TO authenticated
    USING (public.is_bank_staff() = true);

CREATE POLICY "Bank staff can manage risk assessments" ON public.risk_assessments
    FOR ALL TO authenticated
    USING (public.is_bank_staff() = true);

-- ------------------------------------------------------------------------------
-- 16. UNDERWRITING_DECISIONS & REASONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view finalized decision" ON public.underwriting_decisions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Only underwriters can record decisions" ON public.underwriting_decisions
    FOR INSERT TO authenticated
    WITH CHECK (
        decided_by = auth.uid() AND
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('underwriter', 'super_admin'))
    );

CREATE POLICY "Read decision reasons" ON public.decision_reasons
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.underwriting_decisions d
            JOIN public.loan_applications a ON a.id = d.application_id
            WHERE d.id = decision_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true)
        )
    );

-- ------------------------------------------------------------------------------
-- 17. APPLICATION_STATUS_HISTORY & AUDIT_LOGS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers view status history" ON public.application_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.loan_applications a WHERE a.id = application_id AND (a.user_id = auth.uid() OR public.is_bank_staff() = true))
    );

CREATE POLICY "Only super admin can read audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_super_admin() = true);

-- ------------------------------------------------------------------------------
-- 18. CONSENT_RECORDS
-- ------------------------------------------------------------------------------
CREATE POLICY "Borrowers can view own consent records" ON public.consent_records
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_bank_staff() = true);

CREATE POLICY "Borrowers can record consent" ON public.consent_records
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
-- ==============================================================================
-- NIRNAY Migration 008: Storage Bucket & Storage Object RLS Policies
-- Strictly Private Storage for Sensitive Identity & Property Collateral Files
-- Path Traversal & Folder Manipulation Hardened
-- ==============================================================================

-- 1. Create Private Bucket 'mortgage-documents' in storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mortgage-documents',
    'mortgage-documents',
    false, -- Strictly Private Bucket
    15728640, -- 15MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- 2. Storage RLS Policies on storage.objects

-- Allow authenticated borrowers to upload documents ONLY into their own application folder
-- Path MUST begin with a valid UUID prefix matching an owned application, with zero directory traversal
DROP POLICY IF EXISTS "Borrowers upload to own draft folder" ON storage.objects;
CREATE POLICY "Borrowers upload to own draft folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    name NOT LIKE '%//%' AND
    name NOT LIKE '%\%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND (status = 'draft' OR status = 'in_verification')
    )
);

-- Allow authenticated borrowers to read documents from their own application folder
DROP POLICY IF EXISTS "Borrowers read own documents" ON storage.objects;
CREATE POLICY "Borrowers read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
    )
);

-- Allow bank staff (underwriter, reviewer, super_admin) to inspect all mortgage documents
DROP POLICY IF EXISTS "Bank staff inspect all mortgage documents" ON storage.objects;
CREATE POLICY "Bank staff inspect all mortgage documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    public.is_bank_staff() = true
);

-- Allow borrowers to delete/replace document only while application is still in draft
DROP POLICY IF EXISTS "Borrowers delete draft documents" ON storage.objects;
CREATE POLICY "Borrowers delete draft documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'mortgage-documents' AND
    name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' AND
    name NOT LIKE '%..%' AND
    EXISTS (
        SELECT 1 FROM public.loan_applications
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND status = 'draft'
          AND is_locked = false
    )
);
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
