# Reference Resolution Suggestions

This document provides suggestions for resolving broken `$ref:` pointers in the RAC codebase.

---

## 1. Missing Files

### `LOGIC_12_HITL`
**Used in:** `WORKFLOW_00_BASE_TEMPLATE.yaml`

**Suggestion:** The HITL (Human-in-the-Loop) triggers are already defined in `LOGIC_09_INTERFACE#hitl_triggers`.

```yaml
# Replace:
hitl_triggers_ref: "$ref: LOGIC_12_HITL"
# With:
hitl_triggers_ref: "$ref: LOGIC_09_INTERFACE#hitl_triggers"
```

---

### `LOGIC_15_EFFORT`
**Used in:** `WORKFLOW_00_BASE_TEMPLATE.yaml`

**Suggestion:** File exists as `LOGIC_15_EFFORT_ESTIMATION`. Typo in the ref.

```yaml
# Replace:
effort_estimation_ref: "$ref: LOGIC_15_EFFORT"
# With:
effort_estimation_ref: "$ref: LOGIC_15_EFFORT_ESTIMATION"
```

---

### `LOGIC_08_GOVERNANCE`
**Used in:** `WORKFLOW_00_BASE_TEMPLATE.yaml`

**Suggestion:** Governance content exists in `LOGIC_12_GOVERNANCE`.

```yaml
# Replace:
governance_ref: "$ref: LOGIC_08_GOVERNANCE"
# With:
governance_ref: "$ref: LOGIC_12_GOVERNANCE"
```

---

### `LOGIC_15_ORCHESTRATION_ENGINE`
**Used in:** `ROLE_01_ORCHESTRATOR.yaml`, `PACK_02_WEB_OPTIMIZATION.yaml`

**Suggestion:** Orchestration content exists in `LOGIC_06_ORCHESTRATION`. The capability resolution logic could reference the use_case_registry or orchestrator_contract.

```yaml
# Replace:
orchestration: "LOGIC_15_ORCHESTRATION_ENGINE.yaml"
resolution: "$ref: LOGIC_15_ORCHESTRATION_ENGINE#capability_resolution"
# With:
orchestration: "LOGIC_06_ORCHESTRATION.yaml"
resolution: "$ref: LOGIC_06_ORCHESTRATION#orchestrator_contract"
```

---

## 2. Missing Sections in CONFIG_00_INSTANCE

The following refs point to infrastructure configuration that doesn't exist. These appear to be **placeholders for future implementation**.

| Ref | Used In | Suggestion |
|-----|---------|------------|
| `CONFIG#embedding.model` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"text-embedding-3-small"` |
| `CONFIG#embedding.cache_store` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"redis"` |
| `CONFIG#vector_store.primary` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"pinecone"` |
| `CONFIG#vector_store.fallback` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"qdrant"` |
| `CONFIG#sparse_index` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"elasticsearch"` |
| `CONFIG#reranker.model` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"cohere-rerank-v3"` |
| `CONFIG#version_store` | LOGIC_05_RAG_MECHANICS | Remove or stub with `"git"` |
| `CONFIG#feature_flags` | LOGIC_04_PLATFORM | **Already exists in LOGIC_04_PLATFORM#feature_flags** - ref should be removed or made self-referential |

**Recommendation:** Add these sections to `CONFIG_00_INSTANCE.yaml`:

```yaml
embedding:
  model: "text-embedding-3-small"
  cache_store: "redis"
  
vector_store:
  primary: "pinecone"
  fallback: "qdrant"
  
sparse_index: "elasticsearch"

reranker:
  model: "cohere-rerank-v3"
  
version_store: "git"
```

---

## 3. Missing Sections in LOGIC Files

### `LOGIC_04_PLATFORM#instantiation`
**Used in:** `USE_CASE_00_BASE_TEMPLATE.yaml`

**Suggestion:** The `instantiation` concept isn't defined. Either:
- Add an `instantiation:` section to LOGIC_04_PLATFORM
- Remove the ref and inline the content
- Reference `LOGIC_04_PLATFORM#runtime_parameters` instead

```yaml
# Option A - Remove ref:
instantiation:
  description: "How this use case gets instantiated"
  trigger: "User request or orchestrator delegation"
  
# Option B - Use existing section:
instantiation: "$ref: LOGIC_04_PLATFORM#runtime_parameters"
```

---

### `LOGIC_06_ORCHESTRATION#modes`
**Used in:** `OPS_06_INDEX.yaml`

**Suggestion:** Section exists as `orchestration_modes`, not `modes`.

```yaml
# Replace:
reference: "$ref: LOGIC_06_ORCHESTRATION#modes"
# With:
reference: "$ref: LOGIC_06_ORCHESTRATION#orchestration_modes"
```

---

## 4. Missing Sections in OPS_02_VOICES_LIBRARY

The file has a `voices:` section with specific voice profiles, but refs use different paths.

### Current structure:
```yaml
voices:
  founder_thought_leader: {...}
  company_authoritative: {...}
  # etc.
```

### Refs expect:
- `voice_profiles.founder_thought_leader`
- `voice_profiles.company_authoritative`
- `friendly_professional`
- `professional_authoritative`
- `voice_profile`

**Suggestion A - Rename section:**
```yaml
# Change:
voices:
# To:
voice_profiles:
```

**Suggestion B - Add aliases:**
```yaml
# Add at top level:
friendly_professional: "$ref: #voices.founder_thought_leader"
professional_authoritative: "$ref: #voices.company_authoritative"
voice_profile: "$ref: #voice_schema"
```

**Suggestion C - Update all refs:**
```yaml
# In USE_CASE files, replace:
voice: "$ref: OPS_02_VOICES_LIBRARY#friendly_professional"
# With:
voice: "$ref: OPS_02_VOICES_LIBRARY#voices.founder_thought_leader"
```

---

## 5. Missing Section in OPS_15_REVIEW_CHECKLISTS

### `OPS_15_REVIEW_CHECKLISTS#checklists`
**Used in:** `OPS_19_HANDOFF_DELIVERY.yaml`

**Suggestion:** The file has `universal_checklist`, not `checklists`.

```yaml
# Replace:
quality_checklists: "$ref: OPS_15_REVIEW_CHECKLISTS#checklists"
# With:
quality_checklists: "$ref: OPS_15_REVIEW_CHECKLISTS#universal_checklist"
```

---

## Summary of Changes

| Priority | Action | Files Affected |
|----------|--------|----------------|
| 🔴 High | Fix typos (LOGIC_15_EFFORT → LOGIC_15_EFFORT_ESTIMATION) | 1 |
| 🔴 High | Fix section names (modes → orchestration_modes, voices → voice_profiles) | 3 |
| 🟡 Medium | Add missing CONFIG sections | 1 |
| 🟡 Medium | Redirect to existing files (LOGIC_12_HITL → LOGIC_09_INTERFACE) | 2 |
| 🟢 Low | Add instantiation section to LOGIC_04_PLATFORM | 1 |

---

## Quick Fix Script

Run this to apply the simple renames:

```bash
# Fix LOGIC_15_EFFORT typo
sed -i '' 's/\$ref: LOGIC_15_EFFORT"/\$ref: LOGIC_15_EFFORT_ESTIMATION"/g' **/*.yaml

# Fix LOGIC_12_HITL → LOGIC_09_INTERFACE#hitl_triggers
sed -i '' 's/\$ref: LOGIC_12_HITL"/\$ref: LOGIC_09_INTERFACE#hitl_triggers"/g' **/*.yaml

# Fix LOGIC_08_GOVERNANCE → LOGIC_12_GOVERNANCE
sed -i '' 's/\$ref: LOGIC_08_GOVERNANCE"/\$ref: LOGIC_12_GOVERNANCE"/g' **/*.yaml

# Fix modes → orchestration_modes
sed -i '' 's/LOGIC_06_ORCHESTRATION#modes/LOGIC_06_ORCHESTRATION#orchestration_modes/g' **/*.yaml

# Fix checklists → universal_checklist
sed -i '' 's/OPS_15_REVIEW_CHECKLISTS#checklists/OPS_15_REVIEW_CHECKLISTS#universal_checklist/g' **/*.yaml
```
