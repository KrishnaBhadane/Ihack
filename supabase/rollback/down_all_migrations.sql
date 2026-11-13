-- ==============================================================================
-- NIRNAY Complete Rollback Script (Reverse of Migrations 001 - 009)
-- Restores Database to Clean State Prior to Migration Execution
-- ==============================================================================

-- 1. Drop Seeded Catalog Data (Migration 009)
DELETE FROM public.credit_policy_rules WHERE rule_code IN (
    'POL-HL-LTV-01', 'POL-HL-LTV-02', 'POL-HL-LTV-03', 'POL-COOLING-OFF',
    'POL-LAP-LTV', 'POL-FOIR-MAX', 'POL-CIBIL-MIN', 'POL-TENURE-HL', 'POL-TENURE-LAP'
);
DELETE FROM public.external_data_sources WHERE provider_code IN (
    'DIGILOCKER', 'NSDL_PAN', 'CIBIL', 'ACCOUNT_AGGREGATOR', 'LAND_REGISTRY', 'AML_WATCHLIST'
);

-- 2. Drop Storage Bucket & Policies (Migration 008)
DROP POLICY IF EXISTS "Borrowers upload to own draft folder" ON storage.objects;
DROP POLICY IF EXISTS "Borrowers read own documents" ON storage.objects;
DROP POLICY IF EXISTS "Bank staff inspect all mortgage documents" ON storage.objects;
DROP POLICY IF EXISTS "Borrowers delete draft documents" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'mortgage-documents';

-- 3. Drop RLS Policies (Migration 007)
ALTER TABLE IF EXISTS public.consent_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.application_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.decision_reasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.underwriting_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.compliance_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.risk_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fraud_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.preliminary_eligibility_assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credit_policy_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.credit_policy_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.external_verification_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.external_data_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.property_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.financial_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employment_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.co_applicants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applicant_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Drop Child Immutability Triggers (Migration 002)
DROP TRIGGER IF EXISTS trg_lock_property_details ON public.property_details;
DROP TRIGGER IF EXISTS trg_lock_financial_details ON public.financial_details;
DROP TRIGGER IF EXISTS trg_lock_employment_details ON public.employment_details;
DROP TRIGGER IF EXISTS trg_lock_co_applicants ON public.co_applicants;
DROP TRIGGER IF EXISTS trg_lock_applicant_details ON public.applicant_details;
DROP FUNCTION IF EXISTS public.prevent_child_mutation_if_submitted();

DROP TRIGGER IF EXISTS trg_enforce_app_immutability ON public.loan_applications;
DROP FUNCTION IF EXISTS public.enforce_application_immutability();

-- 5. Drop Audit & Status Triggers (Migration 006)
DROP TRIGGER IF EXISTS trg_track_loan_app_status ON public.loan_applications;
DROP FUNCTION IF EXISTS public.track_application_status_change();

DROP TRIGGER IF EXISTS trg_protect_audit_logs_truncate ON public.audit_logs;
DROP TRIGGER IF EXISTS trg_protect_audit_logs ON public.audit_logs;
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();

-- 6. Drop Auth & Role Triggers (Migration 001)
DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.user_roles;
DROP FUNCTION IF EXISTS public.protect_user_roles();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 7. Drop Tables in Reverse Dependency Sequence
DROP TABLE IF EXISTS public.consent_records CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.application_status_history CASCADE;
DROP TABLE IF EXISTS public.decision_reasons CASCADE;
DROP TABLE IF EXISTS public.underwriting_decisions CASCADE;
DROP TABLE IF EXISTS public.compliance_checks CASCADE;
DROP TABLE IF EXISTS public.risk_assessments CASCADE;
DROP TABLE IF EXISTS public.fraud_alerts CASCADE;
DROP TABLE IF EXISTS public.preliminary_eligibility_assessments CASCADE;
DROP TABLE IF EXISTS public.credit_policy_versions CASCADE;
DROP TABLE IF EXISTS public.credit_policy_rules CASCADE;
DROP TABLE IF EXISTS public.external_verification_attempts CASCADE;
DROP TABLE IF EXISTS public.external_data_sources CASCADE;
DROP TABLE IF EXISTS public.document_verifications CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.loan_documents CASCADE;
DROP TABLE IF EXISTS public.property_details CASCADE;
DROP TABLE IF EXISTS public.financial_details CASCADE;
DROP TABLE IF EXISTS public.employment_details CASCADE;
DROP TABLE IF EXISTS public.co_applicants CASCADE;
DROP TABLE IF EXISTS public.applicant_details CASCADE;
DROP TABLE IF EXISTS public.loan_applications CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 8. Drop Security Definer Helper Functions (Migration 001)
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_bank_staff();
