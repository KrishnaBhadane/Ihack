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
