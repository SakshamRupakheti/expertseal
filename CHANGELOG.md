# Changelog

## 1.1.0 — local testing candidate

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
