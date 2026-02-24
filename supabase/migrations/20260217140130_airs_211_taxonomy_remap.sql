
DO $$
DECLARE
  v_site_id UUID := '86bd8d01-0dc5-4479-beff-666712654104';

  cat_arts           UUID;
  cat_clothing       UUID;
  cat_disaster       UUID;
  cat_education      UUID;
  cat_employment     UUID;
  cat_food           UUID;
  cat_healthcare     UUID;
  cat_housing        UUID;
  cat_income         UUID;
  cat_ind_family     UUID;
  cat_information    UUID;
  cat_legal          UUID;
  cat_mental_health  UUID;
  cat_government     UUID;
  cat_transportation UUID;
  cat_utilities      UUID;
  cat_volunteer      UUID;

BEGIN

-- ============================================================================
-- STEP 1: INSERT 17 AIRS/211 STANDARD CATEGORIES
-- ============================================================================

-- Rename old 'transportation' slug first to free it up for the AIRS category
UPDATE linksy_need_categories
SET slug = 'transportation-legacy'
WHERE site_id = v_site_id AND slug = 'transportation';

INSERT INTO linksy_need_categories
  (site_id, name, slug, description, sort_order, airs_code, is_active)
VALUES
  (v_site_id,
   'Arts, Culture and Recreation', 'arts-culture-recreation',
   'Programs that allow people to fully participate in and enjoy a variety of recreational, social, spiritual, artistic, cultural and intellectual opportunities.',
   10, 'AIRS-ACR', true),

  (v_site_id,
   'Clothing/Personal/Household Needs', 'clothing-personal-household',
   'Programs that provide and/or repair basic household, work-related, and personal necessities for people who need them.',
   20, 'AIRS-CPH', true),

  (v_site_id,
   'Disaster Services', 'disaster-services',
   'Programs that provide emergency planning, preparedness, mitigation, response, relief and/or recovery services prior to, during, and after a major disaster or localized incident.',
   30, 'AIRS-DIS', true),

  (v_site_id,
   'Education', 'education',
   'Programs that provide opportunities for people to acquire the knowledge, skills and general competence to fully participate in community life.',
   40, 'AIRS-EDU', true),

  (v_site_id,
   'Employment', 'employment',
   'Programs that provide employment opportunities, assist people in finding and retaining suitable employment, and develop employment opportunities in various fields.',
   50, 'AIRS-EMP', true),

  (v_site_id,
   'Food/Meals', 'food-meals',
   'Programs that seek to meet the basic nutritional needs of the community by providing access to food.',
   60, 'AIRS-FOO', true),

  (v_site_id,
   'Health Care', 'health-care',
   'Programs that help individuals and families achieve and maintain physical well-being through prevention, screening, evaluation and treatment of illnesses, injuries and disabilities.',
   70, 'AIRS-HLT', true),

  (v_site_id,
   'Housing', 'housing',
   'Programs that seek to meet the basic shelter needs of the community by providing emergency shelter, housing assistance, home improvement programs and housing alternatives.',
   80, 'AIRS-HOU', true),

  (v_site_id,
   'Income Support/Assistance', 'income-support-assistance',
   'Programs that provide financial assistance, emergency payments or cash grants for eligible individuals and families to ensure basic income and access to essential services.',
   90, 'AIRS-INC', true),

  (v_site_id,
   'Individual, Family and Community Support', 'individual-family-community-support',
   'Programs that support individuals, families and the broader community by providing services that replace, protect or supplement family care and advocate for beneficial community changes. Includes programs for the humane care and protection of domestic animals.',
   100, 'AIRS-IFC', true),

  (v_site_id,
   'Information Services', 'information-services',
   'Programs that provide for the collection, classification, storage, retrieval and dissemination of recorded knowledge, including information and referral programs, library services and public awareness campaigns.',
   110, 'AIRS-INF', true),

  (v_site_id,
   'Legal, Consumer and Public Safety', 'legal-consumer-public-safety',
   'Programs that promote and preserve conditions enabling individuals to live in a safe and peaceful environment through law enforcement, consumer protection and public safety programs.',
   120, 'AIRS-LGL', true),

  (v_site_id,
   'Mental Health and Addictions', 'mental-health-addictions',
   'Programs that provide preventive, diagnostic and treatment services to help people achieve and maintain emotional well-being and the skills to cope without excessive stress or reliance on alcohol or other drugs.',
   130, 'AIRS-MHA', true),

  (v_site_id,
   'Other Governmental/Economic Services', 'other-governmental-economic',
   'Programs that reflect broader functions of governmental, economic and organizational development, including international programs, trade associations and academic research.',
   140, 'AIRS-GOV', true),

  (v_site_id,
   'Transportation', 'transportation',
   'Programs that provide for basic transportation needs including conveyance of people and goods, and special arrangements for older adults, people with disabilities and those unable to use public transportation.',
   150, 'AIRS-TRN', true),

  (v_site_id,
   'Utilities', 'utilities',
   'Programs that provide electric, gas, water, phone and other utility bill assistance.',
   160, 'AIRS-UTL', true),

  (v_site_id,
   'Volunteer and Donation', 'volunteer-donation',
   'Community organizations seeking individuals willing to offer services without remuneration on projects that benefit the organization. Includes programs accepting donated goods.',
   170, 'AIRS-VOL', true)

ON CONFLICT (site_id, slug) DO NOTHING;

-- Capture new category IDs
SELECT id INTO cat_arts           FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'arts-culture-recreation';
SELECT id INTO cat_clothing       FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'clothing-personal-household';
SELECT id INTO cat_disaster       FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'disaster-services';
SELECT id INTO cat_education      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'education';
SELECT id INTO cat_employment     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'employment';
SELECT id INTO cat_food           FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'food-meals';
SELECT id INTO cat_healthcare     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'health-care';
SELECT id INTO cat_housing        FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'housing';
SELECT id INTO cat_income         FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'income-support-assistance';
SELECT id INTO cat_ind_family     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'individual-family-community-support';
SELECT id INTO cat_information    FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'information-services';
SELECT id INTO cat_legal          FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'legal-consumer-public-safety';
SELECT id INTO cat_mental_health  FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'mental-health-addictions';
SELECT id INTO cat_government     FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'other-governmental-economic';
SELECT id INTO cat_transportation FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'transportation';
SELECT id INTO cat_utilities      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'utilities';
SELECT id INTO cat_volunteer      FROM linksy_need_categories WHERE site_id = v_site_id AND slug = 'volunteer-donation';

-- ============================================================================
-- STEP 2: REMAP ALL NEEDS TO AIRS CATEGORIES
-- ============================================================================

UPDATE linksy_needs SET category_id = cat_mental_health
WHERE site_id = v_site_id AND slug IN (
  'anger-management','autism','bullying','counseling-one-on-one',
  'eating-disorders','group-counseling','mental-health',
  'residential-facilities','sexual-reactive-children-that-hurt-other-children',
  'substance-abuse',
  'baker-act-all-ages','crisis-help','mental-health-support','substance-abuse-help',
  'addiction-support','grief-support','support-groups'
);

UPDATE linksy_needs SET category_id = cat_clothing
WHERE site_id = v_site_id AND slug IN (
  'clothing-assistance','free-haircuts','furniture-assistance',
  'household-items','hygiene-products','laundry-facility','school-supplies'
);

UPDATE linksy_needs SET category_id = cat_food
WHERE site_id = v_site_id AND slug IN (
  'food-assistance','food-pantry','meal-services'
);

UPDATE linksy_needs SET category_id = cat_housing
WHERE site_id = v_site_id AND slug IN (
  'affordable-housing','emergency-shelter','home-repairs',
  'homelessness-support','mortgage-assistance','rental-assistance','transitional-housing'
);

UPDATE linksy_needs SET category_id = cat_healthcare
WHERE site_id = v_site_id AND slug IN (
  'adult-medical-care','dental-care','health-screenings','pediatric-medicine',
  'pregnancy-assistance','prescription-assistance','vision-care',
  'disability-support','handicap-services'
);

UPDATE linksy_needs SET category_id = cat_education
WHERE site_id = v_site_id AND slug IN (
  'adult-education-programs','ged-high-school-completion','life-skills',
  'literacy-programs','senior-technology-help','elder-technology-assistance'
);

UPDATE linksy_needs SET category_id = cat_employment
WHERE site_id = v_site_id AND slug IN (
  'job-training','vocational-training','workforce-development','employment-assistance'
);

UPDATE linksy_needs SET category_id = cat_transportation
WHERE site_id = v_site_id AND slug IN (
  'bus-passes-transit-vouchers','gas-and-fuel','public-transit-vouchers',
  'transportation-assistance','vehicle-repair-and-used-auto-sales','vehicle-repair-support'
);

UPDATE linksy_needs SET category_id = cat_income
WHERE site_id = v_site_id AND slug IN (
  'financial-counseling','tax-preparation-assistance'
);

UPDATE linksy_needs SET category_id = cat_utilities
WHERE site_id = v_site_id AND slug = 'utility-assistance';

UPDATE linksy_needs SET category_id = cat_legal
WHERE site_id = v_site_id AND slug IN (
  'legal-aid','immigration-services','inmate-support'
);

UPDATE linksy_needs SET category_id = cat_ind_family
WHERE site_id = v_site_id AND slug IN (
  'adoption-support','childcare-assistance','family-counseling',
  'foster-care-support','parenting-resources','youth-programs',
  'animal-rescue',
  'veterans-help',
  'cancer-support','respite-care','special-needs','toys',
  'advocacy-and-case-management','companionship-visits','domestic-violence-support',
  'human-trafficking-support'
);

UPDATE linksy_needs SET category_id = cat_disaster
WHERE site_id = v_site_id AND slug = 'disaster-relief';

UPDATE linksy_needs SET category_id = cat_volunteer
WHERE site_id = v_site_id AND slug = 'volunteer-or-mentoring';

-- ============================================================================
-- STEP 3: MERGE DUPLICATE NEEDS
-- ============================================================================

-- MERGE: "Mental Health" → "Mental Health Support" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health-support')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health-support')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  COALESCE((SELECT synonyms FROM linksy_needs WHERE site_id = v_site_id AND slug = 'mental-health'), ARRAY[]::text[]))
WHERE site_id = v_site_id AND slug = 'mental-health-support';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'mental-health';

-- MERGE: "Substance Abuse" (child) → "Substance Abuse Help" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse-help')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse-help')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  COALESCE((SELECT synonyms FROM linksy_needs WHERE site_id = v_site_id AND slug = 'substance-abuse'), ARRAY[]::text[]))
WHERE site_id = v_site_id AND slug = 'substance-abuse-help';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'substance-abuse';

-- MERGE: "Elder Technology Assistance" → "Senior Technology Help" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'senior-technology-help')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'elder-technology-assistance')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'senior-technology-help')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'elder-technology-assistance';

-- MERGE: "Handicap Services" → "Disability Support" (surviving)
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'disability-support')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'handicap-services')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'disability-support')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs
SET synonyms = array_cat(COALESCE(synonyms, ARRAY[]::text[]),
  ARRAY['handicap','handicapped','handicap services','handicap support'])
WHERE site_id = v_site_id AND slug = 'disability-support';
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'handicap-services';

-- MERGE: "Bus Passes/Transit Vouchers" → "Public Transit Vouchers" (renamed to "Public Transit Assistance")
UPDATE linksy_provider_needs
SET need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'public-transit-vouchers')
WHERE need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'bus-passes-transit-vouchers')
  AND NOT EXISTS (
    SELECT 1 FROM linksy_provider_needs e
    WHERE e.need_id = (SELECT id FROM linksy_needs WHERE site_id = v_site_id AND slug = 'public-transit-vouchers')
      AND e.provider_id = linksy_provider_needs.provider_id
  );
UPDATE linksy_needs SET is_active = false WHERE site_id = v_site_id AND slug = 'bus-passes-transit-vouchers';
UPDATE linksy_needs
SET name = 'Public Transit Assistance',
    slug = 'public-transit-assistance',
    synonyms = ARRAY['bus pass','bus passes','transit vouchers','ride','bus tickets','transportation voucher','bus ride','transit help']
WHERE site_id = v_site_id AND slug = 'public-transit-vouchers';

-- ============================================================================
-- STEP 4: DEACTIVATE OLD CUSTOM CATEGORIES
-- ============================================================================

UPDATE linksy_need_categories SET is_active = false
WHERE site_id = v_site_id AND slug IN (
  'child-adolescent-mental-health',
  'food-and-daily-needs',
  'human-trafficking',
  'special-situations',
  'pets-and-animals',
  'legal-help',
  'learning-and-education',
  'mind-and-wellness',
  'money-help',
  'home-and-shelter',
  'disability-services',
  'veterans-services',
  'vehicle-assistance',
  'healthcare',
  'transportation-legacy',
  'family-child-services',
  'employment-financial-stability',
  'community-support'
);

END $$;
;
