# Analysis: UAE Top 30 Cognition Prospects Session

**Session:** `3687529040ad4d0891f796c6cf1e0e95`  
**ACUs Consumed:** ~1,248  
**Status:** Running (at time of summary)

---

## Executive Summary

This was a massive, high-value GTM session that evolved from a simple "research top 20 UAE prospects" request into a **full-blown sales command centre** spanning 17 phases. It produced 30 account plans, 700+ researched personas, outreach sequences, an Apps Script-powered contact engine, and an interactive HTML dashboard — essentially building an entire territory plan from scratch.

---

## What Went Well

### 1. Scope & Ambition
The session successfully scaled from 20 → 30 accounts, adding banks/FSI, and layering on personas, outreach cadences, and ABM content. The final deliverable set is genuinely comprehensive:
- **30 individual account plan decks** (Google Slides, 13 slides each)
- **1,174 total personas** mapped across all 30 accounts
- **UAE Account Engine** master sheet with 40+ tabs
- **Apps Script automation** for contact engine builds
- **Interactive HTML command centre** (564+ contacts, filterable/searchable)

### 2. Iterative Refinement
The session responded well to evolving criteria — exclusion rules changed multiple times (regulated entities → only banks → include banks), and each revision was incorporated without losing prior work.

### 3. Data Enrichment
Integration of multiple sources: Salesforce, Granola, Gong data, internal persona/ICP definitions, Exa for LinkedIn verification. Prior team touches (Brooke, Tristan, Vedant) were surfaced.

### 4. LinkedIn Verification (Phase 14)
Critically important — **caught major errors** like Samer Abu Ltaif being listed as FAB's CDIO when he's actually Microsoft EMEA President, and wrong CTOs at Emirates NBD. This alone likely saved embarrassing outreach mistakes.

---

## Issues & Risks Identified

### 1. Data Accuracy Concerns (HIGH)
Despite Phase 14 verification, the Summary by Company tab shows **648 contacts still marked "Not Contacted"** out of 1,174 total — and only **68 Connected, 62 Messaged, 0 Spoke To**. Given the errors found in Phase 14 (wrong people at FAB, Emirates NBD, Etihad, Tabby, Aldar), there's a meaningful risk that more incorrect profiles exist in the unverified bulk.

**Recommendation:** Prioritize a second verification pass on Tier 1 accounts' C-suite before outreach begins.

### 2. ARR Estimates Are Speculative
The $7M–$20.3M addressable ARR (midpoint $13.5M) is based on seat-count estimates and engineering team sizes scraped from public data. These are directionally useful but should not be treated as pipeline forecasts.

### 3. Engagement Status Is Almost Entirely "Not Contacted"
From the Summary by Company tab:
- **Connected:** 68 / 1,174 (5.8%)
- **Messaged:** 62 / 1,174 (5.3%)
- **Not Contacted:** 648 / 1,174 (55.2%)
- The remaining ~396 have no status

This is expected for a freshly-built prospecting engine, but it means the real work of execution hasn't started yet.

### 4. Scale of Deliverables May Exceed Maintainability
- 40+ tabs in a single Google Sheet
- 30 separate Google Slides decks
- Separate Notion pages, a contact engine sheet with Apps Script, and an HTML dashboard

This is a lot of surface area to keep current. As contacts respond, change roles, or new intel comes in, updates need to propagate across multiple artifacts.

### 5. Some Persona Tabs Have Gaps
Looking at the P: FAB tab, several rows in the "Specialists" section are empty (rows 34-41), and columns like Talk Track, Messaging Track, Why Now, and Why Anything are partially populated. This pattern likely exists across other persona tabs too.

---

## Session Efficiency

| Metric | Value |
|--------|-------|
| ACUs consumed | ~1,248 |
| Phases of work | 17 |
| Accounts researched | 30 |
| Contacts researched | 700+ (1,174 in sheet) |
| Account plan decks | 30 |
| Google Sheets created | 5+ |
| Apps Script functions | 5 |
| LinkedIn verifications | 465+ |

The ACU spend is high but justified given the volume of deliverables. This would have taken a human SDR/BDR team several weeks to compile manually.

---

## Recommendations for Next Steps

1. **Verify Tier 1 contacts** — Run a focused verification pass on the top 5 accounts (Emirates NBD, Careem, Emirates Airlines, ADCB, ADNOC) before starting outreach
2. **Fill persona tab gaps** — Complete Talk Track/Messaging Track/Why Now columns for Tier 1 accounts
3. **Establish update cadence** — Decide which artifact is the SSOT (the Account Engine sheet seems right) and deprecate or archive others
4. **Begin Week 1 of the 12-week prospecting plan** — The PG Plan tab should have the first batch of accounts and actions
5. **Connect the HTML Command Centre to live data** — Consider using Apps Script to auto-export to HTML, or move to a lightweight CRM

---

## Overall Assessment

**This session delivered exceptional value as a territory planning tool.** It went far beyond basic research and built a genuine GTM operating system for the UAE market. The main risks are around data accuracy (some contact details were wrong and more may be) and maintainability (too many separate artifacts). The foundation is strong — execution is the next challenge.
