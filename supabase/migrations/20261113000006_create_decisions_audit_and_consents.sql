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
