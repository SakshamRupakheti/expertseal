# 🛡️ ExpertSeal

**Research a creator's credentials. Read the evidence. Decide for yourself.**

ExpertSeal is a Manifest V3 browser extension for Chrome and Microsoft Edge. It adds an on-demand **Check credentials** button on supported YouTube, TikTok and X/Twitter pages, plus a manual profile-URL check in the extension popup.

Bring your own API key. The extension and its settings run in your browser; AI processing happens at your selected provider. There is no ExpertSeal backend or subscription.

**Status: 1.3.1 experimental open-source preview. Tavily source search worked in a user-supplied report; the new grouped background view awaits live retesting. Gemini live verification remains blocked.** The installed Edge build displayed its YouTube badge, but the live Gemini request returned HTTP 404 (model unavailable). The latest diagnostic patch has not been retested live. All 34 automated tests pass with synthetic responses and page fixtures; these do not establish live provider compatibility. Testing is deferred. See [testing status](docs/TESTING.md). This is not a Chrome Web Store release.

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
| Tavily | Basic source search | Source search observed working; grouped view awaiting live retest |
| Gemini | 2.5 Flash-Lite + Google Search | Live test failed: model unavailable (HTTP 404); diagnostic patch awaiting retest |
| OpenAI | GPT-4o Search Preview | Optional paid adapter; automated contract checks only |
| Perplexity | Sonar | Optional paid adapter; automated contract checks only |

## What a report means

- **Credential evidence found**: the model reports a matched identity and credential, and the provider returned live-search citations. This is an AI assessment, not independent certification.
- **Inconclusive**: identity, credentials or usable search evidence were missing. Missing records do not establish that a creator is dishonest or unqualified.
- Reports include the model's summary, cited credentials, provider-returned source links, limitations and a timestamp. Open the sources and verify the identity yourself.
- Credentials do not prove an individual post is accurate. There are no numerical trust scores or automatic accusations.
- **LinkedIn OAuth/API verification is not implemented.** A LinkedIn page may appear as a search source; it is not treated as a professional license.

## Privacy and permissions

Keys are stored in this browser profile using `chrome.storage.local`, restricted to trusted extension contexts. They are not synced and are not encrypted by ExpertSeal. Upgrading the old prototype migrates keys out of Sync and removes its synced key fields.

Clicking a research button sends the creator's public URL, name and available bio to the provider you selected. No automatic API calls, telemetry, social-media cookies or private messages are sent. Reports are cached locally for seven days, separately per provider. **Clear reports** removes cached reports; **Remove key** removes the selected key.

The only general permission is `storage`. Content scripts run on the four declared social domains; host permissions allow HTTPS requests to the four provider API domains. There is no `tabs`, `activeTab` or `scripting` permission.

Read [PRIVACY.md](PRIVACY.md) for the full data flow and limitations.

## Development and packaging

Node 22+ is needed only for development checks. Happy DOM is a development dependency; it is not shipped.

```sh
npm ci
npm run check
npm test
npm run package
```

The package command produces `dist/expertseal-1.3.1.zip` and an unpacked directory. It includes an explicit runtime file list, the MIT license, README and privacy policy; it excludes credentials, tests, node_modules, archives and Git history.

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

Open a creator's full https://www.tiktok.com/@username profile in Edge or Chrome. Use Check credentials beside the profile header. Video/feed buttons require an explicit author container; ambiguous caption mentions are ignored. If TikTok presents a login wall or its layout is unsupported, use the full profile URL and public name in ExpertSeal settings instead. No mobile-app integration is provided. Profile switches are checked against the visible handle to avoid mixing identities. Live TikTok validation remains pending.
