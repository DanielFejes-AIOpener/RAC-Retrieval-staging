# RAC Context Engine — Architecture Spec

> **Status**: Draft v0.4  
> **Author**: AI Assistant  
> **Date**: 2026-01-21  
> **Review**: Updated based on test output analysis

---

## Changelog

### v0.4 (2026-01-21)
- Added `include_client` parameter to reduce token bloat on repeat calls
- Strip `meta` sections from all responses (noise for agents)
- $ref resolution must be fully recursive (no `[UNRESOLVED]` in output)
- Updated examples to show first-call vs follow-up-call patterns

### v0.3
- Initial decisions locked

---

## 1. Design Principles

| Principle | Rationale |
|-----------|-----------|
| **1 function call per query** | Minimize latency; heavy lifting server-side |
| **Path-based access** | Models understand folder structures |
| **All resolution server-side** | Agent never sees `$ref:` or `extends:` — fully resolved |
| **Strip meta from responses** | `meta` section is noise for agents; saves tokens |
| **Optional CLIENT inclusion** | `include_client` param to avoid bloat on repeat calls |
| **No tags filtering (v1)** | Keep it simple; tags deferred to v2 |
| **Stateless** | Each request is self-contained |
| **Vercel + Edge Config** | Fast edge delivery |
| **CLIENT as separate object** | No merge logic; transparent to agent |

<!-- COMMENT: -->

---

## 2. Two Functions Only

```
┌─────────────────────────────────────────────────────────────────┐
│                        AGENT (OpenAI)                           │
│                                                                 │
│  Function calls:                                                │
│    • rac_context(path, client_id)                              │
│    • rac_file(file_id, section?)                               │
│                                                                 │
│  That's it. Two functions.                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RAC CONTEXT API                             │
│                  (Vercel Serverless + Edge Config)              │
│                                                                 │
│  Endpoints:                                                     │
│    GET /context/{path}  → Assembled + resolved + CLIENT         │
│    GET /file/{file_id}  → Raw file content                      │
│                                                                 │
│  Server-side services:                                          │
│    • $ref resolver      (inline before return)                  │
│    • extends merger     (apply inheritance)                     │
│    • CLIENT loader      (return as separate object)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE                                    │
│                                                                 │
│  YAML files in repo                                             │
│  Indexed by: file_id (clean, no UUIDs)                          │
└─────────────────────────────────────────────────────────────────┘
```

<!-- COMMENT: -->

---

## 3. Path Structure

```
{LAYER}/{FILE_ID}[/{SECTION}]
```

### Examples

| Path | Returns |
|------|---------|
| `USE_CASE/COPYWRITER` | Full assembled USE_CASE + CLIENT object |
| `USE_CASE/COPYWRITER/prohibitions` | Just prohibitions section + CLIENT |
| `USE_CASE/COPYWRITER/critical_functions` | Just critical_functions + CLIENT |
| `ROLE/COPYWRITER` | Full ROLE file (no CLIENT needed) |
| `ROLE/COPYWRITER/capabilities` | Just capabilities array |
| `CLIENT/AI_OPENER` | Full CLIENT file |
| `CLIENT/AI_OPENER/voice` | Just voice settings |
| `CLIENT/AI_OPENER/evidence_vault` | Just evidence items |
| `OPS/COPYWRITING_PLAYBOOK` | Full OPS file |
| `OPS/COPYWRITING_PLAYBOOK/cta_patterns` | Specific section |
| `WORKFLOW/TRENDWATCHER_MORNING` | Full workflow |
| `WORKFLOW/TRENDWATCHER_MORNING/phases/phase_2` | Specific phase |
| `CONFIG` | Active configuration |
| `CONFIG/agents` | Agent name mappings only |
| `LOGIC/QUALITY_GATES` | Core quality gates |
| `LOGIC/QUALITY_GATES/universal_gates` | Just universal gates |

<!-- COMMENT: -->

---

## 4. Function Definitions

### 4.1 `rac_context` — Primary function

```yaml
name: rac_context
description: |
  Get assembled context from the RAC knowledge base. 
  Path follows folder structure: LAYER/FILE_ID/SECTION.
  All $ref pointers and inheritance are resolved server-side.
  Meta sections are stripped from responses.
  CLIENT data is returned as a separate object (not merged).
  
parameters:
  type: object
  properties:
    path:
      type: string
      description: |
        Path to context. Examples:
        - USE_CASE/COPYWRITER (full use case)
        - USE_CASE/COPYWRITER/prohibitions (specific section)
        - ROLE/STRATEGIST/capabilities
        - CLIENT/AI_OPENER/voice
        - OPS/BRIEF_TEMPLATES
        - CONFIG/agents
      
    client_id:
      type: string
      description: |
        Required. Client ID for client-specific data.
        
    include_client:
      type: boolean
      description: |
        Whether to include full CLIENT object in response.
        Default: true for first call, set to false on subsequent 
        calls to avoid token bloat when you already have client context.
        
  required: [path, client_id]
```

<!-- COMMENT: -->

---

### 4.2 `rac_file` — Raw file access

```yaml
name: rac_file
description: |
  Get raw file content without assembly or resolution.
  Use when you need the exact file structure, including $ref pointers.
  
parameters:
  type: object
  properties:
    file_id:
      type: string
      description: |
        File identifier. Examples:
        - LOGIC_08_QUALITY_GATES
        - OPS_03_COPYWRITING_PLAYBOOK
        - USE_CASE_04_COPYWRITER
        - CLIENT_01_AI_OPENER
        
    section:
      type: string
      description: |
        Optional. Dot-notation path to specific section.
        Example: "critical_functions.write_content"
        
  required: [file_id]
```

<!-- COMMENT: -->

---

## 5. Response Format

### 5.1 Successful Response (with CLIENT)

When requesting USE_CASE, OPS, WORKFLOW, etc. with `include_client: true` (default):

```json
{
  "path": "USE_CASE/COPYWRITER",
  "resolved": true,
  "content": {
    "id": "USE_CASE_04_COPYWRITER",
    "name": "Copywriter",
    "mission": "Create compelling, on-brand content for any format or channel",
    "prohibitions": {
      "strict_rules": ["..."],
      "allowed_activities": ["..."]
    },
    "capabilities": {
      "primary": ["..."],
      "excluded": ["..."]
    },
    "critical_functions": { "..." },
    "persona": { "..." },
    "runtime_ux": { "..." },
    "intake_patterns": { "..." },
    "output_patterns": { "..." },
    "quality_gates": { "..." }
  },
  "client": {
    "id": "AI_OPENER",
    "client_identity": {
      "name": "AI Opener B.V.",
      "display_name": "AI Opener",
      "brand": { "..." }
    },
    "voice": {
      "profile": "thought_leader",
      "overrides": {
        "tone": "confident, direct, pragmatic",
        "terminology_preferences": { "..." }
      }
    },
    "preferences": { "..." },
    "evidence_vault": {
      "items": ["..."]
    },
    "ai_policy": {
      "overrides": {
        "blocked_topics": ["..."],
        "confidential_keywords": ["..."],
        "require_human_review": { "..." }
      }
    },
    "quality_extensions": {
      "additional_entry_gates": ["..."],
      "additional_exit_gates": ["..."]
    }
  }
}
```

**Notes**:
- `meta` sections are **stripped** from both content and client (saves ~50 tokens per response)
- `content` and `client` are separate objects — no merging
- All `$ref:` pointers are **fully resolved** before return

### 5.1b Response WITHOUT CLIENT (subsequent calls)

When `include_client: false`:

```json
{
  "path": "OPS/CAMPAIGN_STRUCTURES",
  "resolved": true,
  "content": {
    "campaign_archetypes": { "..." },
    "hero_hub_help": { "..." },
    "multi_channel_flighting": { "..." }
  }
}
```

Use this on follow-up queries when you already have the client context from a previous call.

<!-- COMMENT: -->

---

### 5.2 Section Request Response

When requesting a specific section (e.g., `USE_CASE/COPYWRITER/prohibitions`):

```json
{
  "path": "USE_CASE/COPYWRITER/prohibitions",
  "resolved": true,
  "content": {
    "description": "Hard boundaries — activities this agent must NEVER perform",
    "strict_rules": [
      "NEVER define strategy, positioning, segmentation, or KPI frameworks — that belongs to ROLE_02_STRATEGIST",
      "NEVER develop creative concept routes or moodboards — that belongs to ROLE_03_CREATIVE",
      "..."
    ],
    "enforcement": ["..."],
    "allowed_activities": ["..."]
  },
  "client": {
    "id": "AI_OPENER",
    "voice": { "..." },
    "ai_policy": { "..." }
  }
}
```

<!-- COMMENT: -->

---

### 5.3 Response Without CLIENT (ROLE, LOGIC, CONFIG)

For paths that don't need client context:

```json
{
  "path": "ROLE/COPYWRITER/capabilities",
  "resolved": true,
  "content": {
    "primary": [
      "copywriting across formats (ads, web, email, social, microcopy)",
      "brand voice and tone calibration",
      "meaningful variant creation with hypotheses",
      "localization/adaptation (NL/DE) with cultural/register accuracy",
      "copy QA: clarity, accessibility, and claim integrity"
    ],
    "secondary": [
      "copy guidelines and rationale documentation",
      "testing-informed iteration loops with analytics partners"
    ],
    "excluded": [
      "visual design production",
      "strategy ownership and KPI definition",
      "analytics implementation and instrumentation"
    ]
  }
}
```

<!-- COMMENT: -->

---

### 5.4 Error Response

```json
{
  "error": true,
  "code": "NOT_FOUND",
  "message": "Path not found: USE_CASE/INVALID",
  "suggestions": [
    "USE_CASE/COPYWRITER",
    "USE_CASE/STRATEGIST", 
    "USE_CASE/DESIGNER",
    "USE_CASE/ORCHESTRATOR"
  ]
}
```

```json
{
  "error": true,
  "code": "CLIENT_REQUIRED",
  "message": "client_id is required for this path",
  "available_clients": ["AI_OPENER"]
}
```

<!-- COMMENT: -->

---

## 6. Server-Side Resolution

When a request comes in, the server:

```
1. PARSE PATH
   └─ Extract: layer, file_id, section

2. VALIDATE CLIENT_ID
   └─ If missing and required → return CLIENT_REQUIRED error
   └─ If invalid → return error with suggestions

3. LOAD FILE
   └─ Find YAML file by file_id (clean ID, no UUID)
   └─ Parse to JSON

4. APPLY INHERITANCE (if extends: present)
   └─ Load base template
   └─ Deep merge (child wins)

5. RESOLVE $ref POINTERS
   └─ Find all "$ref: FILE#path" strings
   └─ Replace with actual content
   └─ Recursive (refs can contain refs)
   └─ MUST fully resolve — no "[UNRESOLVED]" in output

6. STRIP META
   └─ Remove 'meta' key from content
   └─ Remove 'meta' key from client (if included)

7. EXTRACT SECTION (if section in path)
   └─ Navigate to section
   └─ Return subset

8. LOAD CLIENT (if include_client: true)
   └─ Load CLIENT file
   └─ Strip meta
   └─ Return as separate object (NO MERGE)

9. RETURN JSON
   └─ { path, resolved, content, client? }
```

<!-- COMMENT: -->

---

## 7. File ID Mapping

**Decision**: Strip UUIDs, use clean IDs.

Current filename:
```
c3a6f291-d6d2-4b30-9981-24e8223cd1ec_CLIENT_01_DEMO_CLIENT.yaml
```

Clean file_id:
```
CLIENT_01_DEMO_CLIENT
```

### Implementation

Build an index at startup/deploy:

```typescript
// Generated index
const FILE_INDEX = {
  "CLIENT_01_DEMO_CLIENT": "c3a6f291-d6d2-4b30-9981-24e8223cd1ec_CLIENT_01_DEMO_CLIENT.yaml",
  "USE_CASE_04_COPYWRITER": "edfcd40d-0568-4de2-bc78-59924929dae4_USE_CASE_04_COPYWRITER.yaml",
  "LOGIC_08_QUALITY_GATES": "50f33a1d-9ba7-4fca-9d5c-e98368f9b30f_LOGIC_08_QUALITY_GATES.yaml",
  // ...
};
```

Or rename files to remove UUIDs (cleaner long-term).

<!-- COMMENT: -->

---

## 8. Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Runtime** | Vercel Serverless Functions | Simple deployment, auto-scaling |
| **Storage** | YAML files in repo | Version controlled, simple |
| **Cache** | Vercel Edge Config | Fast edge reads |
| **Language** | TypeScript | Type safety, Vercel native |
| **Auth** | API Key header | Simple for demo |

### Project Structure

```
/api
  /context
    /[...path].ts     → Handles /context/* routes
  /file
    /[file_id].ts     → Handles /file/* routes
    
/lib
  /loader.ts          → YAML loading + FILE_INDEX
  /resolver.ts        → $ref resolution
  /merger.ts          → extends inheritance
  /index.ts           → Build file index from /data
  
/data
  /CONFIG/...
  /CLIENT/...
  /LOGIC/...
  /OPS/...
  /ORG/...
  /PACK/...
  /ROLE/...
  /USE_CASE/...
  /WORKFLOW/...
```

<!-- COMMENT: -->

---

## 9. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/context/{...path}` | GET | Assembled context + CLIENT (optional) |
| `GET /api/file/{file_id}` | GET | Raw file content |

### Query Parameters

| Param | Endpoint | Required | Default | Description |
|-------|----------|----------|---------|-------------|
| `client_id` | /context | Yes* | — | Client ID for client data |
| `include_client` | /context | No | `true` | Include CLIENT in response |
| `section` | /file | No | — | Dot-path to section |

*Required for USE_CASE, WORKFLOW, OPS paths. Not required for ROLE, LOGIC, CONFIG.

### Headers

| Header | Description |
|--------|-------------|
| `X-API-Key` | Authentication |

<!-- COMMENT: -->

---

## 10. OpenAI Function Tool JSON

```json
{
  "type": "function",
  "function": {
    "name": "rac_context",
    "description": "Get assembled context from RAC knowledge base. Path follows folder structure: LAYER/FILE_ID/SECTION. All references resolved server-side. Meta sections stripped. CLIENT data returned as separate object.",
    "parameters": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "Path to context. Examples: USE_CASE/COPYWRITER, USE_CASE/COPYWRITER/prohibitions, ROLE/STRATEGIST/capabilities, CLIENT/AI_OPENER/voice, OPS/BRIEF_TEMPLATES, CONFIG/agents"
        },
        "client_id": {
          "type": "string",
          "description": "Required. Client ID for client-specific data. Example: AI_OPENER"
        },
        "include_client": {
          "type": "boolean",
          "description": "Include full CLIENT object in response. Default true. Set false on subsequent calls to save tokens when you already have client context."
        }
      },
      "required": ["path", "client_id"]
    }
  }
}
```

```json
{
  "type": "function",
  "function": {
    "name": "rac_file",
    "description": "Get raw file content without resolution. Use when you need exact file structure including $ref pointers.",
    "parameters": {
      "type": "object",
      "properties": {
        "file_id": {
          "type": "string",
          "description": "File identifier. Examples: LOGIC_08_QUALITY_GATES, OPS_03_COPYWRITING_PLAYBOOK, USE_CASE_04_COPYWRITER"
        },
        "section": {
          "type": "string", 
          "description": "Optional. Dot-notation path to section. Example: critical_functions.write_content"
        }
      },
      "required": ["file_id"]
    }
  }
}
```

<!-- COMMENT: -->

---

## 11. Example Agent Interactions

### Example 1: First Call — Get Full Context

**User**: "Write me a LinkedIn post about our new feature"

**Agent calls** (first call, needs full client):
```json
{
  "name": "rac_context",
  "arguments": {
    "path": "USE_CASE/COPYWRITER",
    "client_id": "AI_OPENER"
  }
}
```

**API returns** (~2K tokens content + ~12K tokens client):
```json
{
  "path": "USE_CASE/COPYWRITER",
  "resolved": true,
  "content": {
    "id": "USE_CASE_04_COPYWRITER",
    "mission": "Create compelling, on-brand content...",
    "prohibitions": { "..." },
    "capabilities": { "..." },
    "critical_functions": { "..." }
  },
  "client": {
    "id": "AI_OPENER",
    "voice": {
      "overrides": {
        "tone": "confident, direct, pragmatic",
        "terminology_preferences": {
          "prefer": ["Compliant AI Teams", "orchestration", "governance-first"],
          "avoid": ["revolutionair", "disruptief", "game-changing"]
        }
      }
    },
    "client_identity": {
      "brand": {
        "tagline": "Deploy AI teams, not AI tools."
      }
    },
    "evidence_vault": { "..." },
    "ai_policy": { "..." }
  }
}
```

---

### Example 2: Follow-up Call — Skip CLIENT

**User**: "Now get me the campaign structures for the post"

**Agent calls** (already has client context, skip it):
```json
{
  "name": "rac_context",
  "arguments": {
    "path": "OPS/CAMPAIGN_STRUCTURES",
    "client_id": "AI_OPENER",
    "include_client": false
  }
}
```

**API returns** (~5K tokens, no client bloat):
```json
{
  "path": "OPS/CAMPAIGN_STRUCTURES",
  "resolved": true,
  "content": {
    "campaign_archetypes": { "..." },
    "hero_hub_help": { "..." },
    "multi_channel_flighting": { "..." }
  }
}
```

---

### Example 3: Raw File Access

**User**: "Show me the exact structure of the quality gates logic"

**Agent calls**:
```json
{
  "name": "rac_file",
  "arguments": {
    "file_id": "LOGIC_08_QUALITY_GATES"
  }
}
```

**API returns**: Raw file with `$ref:` pointers visible (for debugging/inspection)

<!-- COMMENT: -->

---

## 12. Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File ID mapping | Strip UUIDs | Clean paths |
| Multi-file responses | Return all in one | Simpler for agent |
| Default client | Error if missing | Explicit is better |
| CLIENT overlay | Separate object | No merge logic, transparent |
| CLIENT inclusion | Optional via `include_client` param | Avoid ~15K token bloat on repeat calls |
| Meta stripping | Always strip `meta` from responses | Noise for agents, saves tokens |
| $ref resolution | Must be fully recursive | No `[UNRESOLVED]` in output |
| Trimming | Deferred to v2 | Keep v1 simple |
| Tags filtering | Deferred to v2 | Keep v1 simple |

<!-- COMMENT: -->

---

## 13. Next Steps

1. [ ] Strip UUIDs from filenames OR build FILE_INDEX
2. [ ] Set up Vercel project
3. [ ] Implement `/api/context/[...path].ts`
4. [ ] Implement `/api/file/[file_id].ts`
5. [ ] Implement `loader.ts` (YAML parsing + index)
6. [ ] Implement `resolver.ts` ($ref resolution)
7. [ ] Implement `merger.ts` (extends inheritance)
8. [ ] Add API key auth
9. [ ] Test with OpenAI function calling
10. [ ] Deploy and iterate

<!-- COMMENT: -->

---

## Appendix A: File Layer Summary

| Layer | Files | Purpose | Needs CLIENT? |
|-------|-------|---------|---------------|
| CONFIG | 1 | Activation, agent names | No |
| CLIENT | 2 | Per-tenant data | N/A (is CLIENT) |
| LOGIC | 18 | Core rules (immutable) | No |
| OPS | 20 | Operational knowledge | Yes |
| ORG | 10 | Organization defaults | Yes |
| PACK | 2 | Domain expertise | Yes |
| ROLE | 12 | Capability definitions | No |
| USE_CASE | 12 | Agent definitions | Yes |
| WORKFLOW | 2 | Multi-phase orchestrations | Yes |

<!-- COMMENT: -->

---

## Appendix B: Complete File & Section Index

### CONFIG

```
CONFIG/
└── CONFIG_00_INSTANCE
    ├── meta
    ├── activation
    │   ├── logic_files (startup_critical, on_demand)
    │   ├── roles_active
    │   ├── packs_active
    │   ├── ops_files_active
    │   ├── use_cases_active
    │   ├── workflows_active
    │   └── libraries_active
    ├── vault_only_files
    ├── agents[]
    ├── instance
    │   ├── name, owner, org_id
    │   └── defaults (language, interface, session)
    ├── session_binding
    ├── features
    └── integrations
```

---

### CLIENT

```
CLIENT/
├── CLIENT_00_BASE_TEMPLATE (schema only)
└── CLIENT_01_DEMO_CLIENT
    ├── meta
    ├── evidence_tiers          → $ref: LOGIC_08_QUALITY_GATES#evidence_tiers
    ├── source_reliability      → $ref: LOGIC_08_QUALITY_GATES#source_reliability
    ├── evidence_schema         → $ref: LOGIC_08_QUALITY_GATES#evidence_item_schema
    ├── ai_policy_schema        → $ref: LOGIC_12_GOVERNANCE#ai_policy_schema
    ├── ai_policy_enforcement   → $ref: LOGIC_16_POLICY_CAPTURE#enforcement_actions
    ├── client_identity
    │   ├── name, display_name, industry, website, description
    │   ├── brand (mission, vision, category_claim, tagline, values, hero_statement, differentiation)
    │   └── contact (primary, billing)
    ├── products
    │   └── rac_marketing_team (name, tagline, description, core_promise, deployment, tiers)
    ├── libraries
    ├── voice
    │   ├── profile
    │   └── overrides (tone, formality, personality_traits, terminology_preferences)
    ├── preferences
    │   ├── communication (response_format, language)
    │   ├── deliverables (preferred_formats, max_length_pages, naming_convention)
    │   └── review (requires_approval, approvers, turnaround_hours)
    ├── segments
    ├── competition
    ├── evidence_vault
    │   └── items[]
    ├── kpis
    ├── gtm_assets
    ├── use_cases
    │   ├── overrides
    │   └── custom
    ├── ai_policy
    │   └── overrides (prohibited_use_cases, blocked_topics, confidential_keywords, sensitive_topics, require_human_review, ai_disclosure)
    ├── tool_routing_overrides
    ├── case_library
    └── quality_extensions
        ├── additional_entry_gates[]
        └── additional_exit_gates[]
```

---

### LOGIC

```
LOGIC/
├── LOGIC_00_INDEX
│   ├── meta
│   ├── boot_sequence
│   ├── auto_inheritance
│   └── layers
│
├── LOGIC_01_META
│   ├── meta
│   ├── canonical_meta_template
│   └── ref_validation
│
├── LOGIC_02_RETRIEVAL
│   ├── meta
│   ├── base_dependencies_template
│   └── override_rules
│
├── LOGIC_03_TAXONOMY
│   ├── meta
│   └── valid_tags
│
├── LOGIC_04_PLATFORM
│   ├── meta
│   ├── platform_identity
│   ├── agent_self_awareness
│   └── runtime_parameters
│
├── LOGIC_05_RAG_MECHANICS
│   ├── meta
│   ├── vector_store
│   └── embedding_models
│
├── LOGIC_06_ORCHESTRATION
│   ├── meta
│   └── orchestration_modes
│
├── LOGIC_07_CAPABILITIES
│   ├── meta
│   └── capability_catalog
│
├── LOGIC_08_QUALITY_GATES
│   ├── meta
│   ├── universal_gates (entry, exit)
│   └── evidence_tiers
│
├── LOGIC_10_TOOLS_CORE
│   ├── meta
│   ├── tool_schema
│   └── tool_registry
│
├── LOGIC_11_TRACE
│   ├── meta
│   └── trace_events
│
├── LOGIC_12_GOVERNANCE
│   ├── meta
│   └── minimums
│
├── LOGIC_13_INTEGRATION
│   ├── meta
│   └── integration_categories
│
├── LOGIC_14_PRICING
│   ├── meta
│   └── roi_models
│
├── LOGIC_15_EFFORT_ESTIMATION
│   ├── meta
│   └── baselines
│
├── LOGIC_16_POLICY_CAPTURE
│   ├── meta
│   ├── enforcement_actions
│   ├── policy_evaluation
│   └── policy_capture_overview
│
├── LOGIC_17_IMAGE_GENERATION
│   ├── meta
│   ├── references
│   ├── engine_capabilities
│   ├── image_prompt_package_contract
│   └── legacy_image_prompt_package_schema
│
└── LOGIC_18_CASE_CAPTURE
    ├── meta
    ├── command
    └── case_record_schema
```

---

### OPS

```
OPS/
├── OPS_00_STANDARDS (base template)
│   ├── meta
│   ├── quality_gates          → $ref: LOGIC_08_QUALITY_GATES#universal_gates
│   ├── evidence_tiers         → $ref: LOGIC_08_QUALITY_GATES#evidence_tiers
│   ├── source_reliability     → $ref: LOGIC_08_QUALITY_GATES#source_reliability
│   ├── ai_policy_enforcement  → $ref: LOGIC_16_POLICY_CAPTURE#enforcement_actions
│   ├── ops_base_template
│   ├── kpi_framework
│   └── evidence_policy
│
├── OPS_01_STYLE_OPTIONS
│   ├── meta, extends: OPS_00_STANDARDS
│   └── style_dimensions
│
├── OPS_02_VOICES_LIBRARY
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── voice_schema
│   └── voices[]
│
├── OPS_03_COPYWRITING_PLAYBOOK
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── persuasion_frameworks
│   └── format_patterns
│
├── OPS_04_LINKEDIN_PLAYBOOK
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── platform_principles
│   └── post_formats
│
├── OPS_05_SOCIAL_PLAYBOOK
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── platform_principles
│   └── platform_patterns
│
├── OPS_06_INDEX
│   ├── meta, extends: OPS_00_STANDARDS
│   └── content_types
│
├── OPS_07_CAMPAIGN_STRUCTURES
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── campaign_archetypes
│   └── hero_hub_help
│
├── OPS_08_BRIEF_TEMPLATES
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── brief_types
│   └── creative_brief_template
│
├── OPS_09_STRATEGY_FRAMEWORKS
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── framework_catalog
│   ├── swot
│   └── pestel
│
├── OPS_10_CHANNEL_GUIDELINES
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── channel_catalog
│   └── linkedin
│
├── OPS_11_CONTENT_CALENDARS
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── calendar_structures
│   └── cadence_patterns
│
├── OPS_12_REPORTING_TEMPLATES
│   ├── meta, extends: OPS_00_STANDARDS
│   └── report_formats
│
├── OPS_13_THOUGHT_LEADERS
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── usage_guidelines
│   ├── thought_leader_schema
│   └── thought_leaders[]
│
├── OPS_14_RESEARCH_PROTOCOLS
│   ├── meta, extends: OPS_00_STANDARDS
│   └── research_methodology
│
├── OPS_15_REVIEW_CHECKLISTS
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── checklist_schema
│   └── universal_checklist
│
├── OPS_16_LOCALIZATION
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── localization_principles
│   └── language_variants
│
├── OPS_17_EXPERTS
│   ├── meta, extends: OPS_00_STANDARDS
│   ├── expert_source_schema
│   └── credibility_criteria
│
├── OPS_18_HANDOFF_INTAKE
│   ├── meta, extends: OPS_00_STANDARDS
│   └── handoff_contract
│
└── OPS_19_HANDOFF_DELIVERY
    ├── meta, extends: OPS_00_STANDARDS
    └── handoff_contract
```

---

### ORG

```
ORG/
├── ORG_01_FOUNDATION
│   ├── meta
│   ├── org_basics
│   ├── operating_context
│   ├── market_context
│   └── competitor_registry
│
├── ORG_02_BRAND_POSITIONING
│   ├── meta
│   ├── offers_catalog
│   ├── differentiators
│   ├── proof_points
│   └── pricing
│
├── ORG_03_AUDIENCE_MESSAGING
│   ├── meta
│   ├── audiences
│   ├── messaging
│   └── constraints
│
├── ORG_04_CHANNEL_PLAYBOOKS
│   ├── meta
│   └── channels
│
├── ORG_05_DELIVERABLE_TEMPLATES
│   ├── meta
│   └── templates
│
├── ORG_06_VISUAL_SYSTEM
│   ├── meta
│   ├── visual_system
│   └── design_qa
│
├── ORG_07_MARKETING_COMPLIANCE
│   ├── meta
│   ├── claims_policy
│   ├── disclaimer_patterns
│   └── regulated_topics
│
├── ORG_08_PRODUCTION_OPS
│   ├── meta
│   ├── approval_matrix
│   ├── definition_of_done
│   └── revision_policy
│
├── ORG_09_MEASUREMENT_SYSTEM
│   ├── meta
│   └── measurement
│
└── ORG_10_MARKET_LOCALIZATION
    ├── meta
    └── localization
```

---

### PACK

```
PACK/
├── PACK_01_EMPLOYER_BRANDING
│   ├── meta
│   ├── evidence_tiers         → $ref: LOGIC_08_QUALITY_GATES#evidence_tiers
│   ├── source_reliability     → $ref: LOGIC_08_QUALITY_GATES#source_reliability
│   ├── evidence_schema        → $ref: LOGIC_08_QUALITY_GATES#evidence_item_schema
│   ├── rag_integration        → $ref: LOGIC_05_RAG_MECHANICS#vector_store
│   ├── pack_definition
│   ├── knowledge_assets
│   ├── evidence_vault
│   ├── capability_extensions
│   ├── rag_configuration
│   ├── quality_requirements
│   ├── metrics
│   ├── implementation
│   └── dod
│
└── PACK_02_WEB_OPTIMIZATION
    ├── meta
    ├── evidence_tiers         → $ref: LOGIC_08_QUALITY_GATES#evidence_tiers
    ├── source_reliability     → $ref: LOGIC_08_QUALITY_GATES#source_reliability
    ├── evidence_schema        → $ref: LOGIC_08_QUALITY_GATES#evidence_item_schema
    ├── rag_integration        → $ref: LOGIC_05_RAG_MECHANICS#vector_store
    ├── pack_definition
    ├── knowledge_assets
    ├── evidence_vault
    ├── required_capabilities
    ├── capability_extensions
    ├── rag_configuration
    ├── quality_requirements
    ├── metrics
    ├── implementation
    └── dod
```

---

### USE_CASE

```
USE_CASE/
├── USE_CASE_00_BASE_TEMPLATE (schema only)
│   ├── meta
│   ├── interface_standards    → $ref: LOGIC_09_INTERFACE#output_standards
│   ├── hitl_triggers          → $ref: LOGIC_09_INTERFACE#hitl_triggers
│   ├── instantiation          → $ref: LOGIC_04_PLATFORM#instantiation
│   ├── ai_policy_enforcement  → $ref: LOGIC_16_POLICY_CAPTURE#enforcement_actions
│   ├── base_quality_gates
│   └── use_case_template
│
└── USE_CASE_01-11 (all extend USE_CASE_00_BASE_TEMPLATE)
    ├── meta
    ├── extends: "USE_CASE_00_BASE_TEMPLATE"
    ├── use_case_definition
    ├── prohibitions
    ├── critical_functions
    ├── activation
    ├── capabilities_from
    ├── knowledge_sources
    ├── persona
    └── runtime_ux

    Files:
    ├── USE_CASE_01_ORCHESTRATOR
    ├── USE_CASE_02_STRATEGIST
    ├── USE_CASE_03_CREATIVE
    ├── USE_CASE_04_COPYWRITER
    ├── USE_CASE_05_DESIGNER
    ├── USE_CASE_06_SOCIAL
    ├── USE_CASE_07_ANALYST
    ├── USE_CASE_08_BRIEF
    ├── USE_CASE_09_TRAFFIC
    ├── USE_CASE_10_ANALYTICS
    └── USE_CASE_11_COMMERCIAL
```

---

### WORKFLOW

```
WORKFLOW/
├── WORKFLOW_00_BASE_TEMPLATE (schema only)
│   ├── meta
│   ├── workflow_type: "base_template"
│   ├── interface_standards_ref → $ref: LOGIC_09_INTERFACE
│   ├── hitl_triggers_ref       → $ref: LOGIC_12_HITL
│   ├── effort_estimation_ref   → $ref: LOGIC_15_EFFORT
│   ├── governance_ref          → $ref: LOGIC_08_GOVERNANCE
│   ├── ai_policy_enforcement   → $ref: LOGIC_16_POLICY_CAPTURE#enforcement_actions
│   ├── tool_registry_ref       → $ref: LOGIC_10_TOOLS_CORE#tool_registry
│   ├── capability_mapping_ref  → $ref: LOGIC_10_TOOLS_CORE#capability_tool_mapping
│   ├── state_management
│   ├── base_quality_gates
│   ├── workflow_template
│   └── validation
│
└── WORKFLOW_01_TRENDWATCHER_MORNING
    ├── meta
    ├── interface_standards_ref → $ref: LOGIC_09_INTERFACE
    ├── hitl_triggers_ref       → $ref: LOGIC_09_INTERFACE#hitl_triggers
    ├── effort_estimation_ref   → $ref: LOGIC_15_EFFORT_ESTIMATION
    ├── governance_ref          → $ref: LOGIC_12_GOVERNANCE
    ├── ai_policy_enforcement   → $ref: LOGIC_16_POLICY_CAPTURE#enforcement_actions
    ├── tool_registry_ref       → $ref: LOGIC_10_TOOLS_CORE#tool_registry
    ├── capability_mapping_ref  → $ref: LOGIC_10_TOOLS_CORE#capability_tool_mapping
    ├── workflow_definition
    ├── role_pairs
    ├── state_management
    └── phases[]
```

<!-- COMMENT: -->
