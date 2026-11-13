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
