# Evidence Tier Fixes Required

All references to evidence tiers above the valid 3-tier system (tier_1, tier_2, tier_3) need resolution.

**Valid tier values**: `tier_1` (highest), `tier_2`, `tier_3` (lowest)

---

## Category A: Invalid "Tier ≥4" References

These reference a tier that does not exist.

---

### 1. USE_CASE_02_STRATEGIST.yaml — Line 329

**File**: `data/USE_CASE/6db6b9fa-19b0-4d70-888c-9cecd3481b3f_USE_CASE_02_STRATEGIST.yaml`

**Current**:
```yaml
- gate: "evidence_quality"
  check: "All claims have evidence tier ≥4"
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 2. ROLE_02_STRATEGIST.yaml — Line 408

**File**: `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

**Current**:
```yaml
quality_gates: ["Evidence tier ≥4","Benchmarks cited","Localization notes where public-facing"]
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 3. ROLE_02_STRATEGIST.yaml — Line 482

**File**: `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

**Current**:
```yaml
dod_ready:
  - "Brief signed with SMART KPIs and evidence tier ≥4"
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

## Category B: Ambiguous "Tier ≥3" References

These use comparison operators with inverted tier numbering (lower number = higher quality).
"Tier ≥3" technically means "tier_3 or worse" which may not be the intent.

---

### 4. ROLE_02_STRATEGIST.yaml — Line 248

**File**: `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

**Current**:
```yaml
done_when: "Insight stack validated with client and team; evidence tier ≥3"
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 5. ROLE_03_CREATIVE.yaml — Line 211

**File**: `data/ROLE/92a30291-e217-4d8e-99b9-b2d8d48eea96_ROLE_03_CREATIVE.yaml`

**Current**:
```yaml
gates:
  - "G1: Strategy & Evidence tier ≥3 approved."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 6. ROLE_03_CREATIVE.yaml — Line 374

**File**: `data/ROLE/92a30291-e217-4d8e-99b9-b2d8d48eea96_ROLE_03_CREATIVE.yaml`

**Current**:
```yaml
success_threshold: "Evidence tier ≥3; risks mitigated."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 7. ROLE_03_CREATIVE.yaml — Line 412

**File**: `data/ROLE/92a30291-e217-4d8e-99b9-b2d8d48eea96_ROLE_03_CREATIVE.yaml`

**Current**:
```yaml
- "Evidence tier ≥3 for factual/benefit claims."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 8. ROLE_10_ANALYTICS.yaml — Line 591

**File**: `data/ROLE/144fe6fc-35a6-47cc-95b8-308c538faaac_ROLE_10_ANALYTICS.yaml`

**Current**:
```yaml
qa:
  - "Evidence tier ≥3 for client-facing claims"
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

## Category C: "Tier ≥2" References

Same comparison direction issue. "Tier ≥2" means "tier_2 or tier_3" (moderate or low quality).

---

### 9. ROLE_04_COPYWRITER.yaml — Line 780

**File**: `data/ROLE/26f5f40e-22f1-4d42-8dea-cbe2ea35efd8_ROLE_04_COPYWRITER.yaml`

**Current**:
```yaml
quality_gates: ["Three Questions ≥2/3 all key phrases","Evidence Tier≥2 for claims","No placeholders","Zero AI detection markers","Accessibility and link text checks"]
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 10. ROLE_04_COPYWRITER.yaml — Line 816

**File**: `data/ROLE/26f5f40e-22f1-4d42-8dea-cbe2ea35efd8_ROLE_04_COPYWRITER.yaml`

**Current**:
```yaml
- "Evidence Tier≥2 for claims; stale evidence (>24 months) flagged."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 11. ROLE_04_COPYWRITER.yaml — Line 900

**File**: `data/ROLE/26f5f40e-22f1-4d42-8dea-cbe2ea35efd8_ROLE_04_COPYWRITER.yaml`

**Current**:
```yaml
- "All claims sourced or softened (Evidence Tier≥2)."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

## Category D: Undefined "Evidence Score" System

These reference a 5-point scoring system that is not defined in LOGIC_08_QUALITY_GATES.

---

### 12. ROLE_02_STRATEGIST.yaml — Line 91

**File**: `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

**Current**:
```yaml
success_metric: "Concepts meeting brief at gate ≥85%; evidence score ≥4 for all claims."
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

### 13. ROLE_02_STRATEGIST.yaml — Line 392

**File**: `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

**Current**:
```yaml
- "Evidence score ≥ 4/5 for all factual claims"
```

**Resolution**:  
<!-- YOUR COMMENT: -->


---

## Suggested Replacement Patterns

| Invalid Pattern | Likely Intent | Suggested Fix |
|-----------------|---------------|---------------|
| `tier ≥4` | High quality required | `tier_1 or tier_2 required` |
| `tier ≥3` | Any tier acceptable | `tier_1, tier_2, or tier_3` |
| `Tier≥2` | At least moderate quality | `tier_1 or tier_2 required` |
| `score ≥4/5` | ??? | Remove or define in SSOT |

---

## Notes

- Files in `/data/` are the source; files in root folders (ROLE/, USE_CASE/, etc.) may be generated/symlinked
- After resolving, sync changes to both locations if needed
- Consider standardizing format: `tier_1`, `tier_2`, `tier_3` (with underscore, lowercase)

---

*Generated: 2026-01-22*
