-- Allow authenticated users to read all provider contacts
-- This is needed for displaying contacts on provider detail pages
CREATE POLICY "provider_contacts_authenticated_read"
ON linksy_provider_contacts
FOR SELECT
TO authenticated
USING (true);;
