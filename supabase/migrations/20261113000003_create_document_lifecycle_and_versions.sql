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

