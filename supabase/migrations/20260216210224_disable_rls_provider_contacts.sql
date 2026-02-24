-- Disable RLS on provider contacts since API routes handle auth
-- The service client can't use auth.uid() policies anyway
ALTER TABLE linksy_provider_contacts DISABLE ROW LEVEL SECURITY;;
