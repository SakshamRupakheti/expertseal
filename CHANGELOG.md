# Changelog

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
