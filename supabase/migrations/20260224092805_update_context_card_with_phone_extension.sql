-- Update linksy_generate_context_card function to include phone extension
-- This ensures the AI context cards show phone extensions when present

CREATE OR REPLACE FUNCTION linksy_generate_context_card(p_provider_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider RECORD;
  v_location RECORD;
  v_needs TEXT[];
  v_card TEXT := '';
BEGIN
  SELECT * INTO v_provider FROM linksy_providers WHERE id = p_provider_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_location FROM linksy_locations WHERE provider_id = p_provider_id AND is_primary = true LIMIT 1;
  SELECT ARRAY_AGG(n.name ORDER BY n.name) INTO v_needs
    FROM linksy_provider_needs pn JOIN linksy_needs n ON n.id = pn.need_id WHERE pn.provider_id = p_provider_id;

  v_card := '## ' || v_provider.name || E'\n';
  IF v_provider.description IS NOT NULL THEN v_card := v_card || v_provider.description || E'\n\n'; END IF;

  -- Phone with optional extension
  IF v_provider.phone IS NOT NULL THEN
    v_card := v_card || '**Phone:** ' || v_provider.phone;
    IF v_provider.phone_extension IS NOT NULL AND v_provider.phone_extension != '' THEN
      v_card := v_card || ' ext. ' || v_provider.phone_extension;
    END IF;
    v_card := v_card || E'\n';
  END IF;

  IF v_provider.email IS NOT NULL THEN v_card := v_card || '**Email:** ' || v_provider.email || E'\n'; END IF;
  IF v_provider.hours_of_operation IS NOT NULL THEN v_card := v_card || '**Hours:** ' || v_provider.hours_of_operation || E'\n'; END IF;
  IF v_location IS NOT NULL AND v_location.address_line1 IS NOT NULL THEN
    v_card := v_card || '**Address:** ' || v_location.address_line1;
    IF v_location.city IS NOT NULL THEN v_card := v_card || ', ' || v_location.city; END IF;
    IF v_location.state IS NOT NULL THEN v_card := v_card || ', ' || v_location.state; END IF;
    IF v_location.postal_code IS NOT NULL THEN v_card := v_card || ' ' || v_location.postal_code; END IF;
    v_card := v_card || E'\n';
  END IF;
  IF v_provider.website IS NOT NULL THEN v_card := v_card || '**Website:** ' || v_provider.website || E'\n'; END IF;
  IF v_needs IS NOT NULL AND array_length(v_needs, 1) > 0 THEN
    v_card := v_card || '**Services:** ' || array_to_string(v_needs, ', ') || E'\n';
  END IF;

  IF v_provider.referral_type = 'contact_directly' AND v_provider.referral_instructions IS NOT NULL THEN
    v_card := v_card || E'\n**How to get help:** ' || v_provider.referral_instructions || E'\n';
  END IF;

  RETURN v_card;
END;
$$;

-- Trigger to auto-regenerate context card still uses the updated function
-- No changes needed to the trigger itself
