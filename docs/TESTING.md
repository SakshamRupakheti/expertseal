# Testing status — 1.4.2

## Current validation (November 16, 2026)

- `npm run check` passes: manifest-referenced assets and all six runtime JavaScript files are valid.
- `npm test` passes: **47 automated tests** use synthetic provider responses, mocked extension storage and Happy DOM page fixtures.
- Covered areas include identity and URL validation, provider request/response handling, credential-to-citation matching, legacy key migration, message authorization, cache expiry and concurrency, report history and retention, source deduplication, safe rendering, identity hints, exports, and creator detection on supported page fixtures.
- The dependency installation audit reported zero vulnerabilities at installation. This is not a full security audit.

## Live Edge results

| Flow | Observed result |
| --- | --- |
| TikTok public creator profile | The loaded **1.4.2** marker was present, with exactly one **Check credentials** badge. Clicking it completed a Tavily report. Sections without matching evidence were labeled conservatively rather than treated as verified credentials. |
| TikTok cached report | Reopening the same creator report displayed **tavily · Cached**. |
| YouTube channel | A fresh Tavily report completed on the 3Blue1Brown channel. Its original About source opened successfully. |
| YouTube cached report | Reopening the channel report displayed **Cached**. |

These observations confirm the tested profile/channel flows on this Edge installation. They do not establish that every social layout works, or that returned search results prove a creator's identity, qualifications or claims. No screenshots or API keys are committed as test fixtures.

## Unresolved and untested

- **Gemini remains unresolved:** the configured model returned HTTP 404/model unavailable in the earlier live test. The diagnostic patch does not establish working Gemini access. No automatic model or paid-provider fallback is used.
- Live X behavior and TikTok/other social feed switching remain untested. Automated author-scoping tests are not a substitute for those checks.
- Clearing reports, key removal, identity-hint refinement, history deletion/retention and report export have automated coverage but still require live acceptance testing.
- Other Chrome/Edge installations, site-access configurations, login states and page variants may behave differently.
- OpenAI and Perplexity adapters have automated contract coverage only; they have not been tested with live provider accounts.

This is an experimental open-source preview, not a store-release readiness claim.

## Manual acceptance steps

1. Load or reload the unpacked extension. Confirm **1.4.2** appears with no extension errors, then refresh the social page.
2. Open settings. Before saving a key, attempt research and verify the helpful setup error.
3. Select **Tavily**, the default for new installations, and save your own key. Keep pay-as-you-go disabled for a free-tier test. Confirm the input clears and the saved key is never rendered or logged.
4. Enter a known creator's full profile URL and public name, or use the page badge. Confirm that the account shown in the report is the one selected. Expect four focused basic Tavily searches per fresh report, up to four credits; errors must remain explicit.
5. Inspect career, education, publications and social sections. Open original sources and check their identity relevance. Missing evidence, unmatched people and user-supplied LinkedIn hints must not become verified claims.
6. Reopen the same report and confirm **Cached**. Open a report from history and confirm no provider request occurs. Clear or delete reports, then rerun only when another API request is intended.
7. Test profile navigation, video pages and multiple feed authors on TikTok, YouTube and X. Check for missing or duplicate badges and ensure stale page headers or caption mentions cannot select another creator.
8. Try optional public identity hints and a LinkedIn profile URL. Confirm the report labels them as user-provided and unverified, and different hints do not reuse the wrong cached result.
9. Download a report. Check source links, timestamps and limitations; unmatched candidate people and API keys must be excluded. Deleting extension reports does not delete exported files.
10. Remove the provider key, then attempt a fresh research request: no provider call should occur. Previously saved reports should still open from history without a key.

Do not publish real API keys, raw browsing data, screenshots of private settings or unreviewed claims about people as fixtures.

## History

The entries below record what was known at each stage. Later observations above supersede earlier pending or failed UI checks.

### 1.1.0 — initial local testing candidate

The original local validation passed 24 tests. The user reported loading the package in Edge and completing Gemini key entry. The user's Gemini project was observed on the free tier; the key was not read by the agent.

On November 15, 2026, the YouTube channel badge was observed and clicked. Browser-control access became unavailable before the response could be inspected, so the live result was initially unverified. A subsequent user screenshot confirmed HTTP 404/model unavailable. A read-only Gemini model-list diagnostic was added, without generation retries or automatic model switching; 25 tests then passed. Free text generation on newer models was not assumed to include free search grounding.

### 1.2.0 — Tavily source search

Added one basic Tavily search with source excerpts, no generated answer and no automatic retries. Request, sanitization, quota, rendering, key and cache coverage brought the suite to 29 tests. At that point a live Tavily check was pending.

### 1.3.0 — grouped creator background

A user-pasted live report confirmed Tavily results but exposed noisy excerpts and unrelated LinkedIn profiles. Four focused searches and a grouped view were added, with conservative phrase-based relevance filtering, collapsed unmatched candidates, empty-section labels, deduplication and partial-failure handling. The suite passed 31 tests; the new view had not yet been tested live.

### 1.3.1 — TikTok author scoping

TikTok feed/video checks were limited to author containers. Stale profile headers were rejected during route changes, and duplicate badges were avoided. The suite passed 34 tests. Live TikTok validation was still pending while browser control was unavailable.

### 1.4.0 — identity hints and history

The suite reached 41 passing tests, including LinkedIn URL validation, user-supplied identity labels, history authorization, no-network reopening, hint-specific caches, deletion, retention, export and settings prefill. No new live provider check had been performed at this stage.

### 1.4.1 — live markup fix and independent audit

On November 16, live inspection of a TikTok profile found the display name inside a nested `user-title` heading and the handle in `user-subtitle`. Support for both layouts and an observed-structure fixture were added. The audit also fixed legacy key reassignment, unbound credential citations, a cache-clear/write race and publication URL deduplication. The suite passed 46 tests.

After a user-reported reload, a fresh and cached YouTube Tavily report completed and its original About source opened. TikTok's badge was still missing at that point, despite the fixture passing; loaded-version/site-access confirmation remained pending. A screenshot was kept locally, not committed.

### 1.4.2 — live profile and cache confirmation

The current validation confirmed the loaded 1.4.2 marker and a single badge on the TikTok profile, followed by fresh and cached Tavily reports. Empty evidence sections remained explicitly unverified. Together with the confirmed YouTube fresh/cached flow and opened About source, these results replace the earlier pending profile-flow status. The latest checks pass all 47 tests; the unresolved items remain listed above.
