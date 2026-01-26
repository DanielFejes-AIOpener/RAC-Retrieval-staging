# Client Override System - Test Results

## Test Environment
- **Preview URL**: `https://rac-retrieval-git-feature-client-override-system-ai-opener.vercel.app`
- **Date**: 2026-01-26
- **Status**: Preview deployment requires Vercel authentication (cannot test via curl)

---

## Test 1: Fixico Endpoint

**Request:**
```
POST /api/rac/fixico
{"path": "ORG/BRAND_POSITIONING"}
```

**Expected Result:**
- Should return Fixico-specific `ORG_02_BRAND_POSITIONING.yaml` from `data/clients/fixico/ORG/`
- Content should include Fixico brand data (automotive B2B platform)
- First key indicators: `meta.org_id: "FIXICO"`, brand positioning about car damage repair marketplace

**Actual Result:**
- [ ] PENDING - Requires authentication to test

---

## Test 2: Reducate Endpoint

**Request:**
```
POST /api/rac/reducate
{"path": "CLIENT/PO_ONLINE"}
```

**Expected Result:**
- Should return Reducate-specific `CLIENT_02_PO_ONLINE.yaml` from `data/clients/reducate/CLIENT/`
- Content should include PO-Online client data (legal education CPE provider)
- First key indicators: `meta.client_id: "PO_ONLINE"`, brand about "nascholing voor advocaten"

**Actual Result:**
- [ ] PENDING - Requires authentication to test

---

## Test 3: MSN Endpoint

**Request:**
```
POST /api/rac/msn
{"path": "ORG/BRAND_POSITIONING"}
```

**Expected Result:**
- Should return MSN-specific `ORG_02_BRAND_POSITIONING.yaml` from `data/clients/msn/ORG/`
- Content should include Milieu Service Nederland brand data (waste management)
- First key indicators: `meta.org_id: "MSN"`, brand positioning about sustainable waste solutions

**Actual Result:**
- [ ] PENDING - Requires authentication to test

---

## Fallback Test (for reference)

**Request:**
```
POST /api/rac/fixico
{"path": "LOGIC/ORCHESTRATION"}
```

**Expected Result:**
- Should return SHARED `LOGIC_06_ORCHESTRATION.yaml` from `data/LOGIC/`
- LOGIC layer does NOT support client overrides - always returns shared version
- This confirms the layer restriction is working

---

## How to Test Manually

1. **In Browser**: Visit the preview URL and use the explorer at `/explorer`
2. **After Merge**: Test on production URL `https://rac-retrieval.vercel.app`
3. **With Vercel CLI**: Run `vercel login` then use `vercel curl`
