# Evidence Classification Systems Analysis

This document analyzes the evidence classification and quality assessment systems used across the RAG-RAC codebase, including their definitions, prevalence, and identified inconsistencies.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System 1: Evidence Tiers (3-Tier Classification)](#system-1-evidence-tiers-3-tier-classification)
3. [System 2: Source Reliability (A-D Ratings)](#system-2-source-reliability-a-d-ratings)
4. [Combined Assessment Matrix](#combined-assessment-matrix)
5. [System 3: Evidence Score (5-Point Scale) - Undocumented](#system-3-evidence-score-5-point-scale---undocumented)
6. [Prevalence Analysis](#prevalence-analysis)
7. [Identified Inconsistencies](#identified-inconsistencies)
8. [Recommendations](#recommendations)

---

## Executive Summary

The codebase uses **two formally documented systems** for evidence quality assessment, defined in `LOGIC_08_QUALITY_GATES.yaml`:

| System | Scale | Purpose | SSOT Location |
|--------|-------|---------|---------------|
| Evidence Tiers | 3 levels (tier_1, tier_2, tier_3) | Classify source authority | `LOGIC_08_QUALITY_GATES#evidence_tiers` |
| Source Reliability | 4 ratings (A, B, C, D) | Rate source trustworthiness | `LOGIC_08_QUALITY_GATES#source_reliability` |

A **third system** ("evidence score ≥4/5") appears in some files but is **not formally defined** in any SSOT, creating inconsistencies.

---

## System 1: Evidence Tiers (3-Tier Classification)

**SSOT**: `LOGIC_08_QUALITY_GATES#evidence_tiers`  
**Status**: Formally defined, widely adopted  
**Immutable**: Yes

### Tier Definitions

#### Tier 1 - Primary Sources (Highest Authority)
- **Description**: Primary sources, peer-reviewed, official
- **Authority**: Highest
- **Freshness Default**: 24 months
- **Usage**: **Required for quantitative claims**
- **Examples**:
  - Academic journals (peer-reviewed)
  - Official government statistics
  - Company financial reports (audited)
  - Primary research studies
  - Official regulatory documents
  - Court decisions and legal rulings

#### Tier 2 - Secondary Sources (Moderate Authority)
- **Description**: Reputable secondary sources
- **Authority**: Moderate
- **Freshness Default**: 18 months
- **Usage**: Acceptable for general claims
- **Examples**:
  - Industry reports (Gartner, Forrester, McKinsey)
  - Major news outlets (Reuters, AP, Bloomberg)
  - Trade publications
  - Case studies from reputable organizations
  - Professional association publications
  - Well-sourced Wikipedia articles

#### Tier 3 - Tertiary Sources (Limited Authority)
- **Description**: Tertiary sources, opinion, informal
- **Authority**: Limited
- **Freshness Default**: 12 months
- **Usage**: **Context only, not for claims**
- **Requires Disclaimer**: Yes
- **Examples**:
  - Blog posts
  - Social media
  - Unverified sources
  - Opinion pieces
  - User-generated content
  - Anecdotal evidence

### Decision Rules by Content Type

| Content Type | Minimum Tier | Minimum Reliability |
|--------------|--------------|---------------------|
| Quantitative claims | tier_1 | B |
| Qualitative claims | tier_2 | C |
| Background context | tier_3 | C |
| Client deliverables | tier_2 | B |
| Public content | tier_1 | B |

---

## System 2: Source Reliability (A-D Ratings)

**SSOT**: `LOGIC_08_QUALITY_GATES#source_reliability`  
**Status**: Formally defined, widely adopted  
**Immutable**: Yes

### Reliability Ratings

| Rating | Name | Trust Level | Description | Usage |
|--------|------|-------------|-------------|-------|
| **A** | Highly Reliable | 1.0 | Verified, authoritative, consistently accurate | Use confidently |
| **B** | Reliable | 0.85 | Reputable, generally accurate, occasional errors | Use with standard citation |
| **C** | Acceptable | 0.65 | Some verification needed, mixed track record | Verify if critical |
| **D** | Low Reliability | 0.4 | Use with caution, limited verification | Requires prominent disclaimer |

### Examples by Rating

**Rating A** - Government statistical agencies, Major peer-reviewed journals, Established financial institutions

**Rating B** - Major industry analysts, Quality news organizations, Professional associations

**Rating C** - Trade publications, Company press releases, Smaller research firms

**Rating D** - Individual blogs, Unverified social media, Anonymous sources

---

## Combined Assessment Matrix

The two systems work together to provide nuanced evidence decisions:

### Tier × Reliability Matrix

| | A (Highly Reliable) | B (Reliable) | C (Acceptable) | D (Low Reliability) |
|---|---|---|---|---|
| **Tier 1** | Excellent - use confidently | Strong - use with standard citation | Acceptable - note source limitations | Weak - seek better source |
| **Tier 2** | Strong - use with context | Good - standard use case | Acceptable - verify if critical | Weak - supplement with better source |
| **Tier 3** | Acceptable for background | Use for context only | Minimal use, verify claims | **Avoid - find alternative** |

---

## System 3: Evidence Score (5-Point Scale) - Undocumented

**SSOT**: ❌ **Not defined**  
**Status**: Used in some files without formal definition  
**Problem**: Creates ambiguity when mixed with tier terminology

### Occurrences

Found in `ROLE_02_STRATEGIST`:

```yaml
# Line 91
success_metric: "Concepts meeting brief at gate ≥85%; evidence score ≥4 for all claims."

# Line 392
- "Evidence score ≥ 4/5 for all factual claims"
```

This appears to be a **quality rating scale from 1-5** applied to individual pieces of evidence, distinct from the tier classification system. However:

- No formal schema exists
- No scoring criteria defined
- Conflated with "evidence tier" terminology in some places

---

## Prevalence Analysis

### Evidence Tiers System (3-Tier)

| Metric | Count |
|--------|-------|
| Files with `$ref: LOGIC_08_QUALITY_GATES#evidence_tiers` | **58 files** (69 references) |
| Files using `tier_1`, `tier_2`, `tier_3` values | **48 files** (278 matches) |
| Correct "Tier 1-2" shorthand usage | **22 unique occurrences** |

**Distribution by Layer**:
- OPS: 20 files
- ROLE: 4 files  
- PACK: 3 files
- CLIENT: 2 files
- USE_CASE: 2 files
- LOGIC: 7 files

### Source Reliability System (A-D)

| Metric | Count |
|--------|-------|
| Files with `$ref: LOGIC_08_QUALITY_GATES#source_reliability` | **26+ files** |
| Files using actual A/B/C/D values | **10+ files** (166 matches) |

**Most used ratings**: A and B (no evidence of D-rated sources in actual use)

### Inconsistent "Tier ≥4" References

| File | Line | Text |
|------|------|------|
| `USE_CASE_02_STRATEGIST.yaml` | 329 | `check: "All claims have evidence tier ≥4"` |
| `ROLE_02_STRATEGIST.yaml` | 408 | `quality_gates: ["Evidence tier ≥4"...]` |
| `ROLE_02_STRATEGIST.yaml` | 482 | `"Brief signed with SMART KPIs and evidence tier ≥4"` |
| `ROLE_02_STRATEGIST.yaml` | 248 | `done_when: "...evidence tier ≥3"` |
| `ROLE_03_CREATIVE.yaml` | 211, 374, 412 | `"Evidence tier ≥3..."` (3 occurrences) |
| `ROLE_10_ANALYTICS.yaml` | 591 | `"Evidence tier ≥3 for client-facing claims"` |

**Total inconsistent references**: 8 unique occurrences across 4 files

---

## Identified Inconsistencies

### Issue 1: "Evidence Tier ≥4" is Invalid

The SSOT defines only 3 tiers (tier_1, tier_2, tier_3). References to "tier ≥4" are **semantically invalid**.

**Affected Files**:
- `data/USE_CASE/6db6b9fa-19b0-4d70-888c-9cecd3481b3f_USE_CASE_02_STRATEGIST.yaml`
- `data/ROLE/0cc2be9b-3597-4db5-84c1-8fc4e4b37378_ROLE_02_STRATEGIST.yaml`

### Issue 2: Conflation of Tier and Score

The same file (`ROLE_02_STRATEGIST`) uses both:
- "evidence tier ≥4" (invalid tier reference)
- "evidence score ≥4/5" (undefined scoring system)

This suggests confusion between:
1. **Tier** = categorical classification (1, 2, 3)
2. **Score** = quality rating (1-5 scale)

### Issue 3: "Evidence Tier ≥3" Ambiguity

References like "Evidence tier ≥3" are technically valid but semantically confusing:
- If higher tier numbers = lower quality (tier_1 > tier_2 > tier_3)
- Then "≥3" means "tier_3 or higher" which is the **lowest acceptable**
- The comparison direction is inverted from typical numbering

### Issue 4: Undocumented 5-Point Scoring System

The "evidence score ≥4/5" pattern suggests an additional quality dimension that is:
- Not defined in LOGIC_08_QUALITY_GATES
- Not referenced in any SSOT
- Only appears in Strategist-related files

---

## Recommendations

### 1. Clarify Tier Numbering Convention

Document explicitly that **lower tier numbers = higher authority**:
- tier_1 = highest authority (best)
- tier_3 = lowest authority (worst)

### 2. Fix Invalid "Tier ≥4" References

Replace with valid tier requirements:

| Current (Invalid) | Suggested Fix |
|-------------------|---------------|
| `"evidence tier ≥4"` | `"evidence tier: tier_1 or tier_2"` |
| `"evidence tier ≥3"` | `"evidence tier: tier_1, tier_2, or tier_3"` |

Or, if intended to reference a score:

| Current (Invalid) | Suggested Fix |
|-------------------|---------------|
| `"evidence tier ≥4"` | `"evidence score ≥4/5"` |

### 3. Formalize Evidence Score (if needed)

If a 5-point scoring system is valuable, add to `LOGIC_08_QUALITY_GATES`:

```yaml
evidence_score:
  description: "Quality rating for individual evidence items"
  scale: 1-5
  criteria:
    5: "Excellent - tier_1 + reliability A + current (<12mo)"
    4: "Good - tier_1/2 + reliability A/B + fresh (<18mo)"
    3: "Acceptable - tier_2 + reliability B/C + valid (<24mo)"
    2: "Marginal - tier_3 + reliability C + approaching stale"
    1: "Insufficient - tier_3 + reliability D or stale"
```

### 4. Update Affected Files

Files requiring updates:

| File | Issue | Action |
|------|-------|--------|
| `USE_CASE_02_STRATEGIST.yaml` | "tier ≥4" | Replace with valid tier or score reference |
| `ROLE_02_STRATEGIST.yaml` | "tier ≥4", mixed terminology | Standardize all evidence references |
| `ROLE_03_CREATIVE.yaml` | "tier ≥3" | Clarify intent (tier_3 acceptable?) |
| `ROLE_10_ANALYTICS.yaml` | "tier ≥3" | Clarify intent |

---

## Appendix: Evidence Item Schema

For reference, the complete evidence item schema from `LOGIC_08_QUALITY_GATES`:

### Required Fields
- `id`: Unique identifier (pattern: `ev-{source}-{topic}-{nnn}`)
- `claim`: The specific claim (max 500 chars)
- `source`: Full citation
- `source_date`: Publication date (YYYY-MM-DD)
- `tier`: One of `tier_1`, `tier_2`, `tier_3`
- `source_reliability`: One of `A`, `B`, `C`, `D`

### Optional Fields
- `valid_until`: Expiration date
- `context`: Usage context or limitations
- `tags`: Searchable categorization
- `url`: Direct link to source
- `supersedes`: ID of replaced evidence
- `geography`: Geographic scope
- `industry`: Industry scope

---

*Generated: 2026-01-22*  
*Source: Analysis of RAG-RAC codebase YAML files*
