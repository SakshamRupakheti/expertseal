# Architecture — 1.1

## Runtime

`manifest.json` declares an ES-module service worker, classic isolated-world content scripts and a popup/options page. There is no bundler or runtime dependency.

1. `lib/identity.js` canonicalizes supported profile URLs and rejects unsupported routes/hosts and unsafe link schemes. Stable YouTube channel IDs are preserved; cache keys do not merge IDs by case.
2. `content/content.js` detects creator elements and adds buttons. Detection alone makes no network request. Clicks send a bounded creator object through `chrome.runtime.sendMessage`.
3. `background/service-worker.js` validates sender identity and action, loads settings, checks the provider-specific seven-day cache and deduplicates in-flight requests. A maximum of two different requests can run concurrently.
4. `lib/verification.js` builds provider requests, runs search-enabled research with a 60-second timeout, decodes provider citation metadata and normalizes the report. No automatic retries or provider/model fallbacks occur.
5. `lib/report.js` renders user/model text through `textContent`, links only to HTTP(S) URLs and isolates Google-provided suggestion HTML in a scriptless sandboxed frame. Social-page badge and report UI lives in closed Shadow DOM. Shadow DOM is style isolation, not a security boundary against the entire host page.
6. `popup/` handles provider selection, masked key entry, manual URL research, activity counts and cache clearing. It can also open as a full-page extension tab.

## Storage and messages

`settingsV2` in `chrome.storage.local` contains `{provider, keys: {gemini, openai, perplexity}}`. Keys never appear in `getSettings` responses; the popup receives only booleans indicating which providers are configured. New keys travel only from the extension's own settings page to the worker, then to the selected provider.

Local and Sync storage access levels are set to `TRUSTED_CONTEXTS` at worker startup before request handling. Old synced keys are copied into local settings only if the new settings do not already exist, then removed from Sync. The migration does not claim to erase historical provider/browser backups.

Settings, removal, statistics and cache-clearing actions require the exact extension settings-page URL and extension ID. Content scripts can request research and open settings, but cannot retrieve or edit credentials. Social-page research must target the same platform as the sending page.

Cache keys contain schema version, provider and canonical public creator URL. Entries contain `{data, creator, provider, timestamp, version, cached}`. Expired entries are not reused. Explicit refresh bypasses cache, and clearing reports during an in-flight request prevents that request from repopulating the cache. `totalVerifications` counts completed provider requests, including inconclusive reports, not cache hits.

## Evidence limits

Provider-returned grounding metadata supplies the source list. The model's own JSON source list is not accepted as proof that search happened. A positive assessment requires a strict `identityMatched: true`, at least one safely linked reported credential, and usable provider search citations. These are conservative gates, not independent validation of credential authenticity or claim-to-source entailment. No registry API or LinkedIn API is called directly.

## Packaging and tests

`scripts/check.mjs` checks manifest assets and JavaScript syntax. Node's test runner covers pure validation, mocked worker/storage/network integration and Happy DOM page/popup fixtures. `scripts/package.mjs` uses an explicit allowlist and a dependency-free ZIP writer. No development dependency or mock response is included in the loadable package.
