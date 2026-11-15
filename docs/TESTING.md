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
