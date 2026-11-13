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
