# 🛡️ ExpertSeal

**Before you trust the advice, check who's giving it.**

Your feed is full of confident advice. ExpertSeal helps you look into the person behind it: career experience, education, publications and social presence, with source links you can inspect yourself.

**Open source · MIT licensed · Bring your own key · No ExpertSeal subscription**

[Get started](#install-locally) · [What the evidence means](#what-a-report-means) · [Contribute](CONTRIBUTING.md) · [Launch caption](docs/LAUNCH.md)

ExpertSeal is a Manifest V3 browser extension for Chrome and Microsoft Edge. It adds an on-demand **Check credentials** button on supported YouTube, TikTok and X/Twitter pages, plus a manual profile-URL check in the extension popup.

Bring your own API key. The extension and its settings run in your browser; AI processing happens at your selected provider. There is no ExpertSeal backend or subscription.

**This feature branch contains the 2.0 local-research preview.** The established provider flows are preserved. The optional companion adds MCP tools, conservative source-based identity handling and four-line expertise summaries. It has automated transport/evidence tests, but the complete live SearXNG-to-browser workflow is not yet verified. See [local setup](docs/LOCAL-RESEARCH.md) and [testing status](docs/TESTING.md). This branch is not a store release.

**Verify the evidence, not someone's popularity.** Local mode does not use follower counts, badges, engagement or institutional prestige. It distinguishes documented qualifications, topic overlap and factual accuracy. Missing evidence does not mean a creator lacks expertise.

Choose **Local open-source research** only after setting up the companion. It is optional, requires no paid model API, and never switches providers automatically. Public-source discovery still uses the internet. The installed 1.4.2 Tavily flows were previously tested live on YouTube and TikTok; that is not a live validation of the new mode.

## Install locally

1. Clone or download this repository:
   ```sh
   git clone https://github.com/SakshamRupakheti/expertseal.git
   ```
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Open ExpertSeal from the browser's Extensions menu. Choose **Open full page** for longer research sessions.
5. Choose Tavily for source search (or an AI provider), paste your own API key, and click **Save settings**. Do not put keys in source files or GitHub.
6. Enter a YouTube channel URL, TikTok profile URL or X profile URL and click **Research credentials**. Alternatively, refresh a supported social page and use its **Check credentials** button.

After source changes, click **Reload** on the extension card, then refresh the social page. No build or npm installation is needed to load the source extension.

## Free source search with Tavily

1. Create an account at https://app.tavily.com/ and copy a development API key. Keep pay-as-you-go disabled.
2. In ExpertSeal settings, select **Tavily**, paste the key and save. No Gemini key is needed for this mode.
3. Check a creator. One fresh report makes four focused basic searches (up to 4 credits): career, education, publications, and social presence. Career and education searches include LinkedIn; returned excerpts are self-reported search leads, not API-verified records. Repeated checks use the seven-day cache unless you select Refresh research.
4. Open the sources and confirm the identity yourself. Results are labeled **Not verified**; there is no AI verdict, credential certification or numerical trust score.

Tavily advertises 1,000 free credits per month without a card. Provider quotas and terms apply. See https://help.tavily.com/articles/8298987937-billing-credits-usage-limits.

## Free-tier testing with Gemini

Get your own key from [Google AI Studio](https://aistudio.google.com/app/apikey). For a free test, use a project without paid billing. ExpertSeal defaults to **`gemini-2.5-flash-lite`**, with Google Search grounding. Google's pricing page currently lists free input/output and a limited search allowance for this model; actual project quotas, availability and regional restrictions apply. A free ChatGPT subscription is not a free OpenAI API key.

ExpertSeal does not enable billing, automatically retry failed calls, switch to a paid model, or contact another provider on failure. If you supply a key for a billing-enabled project, your provider's charges can still apply. Review [current Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) and your project quota. Google states that free-tier inputs may be used to improve its products.

| Provider | Adapter | Status |
| --- | --- | --- |
| Tavily | Basic source search | Live grouped reports and cached reopening verified on YouTube and TikTok in Edge |
| Gemini | 2.5 Flash-Lite + Google Search | Live test failed: model unavailable (HTTP 404); diagnostic patch awaiting retest |
| OpenAI | GPT-4o Search Preview | Optional paid adapter; automated contract checks only |
| Perplexity | Sonar | Optional paid adapter; automated contract checks only |

## What a report means

- **Credential evidence found** (AI providers): the model reports a matched identity and credential, and a claimed credential link matches a provider-returned citation. This is an AI assessment, not independent certification. Tavily reports remain **Not verified**.
- **Inconclusive**: identity, credentials or usable search evidence were missing. Missing records do not establish that a creator is dishonest or unqualified.
- Reports include the model's summary, cited credentials, provider-returned source links, limitations and a timestamp. Open the sources and verify the identity yourself.
- Credentials do not prove an individual post is accurate. There are no numerical trust scores or automatic accusations.
- **LinkedIn OAuth/API verification is not implemented.** A LinkedIn page may appear as a search source; it is not treated as a professional license.

## Privacy and permissions

Keys are stored in this browser profile using `chrome.storage.local`, restricted to trusted extension contexts. They are not synced and are not encrypted by ExpertSeal. Upgrading the old prototype migrates keys out of Sync and removes its synced key fields.

Clicking a research button sends the creator's public URL, name and available bio to the provider you selected. No automatic API calls, telemetry, social-media cookies or private messages are sent. Reports are cached locally for seven days, separately per provider. **Clear reports** removes cached reports; **Remove key** removes the selected key.

The only general permission is `storage`. Content scripts run on the four declared social domains; host permissions allow HTTPS requests to the four provider API domains. The local mode requests optional access to `http://127.0.0.1/*` only when selected and saved. Browser match patterns cannot restrict ports; the worker itself fixes the companion port to 3210. There is no `tabs`, `activeTab` or `scripting` permission.

Read [PRIVACY.md](PRIVACY.md) for the full data flow and limitations.

## Development and packaging

Node 22+ is needed only for development checks. Happy DOM is a development dependency; it is not shipped.

```sh
npm ci
npm run check
npm test
npm run package
```

The package command produces `dist/expertseal-2.0.0.zip` and an unpacked preview directory. It includes an explicit runtime file list, the MIT license, README, local setup guide and privacy policy; it excludes credentials, tests, node_modules, companion runtime and Git history. Install companion dependencies separately from `companion/`; see [local setup](docs/LOCAL-RESEARCH.md).

See [architecture](ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [testing](docs/TESTING.md), and [changes](CHANGELOG.md). The [original context archive](docs/PROJECT_CONTEXT_ARCHIVE.md) and [initial review](docs/PUBLICATION_REVIEW.md) are historical records, not current feature claims.

## Troubleshooting

- **No badge:** refresh the social page; use a supported creator profile/watch page; try the manual profile-URL field if the site's layout has changed. TikTok/X layouts vary by account and region.
- **No API key:** open settings, paste the key and save. A saved key is not proof of successful provider authentication.
- **Quota reached:** wait and inspect your provider quota. ExpertSeal will not upgrade your project or silently switch models.
- **Model unavailable:** Gemini errors now include model IDs from a read-only API catalog request when available. This list does not guarantee project quota or free search grounding. Newer models' free text generation does not imply free Google Search grounding; review pricing before changing models. No model is switched automatically.
- **Inconclusive:** use the creator's public name to disambiguate, and inspect the sources. Lack of evidence is a valid outcome.
- **Popup closed:** an in-flight check may finish and cache its result. Reopen the full-page settings, enter the same profile URL and check again.

## License

[MIT](LICENSE). Contributions are welcome; never submit API keys or private creator records.

The grouped view shows up to three matching-name/handle source leads per category, with short excerpts collapsed. Unmatched results are collapsed separately and never attributed to the creator. A phrase match is a relevance filter, not identity verification. Empty sections explicitly say no matching evidence was found. Partial search failures are displayed and not cached.

Direct LinkedIn profile API integration remains unimplemented. Official profile access requires the member's consent and appropriate LinkedIn product permissions; signing in as a viewer does not authorize access to another creator's education or employment. See https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/api-reference/authentication.

## TikTok desktop testing

Open a creator's full https://www.tiktok.com/@username profile in Edge or Chrome. Use Check credentials beside the profile header. Video/feed buttons require an explicit author container; ambiguous caption mentions are ignored. If TikTok presents a login wall or its layout is unsupported, use the full profile URL and public name in ExpertSeal settings instead. No mobile-app integration is provided. Profile switches are checked against the visible handle to avoid mixing identities. A live profile check and cached reopening passed in Edge on November 16, 2026; feed/video layouts remain unverified live.

## Identity hints and saved reports

- In settings, expand **Improve the match** to add a public field/company/location and the creator's public LinkedIn profile URL. These hints are sent to the selected provider. They are not independently verified.
- Career and education searches use the supplied LinkedIn URL. A matching result is labeled **Profile supplied by you · connection unverified**. ExpertSeal never treats a user-supplied link as proof that accounts belong to the same person.
- On-page reports offer **Refine identity / add LinkedIn**, which opens settings with the current creator filled in. Opening settings does not start a search.
- **Recent reports** opens local cached results without API requests, even after removing a provider key. Each report can be deleted individually; Clear reports removes all cached reports.
- Reports are retained for seven days and capped at 50; old and expired entries are pruned after successful saves. Queries with different names, context, LinkedIn hints or bios have separate cache entries.
- **Download report (.txt)** saves a readable research note with links, timestamps and limitations. It excludes unmatched candidate people and API keys. The downloaded file is outside extension storage and is not deleted by Clear reports.

Only supply a public name or LinkedIn profile if you know it belongs to that creator; do not guess from the handle.

Versions 1.4.1–1.4.2 support both TikTok header orders, nested display names, and delayed text updates during page loading. Audited fixes preserve provider ownership of migrated legacy keys, reject credential URLs absent from provider citations, serialize cache clearing with pending writes, and preserve distinct publications identified by query parameters. Previous-schema reports are invalidated; keys remain saved.
