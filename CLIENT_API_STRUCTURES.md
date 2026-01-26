# Client API Path Structures

This document details the full API path structures for MSN and Fixico client endpoints.

---

## MSN (Milieu Service Nederland)

**Endpoint:** `POST https://rac-retrieval.vercel.app/api/rac/msn`

### ORG (MSN-Specific Overrides)

```
ORG/
├── ORG_01_FOUNDATION
│   ├── meta
│   │   ├── owner, version, last_updated
│   │   ├── purpose
│   │   ├── notes
│   │   └── tags
│   ├── org_basics
│   │   ├── trading_name ("Milieu Service Nederland")
│   │   ├── website ("www.milieuservicenederland.nl")
│   │   ├── legal_details
│   │   │   ├── legal_name ("Milieu Service Groep")
│   │   │   └── kvk_number
│   │   └── additional_brands[]
│   │       ├── Bedrijfsafval.nl
│   │       ├── TH Containers
│   │       ├── Paridon Containers
│   │       ├── MSG Online
│   │       ├── Praxis-kluscontainer.nl
│   │       └── Puincontainershop.nl
│   ├── operating_context
│   ├── market_context
│   └── competitor_registry
│
├── ORG_02_BRAND_POSITIONING
│   ├── meta
│   ├── offers_catalog
│   │   ├── offers[]
│   │   │   ├── Afvalinzameling (Waste Collection)
│   │   │   ├── Inzamelmiddelen (Collection Equipment)
│   │   │   ├── Duurzame verwerking (Sustainable Processing)
│   │   │   ├── Circulair advies (Circular Advice)
│   │   │   ├── Gedragsverandering en activatie
│   │   │   └── MijnMSN Platform
│   │   └── service_tiers
│   │       ├── Basis
│   │       ├── Plus
│   │       └── Premium
│   ├── differentiators
│   ├── proof_points
│   └── pricing
│
├── ORG_03_AUDIENCE_MESSAGING
│   ├── meta
│   ├── audiences
│   │   ├── icps[]
│   │   │   ├── MKB (Small-Medium Business)
│   │   │   │   └── characteristics[]
│   │   │   ├── Grootzakelijk (Enterprise)
│   │   │   │   └── characteristics[]
│   │   │   ├── Facilitair (Facilities Management)
│   │   │   │   └── characteristics[]
│   │   │   └── Vastgoed (Real Estate/Property Management)
│   │   │       └── characteristics[]
│   │   └── personas[]
│   │       ├── De Ondernemer (MKB)
│   │       │   ├── role
│   │       │   ├── pain_points[]
│   │       │   ├── goals[]
│   │       │   └── objections[]
│   │       └── De Facility Manager (Grootzakelijk/Facilitair)
│   │           ├── role
│   │           ├── pain_points[]
│   │           ├── goals[]
│   │           └── objections[]
│   ├── messaging
│   │   ├── key_messages[]
│   │   ├── example_perfect_fit[]
│   │   └── example_never_use[]
│   ├── constraints
│   │   └── never_say
│   │       ├── client_specific_terminology
│   │       │   ├── abbreviations_never_use[]
│   │       │   │   ├── MSN → "Milieu Service Nederland (voluit)"
│   │       │   │   └── MSG → "Milieu Service Groep (voluit)"
│   │       │   ├── role_descriptions_avoid[]
│   │       │   │   ├── inzamelaar
│   │       │   │   └── afvalverwerker
│   │       │   ├── generic_terms_prefer_specific[]
│   │       │   │   ├── afvalbeheer → afvalmanagement
│   │       │   │   ├── hoogwaardige recycling (needs proof)
│   │       │   │   └── bak, afvalbak → rolcontainer, perscontainer
│   │       │   ├── product_naming_conventions[]
│   │       │   │   ├── MAC (Multi Afval Container)
│   │       │   │   └── Miniperscontainer
│   │       │   └── waste_stream_naming[]
│   │       │       ├── GFE/GFT → Groente- fruit- en etensresten
│   │       │       └── Papier en karton
│   │       └── client_specific_claims
│   │           ├── guarantee_words_avoid[]
│   │           ├── sustainability_claims_require_evidence[]
│   │           │   ├── volledig circulair
│   │           │   ├── zero waste gegarandeerd
│   │           │   ├── CO2-neutraal
│   │           │   ├── duurzaam (zonder specificatie)
│   │           │   ├── groen (zonder specificatie)
│   │           │   └── milieuvriendelijk (zonder specificatie)
│   │           ├── zero_waste_definition
│   │           ├── numbers_require_source
│   │           ├── comparative_claims
│   │           ├── processing_routes
│   │           └── service_promises
│   ├── tone_constraints
│   │   └── overrides
│   │       ├── profile ("MSN 4-pijler model")
│   │       ├── pillars[]
│   │       │   ├── Overtuigend (Convincing)
│   │       │   ├── Ondernemend (Entrepreneurial)
│   │       │   ├── Ondersteunend (Supportive)
│   │       │   └── Oplossingsgericht (Solution-focused)
│   │       ├── formality
│   │       │   ├── value ("professional_je_vorm")
│   │       │   └── description
│   │       ├── writing_style
│   │       │   ├── value ("actief_concreet_direct")
│   │       │   └── description
│   │       ├── accessibility
│   │       │   ├── value ("toegankelijk")
│   │       │   └── description
│   │       └── examples_do[]
│   │           ├── Formality balance
│   │           ├── Personal yet professional
│   │           ├── Between light and serious
│   │           ├── Accessible
│   │           └── Convincing
│   └── competitive_language
│       ├── policy ("never_name_competitors")
│       ├── rule
│       ├── allowed
│       └── allowed_comparisons
│
├── ORG_04_CHANNEL_PLAYBOOKS
│   ├── meta
│   ├── active_channels
│   ├── priority_formats
│   └── channel_playbooks
│
├── ORG_06_VISUAL_SYSTEM
│   ├── meta
│   ├── brand_colors
│   │   ├── primary
│   │   │   ├── name ("MSN Groen")
│   │   │   ├── hex ("#009d3d")
│   │   │   └── usage
│   │   ├── secondary[]
│   │   │   ├── Licht Groen ("#cbedd8")
│   │   │   └── MSN Blauw ("#0073b7")
│   │   ├── neutrals[]
│   │   │   ├── Donker Grijs ("#58595b")
│   │   │   ├── Licht Grijs ("#d9d9d6")
│   │   │   └── Wit ("#ffffff")
│   │   └── accent
│   │       ├── name ("Oranje - Recruitment Orange")
│   │       ├── hex ("#ff6600")
│   │       └── context ("recruitment only")
│   ├── typography
│   │   ├── primary_font
│   │   │   ├── family ("Ubuntu")
│   │   │   ├── variants[] (Bold, Regular)
│   │   │   └── fallback ("Arial, sans-serif")
│   │   └── notes[]
│   ├── logo_system
│   │   ├── standard_logo
│   │   ├── variations
│   │   └── usage_rules
│   ├── slogan_system
│   ├── imagery
│   ├── illustration
│   ├── icon_system
│   ├── waste_stream_colors
│   ├── print_standards
│   ├── container_stickers
│   └── governance
│
└── ORG_07_MARKETING_COMPLIANCE
    ├── meta
    ├── ai_policy
    ├── prohibited_use_cases
    ├── data_handling
    ├── approval_requirements
    ├── human_control
    ├── output_verification
    ├── transparency
    ├── incident_response
    ├── compliance_frameworks
    ├── training_awareness
    ├── enforcement
    └── governance
```

### Shared Layers (Fallback - Same as Generic)

```
LOGIC/     → LOGIC_00 through LOGIC_18
OPS/       → OPS_00 through OPS_19
ROLE/      → ROLE_00 through ROLE_11
USE_CASE/  → USE_CASE_00 through USE_CASE_11
WORKFLOW/  → WORKFLOW_00 through WORKFLOW_01
CONFIG/    → CONFIG_00_INSTANCE
PACK/      → PACK_01, PACK_02
CLIENT/    → (no MSN-specific CLIENT file)
LIBRARY/   → (no MSN-specific LIBRARY files)
```

---

## Fixico

**Endpoint:** `POST https://rac-retrieval.vercel.app/api/rac/fixico`

### ORG (Fixico-Specific Overrides)

```
ORG/
├── ORG_01_FOUNDATION
│   ├── meta
│   │   ├── owner, version, last_updated
│   │   ├── purpose
│   │   ├── org_id ("FIXICO")
│   │   └── tags
│   ├── org_basics
│   │   ├── trading_name ("Fixico")
│   │   ├── website ("https://fixico.com")
│   │   └── legal_details
│   │       ├── legal_name ("Fixico International B.V.")
│   │       ├── kvk_number
│   │       ├── headquarters ("Weteringschans 85E, 1017 RZ Amsterdam")
│   │       ├── contact_email
│   │       ├── contact_phone
│   │       └── founded_year (2014)
│   ├── operating_context
│   │   ├── timezone ("Europe/Amsterdam")
│   │   └── languages[]
│   │       ├── en-GB (British English) - primary
│   │       ├── nl (Nederlands) - primary
│   │       ├── de (Deutsch)
│   │       ├── nl-BE (Nederlands België)
│   │       ├── fr (Français)
│   │       ├── es (Español)
│   │       ├── it (Italiano)
│   │       └── da (Dansk)
│   ├── market_context
│   │   ├── markets[]
│   │   │   ├── NL (Netherlands) - primary
│   │   │   ├── DE (Germany) - primary
│   │   │   ├── UK (United Kingdom) - primary
│   │   │   ├── BE (Belgium)
│   │   │   ├── FR (France)
│   │   │   ├── ES (Spain)
│   │   │   ├── IT (Italy)
│   │   │   └── DK (Denmark)
│   │   └── target_segments[]
│   └── competitor_registry
│
├── ORG_02_BRAND_POSITIONING
│   ├── meta
│   ├── brand_statements
│   │   ├── vision ("Envision a future where car repair is a seamless...")
│   │   ├── mission ("We are a tech company with a mission to shape...")
│   │   ├── brand_promise ("Fixico makes accident repair and RMT...")
│   │   ├── tagline ("Car repair, digitalised.")
│   │   └── brand_memorandum
│   ├── offers_catalog
│   │   └── offers[]
│   │       ├── Accident Repair Management
│   │       │   ├── description
│   │       │   ├── key_benefit
│   │       │   └── services_included[] (Body repair, Glass repair)
│   │       ├── RMT Management (Repair, Maintenance & Tyres)
│   │       │   ├── description
│   │       │   ├── key_benefit
│   │       │   └── services_included[]
│   │       ├── Intelligent Repairer Network Access
│   │       │   ├── description (4,000+ repairers, 10 countries)
│   │       │   └── key_benefit
│   │       └── White Label Platform
│   │           ├── description
│   │           └── key_benefit
│   ├── value_proposition
│   │   ├── primary_message
│   │   └── benefit_pillars[]
│   ├── platform_capabilities
│   │   ├── core_features[]
│   │   └── integrations[]
│   ├── differentiators
│   │   ├── unique_positioning[]
│   │   └── competitive_advantages[]
│   ├── proof_points
│   │   ├── statistics[]
│   │   └── customer_references[]
│   └── pricing
│
├── ORG_03_AUDIENCE_MESSAGING
│   ├── meta
│   ├── audiences
│   │   └── icps[]
│   │       ├── Rental Companies
│   │       │   ├── description
│   │       │   ├── company_characteristics[]
│   │       │   └── pain_points[]
│   │       ├── Service/Last Mile Delivery Fleets
│   │       │   ├── description
│   │       │   ├── company_characteristics[]
│   │       │   └── pain_points[]
│   │       ├── Fleet Intermediaries
│   │       │   ├── description
│   │       │   ├── company_characteristics[]
│   │       │   └── pain_points[]
│   │       ├── Insurance Companies
│   │       │   ├── description
│   │       │   ├── company_characteristics[]
│   │       │   └── pain_points[]
│   │       ├── Leasing Companies
│   │       │   ├── description
│   │       │   └── company_characteristics[]
│   │       └── Corporate Fleets
│   │           ├── description
│   │           └── company_characteristics[]
│   ├── brand_voice
│   │   ├── tone_profile
│   │   ├── personality_traits[]
│   │   └── writing_guidelines
│   ├── grammar_rules
│   │   ├── language_preference ("British English")
│   │   └── specific_rules[]
│   ├── messaging
│   │   ├── key_messages[]
│   │   └── value_statements[]
│   ├── messaging_challenges
│   │   ├── perception_challenges[]
│   │   └── response_strategies[]
│   ├── localization
│   │   ├── market_specific_adaptations
│   │   └── cultural_considerations
│   ├── constraints
│   │   └── terminology_rules
│   └── competitive_language
│       ├── policy
│       └── guidelines
│
├── ORG_04_CHANNEL_PLAYBOOKS
│   ├── meta
│   ├── active_channels
│   │   ├── primary[]
│   │   │   ├── LinkedIn
│   │   │   └── Website (fixico.com)
│   │   ├── secondary[]
│   │   │   └── Instagram (in development)
│   │   └── internal_between_employees[]
│   │       ├── Slack
│   │       └── Gmail
│   ├── channels
│   │   ├── linkedin
│   │   │   ├── description
│   │   │   ├── kpis
│   │   │   │   ├── engagement (avg_impressions, unique_impressions_target, reactions_target)
│   │   │   │   └── follower_growth
│   │   │   ├── productivity_targets
│   │   │   │   ├── current_output
│   │   │   │   ├── ai_enhanced_target
│   │   │   │   ├── efficiency_gain
│   │   │   │   └── presentation_creation
│   │   │   ├── content_strategy
│   │   │   │   ├── awareness_focus
│   │   │   │   └── ceo_channel
│   │   │   └── content_quality
│   │   │       ├── review_process[]
│   │   │       └── brand_consistency
│   │   ├── website
│   │   │   ├── primary_site
│   │   │   ├── legacy_site
│   │   │   ├── language_preference
│   │   │   └── kpis
│   │   ├── instagram
│   │   │   ├── status ("TBD")
│   │   │   └── notes
│   │   └── internal
│   │       ├── manual_handoff
│   │       ├── slack
│   │       ├── gmail
│   │       └── internal_branding
│   ├── content_goals
│   │   ├── productivity_goal
│   │   ├── quality_goal
│   │   ├── mindset_goal
│   │   └── localization_readiness
│   ├── multilanguage
│   │   ├── market_specific_glossaries[]
│   │   │   ├── NL, DE, UK, BE, FR, ES, IT, DK
│   │   └── localization_approach
│   ├── core_deliverables
│   │   ├── social_content[]
│   │   └── presentations
│   │       ├── types[]
│   │       └── tools[]
│   ├── monitoring
│   │   ├── industry_newsletter
│   │   └── trend_watching
│   └── constraints
│       ├── platform_accuracy
│       └── brand_consistency
│
└── ORG_05_DELIVERABLE_TEMPLATES
    ├── meta
    ├── writing_style
    │   ├── tone
    │   ├── voice
    │   └── guidelines[]
    ├── grammar_guidelines
    │   ├── language ("British English")
    │   └── specific_rules[]
    ├── terminology
    │   ├── preferred_terms[]
    │   └── avoid_terms[]
    ├── deliverable_types
    │   ├── linkedin_posts
    │   ├── presentations
    │   ├── case_studies
    │   └── internal_comms
    ├── localization
    │   ├── supported_languages[]
    │   └── adaptation_guidelines
    ├── visual_assets
    │   ├── image_guidelines
    │   └── brand_elements
    └── quality_standards
        ├── review_checklist[]
        └── approval_process
```

### Shared Layers (Fallback - Same as Generic)

```
LOGIC/     → LOGIC_00 through LOGIC_18
OPS/       → OPS_00 through OPS_19
ROLE/      → ROLE_00 through ROLE_11
USE_CASE/  → USE_CASE_00 through USE_CASE_11
WORKFLOW/  → WORKFLOW_00 through WORKFLOW_01
CONFIG/    → CONFIG_00_INSTANCE
PACK/      → PACK_01, PACK_02
CLIENT/    → (no Fixico-specific CLIENT file)
LIBRARY/   → (no Fixico-specific LIBRARY files)
```

---

## Example API Calls

### MSN Examples

```bash
# Get MSN foundation data
curl -X POST "https://rac-retrieval.vercel.app/api/rac/msn" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/FOUNDATION"}'

# Get MSN tone constraints
curl -X POST "https://rac-retrieval.vercel.app/api/rac/msn" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/AUDIENCE_MESSAGING/tone_constraints"}'

# Get MSN visual system colors
curl -X POST "https://rac-retrieval.vercel.app/api/rac/msn" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/VISUAL_SYSTEM/brand_colors"}'

# Get shared LOGIC (same for all clients)
curl -X POST "https://rac-retrieval.vercel.app/api/rac/msn" \
  -H "Content-Type: application/json" \
  -d '{"path": "LOGIC/QUALITY_GATES"}'
```

### Fixico Examples

```bash
# Get Fixico brand positioning
curl -X POST "https://rac-retrieval.vercel.app/api/rac/fixico" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/BRAND_POSITIONING"}'

# Get Fixico audience ICPs
curl -X POST "https://rac-retrieval.vercel.app/api/rac/fixico" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/AUDIENCE_MESSAGING/audiences"}'

# Get Fixico LinkedIn playbook
curl -X POST "https://rac-retrieval.vercel.app/api/rac/fixico" \
  -H "Content-Type: application/json" \
  -d '{"path": "ORG/CHANNEL_PLAYBOOKS/channels/linkedin"}'

# Get shared ROLE (same for all clients)
curl -X POST "https://rac-retrieval.vercel.app/api/rac/fixico" \
  -H "Content-Type: application/json" \
  -d '{"path": "ROLE/ORCHESTRATOR"}'
```
