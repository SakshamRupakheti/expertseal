# Testing status

## Local automated validation

- `npm run check`: manifest-referenced assets and all six active JavaScript files pass.
- `npm test`: 24 tests pass using synthetic provider responses and Happy DOM page fixtures.
- Covered: canonical identity extraction; unsafe URL rejection; prompt/request shape; source metadata; malformed response handling; provider failures; key migration; message authorization; provider-specific cache/expiry; request deduplication; clear-during-flight behavior; key removal; YouTube watch/current channel header; X feed author selection; TikTok profile detection; safe report rendering; popup key entry and manual research.
- Dependency installation audit reported zero vulnerabilities at installation. This is not a full security audit.

## Installed browser and live provider

The user reports loading the packaged extension in Edge. Google AI Studio visibly shows the user's Default Gemini Project on the free tier, with one existing key. The user subsequently reported completing key entry; no key has been read by the agent.

On November 15, 2026, the agent observed the Check credentials badge on the live 3Blue1Brown YouTube channel and clicked it. The resulting report or error was not captured before browser-control access became unavailable. A provider request may have been sent; its outcome remains unverified. Local checks and all 24 automated tests were rerun successfully. Pending: observe the live result, inspect cited sources, repeat for a cache hit, and test clearing reports. Do not treat the live check as passed.

A passing synthetic test is not proof that a live social site's latest layout or a particular provider account works. Do not mark a store release ready until these steps are recorded.

## Manual acceptance steps

1. Load the package's unpacked directory. Confirm version 1.1.0 appears with no extension errors.
2. Open settings. Before saving a key, try research and verify a helpful setup error.
3. Save a key from your own non-billing Gemini project. Confirm the field clears, the UI says key saved, and the key is not printed in logs or rendered elsewhere.
4. Enter a known creator's profile URL and public name. Click Research credentials. Confirm either a real sourced assessment or an explicit provider/quota error; never a fabricated success.
5. Open the citations and verify the identity and credential wording. Check that uncertain findings are labeled inconclusive.
6. Repeat the same request: it should say Cached. Clear reports and repeat only if you intend another API request.
7. Visit a YouTube watch/channel page, refresh it, and use the badge. Repeat on X/TikTok if those sites are available. Check multiple feed authors to rule out cross-author results.
8. Remove the key, then retry: no provider request should occur.

Do not publish real API keys, raw browsing data or unreviewed claims about people as test fixtures.


November 15 follow-up: user screenshot confirms live HTTP 404/model unavailable. Added a read-only Gemini model-list diagnostic on 404 (no generation retry or automatic model switch); 25 tests pass. Updated installed output folder and ZIP. Live success remains pending. Newer Gemini free text tiers do not imply free Google Search grounding (pricing checked at https://aistudio.google.com/docs/pricing).

1.2.0: Tavily adapter uses one basic search, no generated answer and no automatic retries. Added request, result sanitization, quota, safe excerpt rendering, local key and cache tests (29 total). Live Tavily check is pending; no Tavily key accessed.

1.3.0: user-pasted live report confirms Tavily source results and exposes irrelevant LinkedIn matches and noisy excerpts. Added four focused searches and grouped source view, conservative phrase-based relevance filtering (not identity verification), collapsed unmatched candidates, empty-section labels, deduplication and partial failure handling. 31 automated tests cover regression; live grouped view remains untested.

1.3.1: TikTok feed/video authors are scoped to author containers. Stale profile headers are rejected when the route changes; duplicate badges are avoided. 34 automated tests pass. No live TikTok UI test has been performed; browser control is unavailable in this session.

1.4.0: 41 automated tests pass, including LinkedIn URL validation, user-supplied identity labels, history sender authorization, no-network reopening, hint-specific caches, per-report deletion, retention cap/expiry, public-field export, and settings prefill without auto-research. No new live provider check was performed.

November 16, 2026 (1.4.1): browser inspection of aasthasubedii confirmed a missing badge and live markup with display name in nested user-title h1 and handle in user-subtitle h2. Fixed both supported layouts and added the observed structure as a regression fixture. Independent audit found/fixed legacy key reassignment, unbound credential citations, cache clear/write race, and publication URL deduplication. 46 tests pass. Live fix still requires reloading the extension.

Live check November 16: after user-reported reload to 1.4.1, YouTube 3Blue1Brown displayed the badge, completed a Tavily dossier, opened its original About source, and reopening displayed Cached. Screenshot saved locally (not committed). TikTok aasthasubedii still has no badge despite the observed-layout fixture passing; site-access/loaded-folder confirmation is pending. Do not claim TikTok live success.
