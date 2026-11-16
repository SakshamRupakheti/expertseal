# Changelog

## 1.4.2 — TikTok hydration and live validation (2026-11-16)

- Detect profile headers populated through delayed text-node updates, with a regression test.
- Expose the injected content-script version in a public DOM attribute for diagnosing missing buttons; no creator data or keys are included.
- Verified a real Tavily report and cached reopening on a TikTok profile in Edge. YouTube's grouped report and cache were also verified live.
- All 47 automated tests and runtime/manifest checks pass. Gemini model access and remaining manual flows are still unverified; see `docs/TESTING.md`.

## 1.4.1 — live TikTok fix and correctness audit

- Fixed reversed/nested TikTok display-name and handle headers, confirmed on the live aasthasubedii page.
- Preserved Gemini ownership for provider-less legacy keys during migration.
- Required claimed credential links to match provider-returned citations.
- Serialized report clearing/deletion with pending storage writes.
- Preserved publication-identifying query parameters during deduplication.
- Added clearer full-reload guidance for stale extension workers.
- Invalidated pre-fix cached reports. 46 automated tests pass; installed fix awaits reload.


## 1.4.0 — identity hints and research history

- Added optional public context and LinkedIn profile hints, validated URLs and explicit unverified labels.
- Added on-page refinement links that prefill settings without spending credits.
- Added settings-only local history, no-credit report reopening, per-report deletion and a 50-report retention cap.
- Separated cache entries by research inputs to prevent reuse across different identity hints.
- Added plain-text exports excluding API keys and unmatched candidate people.
- Tavily is the default for new installations. 41 automated tests pass; live new-feature testing remains pending.


## 1.3.1 — TikTok author selection

- Bind feed/video checks to explicit author containers rather than caption mentions.
- Reject stale profile headers while navigating between creators.
- Added profile navigation, feed scoping and video author regression tests (34 total). Live TikTok test pending.


## 1.3.0 — creator background preview

- Grouped Tavily research into career, education, publications and social presence (four basic searches).
- Collapsed excerpts and unmatched candidates; removed common login clutter; deduplicated tracking URLs per section.
- Explicitly label LinkedIn excerpts as self-reported; no LinkedIn OAuth/API integration.
- Changed cache version so old ungrouped reports are not reused. Partial failures are not cached.
- 31 automated tests pass; new layout awaits live retest.


## 1.2.0 — Tavily source search preview

- Added Tavily BYOK basic search, excerpts and explicit Not verified labeling; no AI verdict.
- Added Tavily host permission, local key settings, quota errors and provider-separated caching.
- 29 automated tests pass; live Tavily test pending user key setup.


## 1.1.0 — experimental open-source preview

- Live Edge/YouTube check reached Gemini but failed with HTTP 404/model unavailable. Live testing is deferred; this preview is not production-ready.
- Added a read-only model catalog diagnostic for Gemini 404 errors without automatic model switching or generation retries; 25 automated tests pass.

- Added a complete manual profile-URL research flow, full-page settings and clear error states.
- Switched the default Gemini model to 2.5 Flash-Lite with search grounding, header authentication and a 60-second request timeout. No automatic retries, billing upgrades or paid model fallbacks.
- Added provider-returned evidence links and Google Search suggestions. Unsupported conclusions become inconclusive.
- Replaced blanket verified badges with a qualified AI research assessment.
- Moved keys out of Sync, restricted storage, removed raw-key responses and restricted settings actions to the extension's own page.
- Rebuilt creator badges and reports inside Shadow DOM, added current YouTube channel-header detection, and scoped X feed checks to the clicked author.
- Added seven-day, provider-specific caching, in-flight deduplication, refresh, cache clearing and activity counts.
- Removed unused prototype modules and broad activeTab/scripting permissions.
- Added automated tests, packaging, CI and accurate privacy/setup documentation.

Live API and installed-browser results must be recorded separately in `docs/TESTING.md`; automated tests use synthetic fixtures.
