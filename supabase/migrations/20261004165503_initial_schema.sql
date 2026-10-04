-- Countries table
create table countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  flag_emoji text,
  created_at timestamptz default now()
);

-- Visa types table
create table visa_types (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references countries(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  processing_time_days integer,
  fee_usd integer,
  max_stay_days integer,
  official_url text,
  last_verified_at timestamptz,
  created_at timestamptz default now(),
  unique(country_id, slug)
);

-- Requirements table
create table requirements (
  id uuid primary key default gen_random_uuid(),
  visa_type_id uuid not null references visa_types(id) on delete cascade,
  applicant_nationality_code text, -- null = applies to all nationalities
  category text not null,          -- 'Identity', 'Financial', 'Travel', 'Supporting'
  document_name text not null,
  description text,
  is_mandatory boolean not null default true,
  notes text,
  source_url text,
  created_at timestamptz default now()
);

-- Index for fast requirement lookups by visa type + nationality
create index requirements_lookup_idx
  on requirements(visa_type_id, applicant_nationality_code);

-- Seed: Japan
insert into countries (name, code, flag_emoji) values
  ('Japan', 'JP', '🇯🇵');

-- Seed: Japan tourist visa type
insert into visa_types (country_id, name, slug, description, processing_time_days, fee_usd, max_stay_days, official_url, last_verified_at)
select
  id,
  'Tourist (Short-stay)',
  'tourist',
  'For leisure travel, sightseeing, and visiting friends or family in Japan.',
  5,
  0,
  90,
  'https://www.mofa.go.jp/j_info/visit/visa/index.html',
  '2025-09-01'
from countries where code = 'JP';

-- Seed: Japan tourist visa requirements (Indian nationals)
insert into requirements (visa_type_id, applicant_nationality_code, category, document_name, description, is_mandatory, notes, source_url)
select
  vt.id,
  'IN',
  req.category,
  req.document_name,
  req.description,
  req.is_mandatory,
  req.notes,
  'https://www.in.emb-japan.go.jp/itpr_en/visa_tanki.html'
from visa_types vt
join countries c on c.id = vt.country_id
cross join (values
  ('Identity',   'Valid Passport',               'Original passport valid for at least 6 months beyond intended stay. Must have at least 2 blank pages.',          true,  null),
  ('Identity',   'Passport Copy',                'Photocopy of the bio-data page of your current passport and all previous passports.',                            true,  null),
  ('Identity',   'Visa Application Form',        'Completed and signed application form. Available from the Japanese Embassy website.',                            true,  null),
  ('Identity',   'Recent Photograph',            '2x2 inch photo taken within the last 6 months, white background, no glasses.',                                  true,  'Must meet Japanese embassy photo specifications'),
  ('Travel',     'Flight Itinerary',             'Confirmed return or onward flight bookings showing entry and exit dates.',                                        true,  null),
  ('Travel',     'Hotel Bookings',               'Confirmed hotel reservations or accommodation details for the entire stay in Japan.',                            true,  null),
  ('Travel',     'Travel Itinerary',             'Day-by-day travel plan covering your full stay in Japan.',                                                       true,  null),
  ('Financial',  'Bank Statements (3 months)',   'Original bank statements from the last 3 months showing sufficient funds.',                                      true,  'Should demonstrate a minimum balance equivalent to ¥200,000 or more'),
  ('Financial',  'Income Tax Returns',           'Latest ITR acknowledgement as proof of income and financial standing.',                                          true,  null),
  ('Financial',  'Leave Certificate / NOC',      'Letter from employer granting leave of absence and confirming your employment status.',                          true,  'Required for salaried employees'),
  ('Supporting', 'Cover Letter',                 'Personal letter explaining the purpose of your visit, travel plans, and your intention to return to India.',     true,  null),
  ('Supporting', 'Travel Insurance',             'Travel insurance policy covering the full duration of stay with a minimum coverage of USD 30,000.',              false, 'Recommended but not always mandatory')
) as req(category, document_name, description, is_mandatory, notes)
where c.code = 'JP' and vt.slug = 'tourist';
