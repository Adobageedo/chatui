-- ============================================================================
-- Organizations and Organization Membership
-- Core multi-tenancy tables for the application
-- ============================================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization details
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization users (membership)
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relations
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role/permissions (optional, can be extended)
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: user can only be in an org once
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON public.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON public.organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- Helper function: update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Organizations: users can view their own orgs
CREATE POLICY "Users can view their organizations"
    ON public.organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Organizations: owners/admins can update
CREATE POLICY "Org owners/admins can update"
    ON public.organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Organization users: members can view their org's members
CREATE POLICY "Org members can view org users"
    ON public.organization_users
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

-- Organization users: owners/admins can manage members
CREATE POLICY "Org owners/admins can manage members"
    ON public.organization_users
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Grants
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_users TO authenticated;

-- Function: Auto-create default organization for new users
CREATE OR REPLACE FUNCTION public.create_default_organization()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create a personal organization for the user
    INSERT INTO public.organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization',
        'org-' || NEW.id::text
    )
    RETURNING id INTO new_org_id;
    
    -- Add user as owner of their organization
    INSERT INTO public.organization_users (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create org on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_organization();

-- Comments
COMMENT ON TABLE public.organizations IS 'Organizations for multi-tenancy';
COMMENT ON TABLE public.organization_users IS 'Organization membership and roles';
COMMENT ON FUNCTION public.create_default_organization IS 'Auto-creates a default organization when a user signs up';
