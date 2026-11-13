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

