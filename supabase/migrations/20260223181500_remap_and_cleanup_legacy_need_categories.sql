-- Remap referenced legacy need categories to active AIRS categories, then remove unused legacy categories.
DO $$
DECLARE
  legacy_mind_wellness_id uuid;
  legacy_money_help_id uuid;
  active_mha_id uuid;
  active_income_support_id uuid;
BEGIN
  -- Resolve category IDs by slug.
  SELECT id INTO legacy_mind_wellness_id
  FROM public.linksy_need_categories
  WHERE slug = 'mind-and-wellness'
  LIMIT 1;

  SELECT id INTO legacy_money_help_id
  FROM public.linksy_need_categories
  WHERE slug = 'money-help'
  LIMIT 1;

  SELECT id INTO active_mha_id
  FROM public.linksy_need_categories
  WHERE slug = 'mental-health-addictions'
  LIMIT 1;

  SELECT id INTO active_income_support_id
  FROM public.linksy_need_categories
  WHERE slug = 'income-support-assistance'
  LIMIT 1;

  -- Remap needs that currently point to legacy categories.
  IF legacy_mind_wellness_id IS NOT NULL AND active_mha_id IS NOT NULL THEN
    UPDATE public.linksy_needs
    SET category_id = active_mha_id,
        updated_at = NOW()
    WHERE category_id = legacy_mind_wellness_id;
  END IF;

  IF legacy_money_help_id IS NOT NULL AND active_income_support_id IS NOT NULL THEN
    UPDATE public.linksy_needs
    SET category_id = active_income_support_id,
        updated_at = NOW()
    WHERE category_id = legacy_money_help_id;
  END IF;

  -- Remove inactive categories that no longer have any needs.
  DELETE FROM public.linksy_need_categories c
  WHERE c.is_active = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.linksy_needs n
      WHERE n.category_id = c.id
    );
END $$;
