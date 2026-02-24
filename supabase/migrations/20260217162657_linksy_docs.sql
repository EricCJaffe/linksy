CREATE TABLE public.linksy_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  min_role TEXT NOT NULL DEFAULT 'user'
    CHECK (min_role IN ('user', 'provider_employee', 'tenant_admin', 'site_admin')),
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED
);
CREATE INDEX linksy_docs_fts_idx ON public.linksy_docs USING gin(search_vector);
CREATE INDEX linksy_docs_category_idx ON public.linksy_docs (category, sort_order);;
