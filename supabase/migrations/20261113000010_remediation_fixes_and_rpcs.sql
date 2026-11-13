-- ==============================================================================
-- NIRNAY Migration 010: Security Hardening, Registration Fix & Atomic RPCs
-- Compliant with RBI Digital Lending Directions & DPDP Act, 2023
-- Idempotent & Non-Destructive Remediation Patch
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. P0 REMEDIATION: Fix Customer Registration & Safeguard Role Provisioning
-- ------------------------------------------------------------------------------

-- Update handle_new_user to set a scoped transaction variable before role insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_name VARCHAR(150);
BEGIN
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Insert profile row
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

    -- Set transaction-local configuration flag verifying trusted signup origin
    PERFORM set_config('nirnay.signup_provisioning', 'active', true);

    -- Assign baseline 'customer' role strictly
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update protect_user_roles trigger function to permit customer provisioning
-- strictly during trusted signup, verified super_admin, or master postgres management
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
DECLARE
    is_trusted_signup BOOLEAN;
BEGIN
    -- Check if execution is inside the trusted handle_new_user trigger transaction
    is_trusted_signup := (NULLIF(current_setting('nirnay.signup_provisioning', true), '') = 'active');

    -- Condition 1: Trusted signup trigger inserting baseline 'customer' role
    IF TG_OP = 'INSERT' AND NEW.role = 'customer' AND is_trusted_signup THEN
        -- Verify that user exists in auth.users
        IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Condition 2: Explicit super_admin or master postgres/supabase_admin management
    IF public.is_super_admin() OR current_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- All other insertions, updates, or deletions are strictly rejected
    RAISE EXCEPTION 'Privilege escalation blocked: Role modification requires verified Super Admin authorization.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach trigger on public.user_roles
DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
CREATE TRIGGER trg_protect_user_roles
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.protect_user_roles();

-- Re-affirm table grants: public, anon and authenticated CANNOT insert directly
REVOKE ALL ON public.user_roles FROM public, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;


-- ------------------------------------------------------------------------------
-- 2. P2 REMEDIATION: Atomic Application Draft Saving RPC
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_application_draft_atomic(
    p_application_id UUID,
    p_dossier JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_app_id UUID := p_application_id;
    v_loan_type VARCHAR(30);
    v_loan_purpose VARCHAR(100);
    v_loan_amount NUMERIC(15,2);
    v_tenure INTEGER;
    v_existing_status VARCHAR(30);
    v_is_locked BOOLEAN;
    v_app_number VARCHAR(50);
BEGIN
    -- 1. Authorization check
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: User must be signed in to save application drafts.';
    END IF;

    -- Extract header values
    v_loan_type := COALESCE(p_dossier->>'loanType', 'home_loan');
    v_loan_purpose := COALESCE(
        p_dossier->>'loanPurpose', 
        CASE WHEN v_loan_type = 'lap' THEN 'working_capital' ELSE 'purchase' END
    );
    v_loan_amount := COALESCE((p_dossier->>'loanAmountRequested')::NUMERIC, 1000000);
    v_tenure := COALESCE((p_dossier->>'tenureMonthsRequested')::INTEGER, 240);

    -- 2. Verify or create application header
    IF v_app_id IS NOT NULL THEN
        SELECT status, is_locked, application_number 
        INTO v_existing_status, v_is_locked, v_app_number
        FROM public.loan_applications
        WHERE id = v_app_id AND user_id = v_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Application not found or unauthorized: ID %', v_app_id;
        END IF;

        IF v_is_locked OR v_existing_status NOT IN ('draft', 'in_verification') THEN
            RAISE EXCEPTION 'Application is locked and cannot be edited in current status: %', v_existing_status;
        END IF;

        UPDATE public.loan_applications
        SET loan_type = v_loan_type,
            loan_purpose = v_loan_purpose,
            loan_amount_requested = v_loan_amount,
            tenure_months_requested = v_tenure,
            updated_at = NOW()
        WHERE id = v_app_id;
    ELSE
        v_app_number := 'APP-2026-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
        INSERT INTO public.loan_applications (
            application_number,
            user_id,
            loan_type,
            loan_purpose,
            loan_amount_requested,
            tenure_months_requested,
            status,
            sub_status,
            is_locked
        ) VALUES (
            v_app_number,
            v_user_id,
            v_loan_type,
            v_loan_purpose,
            v_loan_amount,
            v_tenure,
            'draft',
            'intake_in_progress',
            false
        ) RETURNING id INTO v_app_id;
    END IF;

    -- 3. Upsert applicant_details if provided
    IF (p_dossier->>'applicantName') IS NOT NULL AND (p_dossier->>'panNumber') IS NOT NULL THEN
        INSERT INTO public.applicant_details (
            application_id,
            full_name,
            dob,
            pan_number,
            gender,
            marital_status,
            current_address,
            residence_stability_years,
            permanent_address
        ) VALUES (
            v_app_id,
            p_dossier->>'applicantName',
            COALESCE((p_dossier->>'dob')::DATE, '1990-01-01'::DATE),
            UPPER(p_dossier->>'panNumber'),
            LOWER(COALESCE(p_dossier->>'gender', 'male')),
            LOWER(COALESCE(p_dossier->>'maritalStatus', 'single')),
            COALESCE(p_dossier->>'currentAddress', 'Not Provided'),
            COALESCE((p_dossier->>'residenceStabilityYears')::NUMERIC, 2),
            COALESCE(p_dossier->>'permanentAddress', p_dossier->>'currentAddress', 'Not Provided')
        )
        ON CONFLICT (application_id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            dob = EXCLUDED.dob,
            pan_number = EXCLUDED.pan_number,
            gender = EXCLUDED.gender,
            marital_status = EXCLUDED.marital_status,
            current_address = EXCLUDED.current_address,
            residence_stability_years = EXCLUDED.residence_stability_years,
            permanent_address = EXCLUDED.permanent_address;
    END IF;

    -- 4. Upsert employment_details if provided
    IF (p_dossier->>'employerName') IS NOT NULL THEN
        INSERT INTO public.employment_details (
            application_id,
            employment_type,
            employer_or_business_name,
            designation,
            vintage_years,
            gstin
        ) VALUES (
            v_app_id,
            COALESCE(p_dossier->>'employmentType', 'salaried'),
            p_dossier->>'employerName',
            COALESCE(p_dossier->>'designation', 'Staff'),
            COALESCE((p_dossier->>'yearsInJob')::NUMERIC, 1),
            p_dossier->>'gstin'
        )
        ON CONFLICT (application_id) DO UPDATE
        SET employment_type = EXCLUDED.employment_type,
            employer_or_business_name = EXCLUDED.employer_or_business_name,
            designation = EXCLUDED.designation,
            vintage_years = EXCLUDED.vintage_years,
            gstin = EXCLUDED.gstin;
    END IF;

    -- 5. Upsert financial_details if provided
    IF (p_dossier->>'netMonthlyIncome') IS NOT NULL THEN
        INSERT INTO public.financial_details (
            application_id,
            stated_gross_monthly_income,
            stated_net_monthly_income,
            existing_monthly_obligations,
            liquid_assets,
            primary_bank,
            salary_credit_mode
        ) VALUES (
            v_app_id,
            COALESCE((p_dossier->>'grossMonthlyIncome')::NUMERIC, (p_dossier->>'netMonthlyIncome')::NUMERIC * 1.2),
            (p_dossier->>'netMonthlyIncome')::NUMERIC,
            COALESCE((p_dossier->>'existingMonthlyObligations')::NUMERIC, 0),
            COALESCE((p_dossier->>'liquidAssets')::NUMERIC, 0),
            COALESCE(p_dossier->>'primaryBank', 'HDFC Bank'),
            'bank_transfer'
        )
        ON CONFLICT (application_id) DO UPDATE
        SET stated_gross_monthly_income = EXCLUDED.stated_gross_monthly_income,
            stated_net_monthly_income = EXCLUDED.stated_net_monthly_income,
            existing_monthly_obligations = EXCLUDED.existing_monthly_obligations,
            liquid_assets = EXCLUDED.liquid_assets,
            primary_bank = EXCLUDED.primary_bank;
    END IF;

    -- 6. Upsert property_details if provided
    IF (p_dossier->>'estimatedMarketValue') IS NOT NULL THEN
        INSERT INTO public.property_details (
            application_id,
            property_type,
            property_stage,
            property_address,
            carpet_area_sqft,
            estimated_market_value,
            property_title_status,
            rera_number
        ) VALUES (
            v_app_id,
            LOWER(REPLACE(COALESCE(p_dossier->>'propertyType', 'ready_apartment'), ' ', '_')),
            'ready_to_move',
            COALESCE(p_dossier->>'propertyAddress', 'Not Provided'),
            COALESCE((p_dossier->>'carpetAreaSqft')::NUMERIC, 800),
            (p_dossier->>'estimatedMarketValue')::NUMERIC,
            COALESCE(p_dossier->>'propertyTitleStatus', 'Clear Title'),
            p_dossier->>'reraNumber'
        )
        ON CONFLICT (application_id) DO UPDATE
        SET property_type = EXCLUDED.property_type,
            property_address = EXCLUDED.property_address,
            carpet_area_sqft = EXCLUDED.carpet_area_sqft,
            estimated_market_value = EXCLUDED.estimated_market_value,
            property_title_status = EXCLUDED.property_title_status,
            rera_number = EXCLUDED.rera_number;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'application_id', v_app_id,
        'application_number', v_app_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.save_application_draft_atomic(UUID, JSONB) TO authenticated;


-- ------------------------------------------------------------------------------
-- 3. P2 REMEDIATION: Atomic Underwriting Adjudication RPC
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_underwriting_decision(
    p_application_id UUID,
    p_outcome VARCHAR(30),
    p_decision_authority VARCHAR(100),
    p_sanctioned_amount NUMERIC(15,2),
    p_sanctioned_rate NUMERIC(5,2),
    p_sanctioned_tenure_months INTEGER,
    p_remarks TEXT,
    p_decision_reasons JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_staff_id UUID := auth.uid();
    v_is_staff BOOLEAN;
    v_new_status VARCHAR(30);
    v_decision_id UUID;
    v_calculated_emi NUMERIC(15,2) := NULL;
BEGIN
    -- 1. Authorization check
    IF v_staff_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Underwriter must be signed in.';
    END IF;

    -- Verify that caller possesses underwriter, reviewer or super_admin role
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_staff_id AND role IN ('underwriter', 'reviewer', 'super_admin')
    ) INTO v_is_staff;

    IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Permission denied: Caller does not hold underwriter credentials.';
    END IF;

    -- Validate outcome value
    IF p_outcome NOT IN ('APPROVE', 'REJECT', 'REFER', 'CONDITIONAL_APPROVAL') THEN
        RAISE EXCEPTION 'Invalid underwriting outcome: %', p_outcome;
    END IF;

    -- Map outcome to loan application status
    v_new_status := CASE
        WHEN p_outcome IN ('APPROVE', 'CONDITIONAL_APPROVAL') THEN 'approved'
        WHEN p_outcome = 'REJECT' THEN 'rejected'
        ELSE 'referred'
    END;

    -- Calculate indicative EMI if approved
    IF p_outcome IN ('APPROVE', 'CONDITIONAL_APPROVAL') AND p_sanctioned_amount > 0 THEN
        v_calculated_emi := ROUND(p_sanctioned_amount * 0.0086);
    END IF;

    -- 2. Insert decision record
    INSERT INTO public.underwriting_decisions (
        application_id,
        decided_by,
        outcome,
        decision_authority,
        sanctioned_amount,
        sanctioned_rate,
        sanctioned_tenure_months,
        sanctioned_emi,
        remarks
    ) VALUES (
        p_application_id,
        v_staff_id,
        p_outcome,
        COALESCE(p_decision_authority, 'Senior Credit Underwriter'),
        p_sanctioned_amount,
        p_sanctioned_rate,
        p_sanctioned_tenure_months,
        v_calculated_emi,
        p_remarks
    ) RETURNING id INTO v_decision_id;

    -- 3. Insert structured decision reasons if provided
    IF p_decision_reasons IS NOT NULL AND jsonb_array_length(p_decision_reasons) > 0 THEN
        INSERT INTO public.decision_reasons (
            decision_id,
            reason_category,
            reason_code,
            reason_description,
            mitigating_factors
        )
        SELECT
            v_decision_id,
            COALESCE(item->>'category', 'credit_risk'),
            COALESCE(item->>'code', 'POL_RULE_CHECK'),
            item->>'description',
            item->>'mitigatingFactors'
        FROM jsonb_array_elements(p_decision_reasons) AS item;
    END IF;

    -- 4. Update loan_applications status atomically
    -- trg_track_loan_app_status automatically records status transition into application_status_history
    UPDATE public.loan_applications
    SET status = v_new_status,
        sub_status = 'Decision: ' || p_outcome,
        updated_at = NOW()
    WHERE id = p_application_id;

    RETURN jsonb_build_object(
        'success', true,
        'decision_id', v_decision_id,
        'application_id', p_application_id,
        'status', v_new_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.record_underwriting_decision(UUID, VARCHAR, VARCHAR, NUMERIC, NUMERIC, INTEGER, TEXT, JSONB) TO authenticated;


-- ------------------------------------------------------------------------------
-- 4. STAFF ROLE PROVISIONING: Elevate Test Underwriter Account
-- ------------------------------------------------------------------------------

UPDATE public.user_roles
SET role = 'underwriter'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'underwriter@herohousing.in');


-- ------------------------------------------------------------------------------
-- 5. MIGRATION RECONCILIATION: Baseline Tracking for Supabase CLI
-- ------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY,
    inserted_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO supabase_migrations.schema_migrations (version) VALUES
    ('20261113000001'),
    ('20261113000002'),
    ('20261113000003'),
    ('20261113000004'),
    ('20261113000005'),
    ('20261113000006'),
    ('20261113000007'),
    ('20261113000008'),
    ('20261113000009'),
    ('20261113000010')
ON CONFLICT (version) DO NOTHING;
