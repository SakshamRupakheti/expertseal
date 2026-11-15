# Publication review

This is a bounded static review of the original ExpertSeal source snapshot (`6678342`) and the author's supplied context archive. It is not a full security audit or a successful live API verification.

## What is implemented

- Chrome Manifest V3 extension with popup settings and content scripts for YouTube, TikTok, and X/Twitter.
- On-demand requests to Gemini, OpenAI, or Perplexity using a user-provided API key.
- A credential-research prompt, result normalization, and a 30-day local result cache.
- MIT license, contribution guidance, and issue/PR templates.

## Gaps found in the source

1. **No LinkedIn API integration.** LinkedIn is mentioned as a research source in the prompt and as a roadmap item. There is no LinkedIn OAuth or API client.
2. **Credential storage differs from the privacy claims.** `popup/popup.js` and `background/service-worker.js` save keys using `chrome.storage.sync`, whereas README and architecture sections claim local-only storage. No application-level key encryption is implemented in the popup. Creator identity/context is sent to the selected external AI provider when verification runs.
3. **No Shadow DOM isolation.** `content/content.js` creates ordinary DOM elements; it does not call `attachShadow`, despite the documentation's claims.
4. **Provider origins are absent from manifest host permissions.** The service worker calls `generativelanguage.googleapis.com`, `api.openai.com`, and `api.perplexity.ai`, but `manifest.json` lists only social-platform origins. Review permissions and verify actual network behavior before describing provider support as working.
5. **The archive schema differs from the runtime schema.** The archive describes verdict enums and numeric confidence scores. Runtime output uses `verified: true | false | null`, confidence strings, `verified_credentials`, and `professional_profiles`.
6. **Evidence validation remains incomplete.** Verdicts are derived from model output; normalization does not independently retrieve source records or require supporting citations for a positive result. Displayed source URLs are HTML-escaped but not restricted to HTTP(S) schemes.
7. **Documentation claims need validation.** Provider availability, pricing/free tiers, compatibility, response times, example credentials, and platform stability have not been verified. The model identifiers in the README also differ from the service worker.

## Checks performed for this upload

- All six tracked JavaScript files passed `node --check`.
- The manifest parsed successfully and referenced extension assets were checked for existence.
- A scan of tracked files for common API-token and private-key patterns found no matches. This is a limited scan, not a guarantee that all possible secrets have been detected.
- No live provider calls or browser-extension end-to-end tests were run.

The publication commit adds the supplied archive, this review, a README status notice, and repository-link corrections. It preserves the original runtime JavaScript for subsequent development.
