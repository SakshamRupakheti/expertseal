# Architecture: 2.0 preview

## Optional local evidence mode

The previous extension pipeline below remains intact. `local` is an additional provider handled by `lib/local-research.js` inside the trusted worker. It uses a fixed loopback endpoint and separately saved pairing token, never a page-provided endpoint. The optional loopback host permission is requested from a settings click. It is not required by existing providers.

The Node companion verifies Host, exact extension Origin, JSON content type, request size and a constant-time bearer comparison. It binds only to 127.0.0.1, allows two concurrent checks and six new checks/minute, sends no logs of creator requests, and exposes only authenticated health/research POST routes. A health handshake before cache access supplies a configuration/startup fingerprint. Topic, post hint, profile context and that fingerprint join the creator/provider cache key; credentials never enter cache keys. History can be reopened offline without a handshake. Changes to the model or source policy require a companion restart and invalidate reuse.

`server.js` uses the official MCP SDK client and stdio transport to spawn `mcp.js`. Eight schema-validated tools run the stages in `research.js`. The browser never spawns a process or speaks raw MCP to an unprotected port. Research sessions are random, bounded, held in memory for at most two minutes and disposed after the orchestrated call. No server-side research database or shared cross-user cache exists.

`network.js` rejects private/reserved DNS results, pins a resolved public address to the socket, rejects every redirect and bounds time/bytes. Only explicitly configured upstream loopback endpoints may access private addresses. Source collection additionally requires an operator-approved exact HTTPS origin, readable robots policy and HTML content type. There is no login automation or PDF/JavaScript execution.

`evidence.js` parses source-scoped Schema.org Person records and authored work. ORCID uses bounded public professional sections. A direct exact social-account link is required for attribution. Name/handle similarity remains a lead; conflicting directly linked names withhold attribution. Institutional status depends on the operator-reviewed source classification. ORCID and LinkedIn remain self-reported. Inconsistent structured career dates are marked conflicting. These rules do not constitute legal identity proof, comprehensive contradiction detection or a license-verification service.

Extraction is deterministic and limited to explicitly structured fields. Attendance is not upgraded to a degree. Original work must name the linked person's identifier as author. Topic relevance is exact field-phrase overlap, not a numerical expertise score or semantic fact-check. Public profile and selected-post hints remain separate from a user-selected subject.

Ollama/Qwen may return only IDs selecting existing evidence statements. Unknown IDs, duplicates, extra fields and incorrect ordering are rejected; canonical text/URLs are supplied by deterministic code. Model failures disclose fallback mode. This intentionally narrower design avoids claiming that an excerpt match proves an arbitrary LLM paraphrase. The primary UI is four statements; source records and unresolved leads live under View evidence.

See [design audit](docs/V2-DESIGN.md), [installation and hosted-mode design](docs/LOCAL-RESEARCH.md) and [testing record](docs/TESTING.md).

## Runtime

`manifest.json` declares an ES-module service worker, classic isolated-world content scripts and a popup/options page. There is no bundler or runtime dependency.

1. `lib/identity.js` canonicalizes supported profile URLs and rejects unsupported routes/hosts and unsafe link schemes. Stable YouTube channel IDs are preserved; cache keys do not merge IDs by case.
2. `content/content.js` detects creator elements and adds buttons. Detection alone makes no network request. Clicks send a bounded creator object through `chrome.runtime.sendMessage`.
3. `background/service-worker.js` validates sender identity and action, loads settings, checks the provider-specific seven-day cache and deduplicates in-flight requests. A maximum of two different requests can run concurrently.
4. `lib/verification.js` builds provider requests, runs search-enabled research with a 60-second timeout, decodes provider citation metadata and normalizes the report. No automatic retries or provider/model fallbacks occur.
5. `lib/report.js` renders user/model text through `textContent`, links only to HTTP(S) URLs and isolates Google-provided suggestion HTML in a scriptless sandboxed frame. Social-page badge and report UI lives in closed Shadow DOM. Shadow DOM is style isolation, not a security boundary against the entire host page.
6. `popup/` handles provider selection, masked key entry, manual URL research, activity counts and cache clearing. It can also open as a full-page extension tab.

## Storage and messages

`settingsV2` in `chrome.storage.local` contains `{provider, keys: {tavily, gemini, openai, perplexity}}`. Keys never appear in `getSettings` responses; the popup receives only booleans indicating which providers are configured. New keys travel only from the extension's own settings page to the worker, then to the selected provider.

Local and Sync storage access levels are set to `TRUSTED_CONTEXTS` at worker startup before request handling. Old synced keys are copied into local settings only if the new settings do not already exist, then removed from Sync. The migration does not claim to erase historical provider/browser backups.

Settings, removal, statistics and cache-clearing actions require the exact extension settings-page URL and extension ID. Content scripts can request research and open settings, but cannot retrieve or edit credentials. Social-page research must target the same platform as the sending page.

Cache keys contain schema version, provider, canonical creator URL and encoded name/context/LinkedIn/bio hints. Entries contain `{data, creator, provider, timestamp, version, cached}`. Expired entries are not reused. Explicit refresh bypasses cache, and clearing reports during an in-flight request prevents that request from repopulating the cache. `totalVerifications` counts completed research reports, including inconclusive reports, not cache hits.

## Evidence limits

Provider-returned grounding metadata supplies the source list. The model's own JSON source list is not accepted as proof that search happened. A positive assessment requires a strict `identityMatched: true`, at least one safely linked reported credential, and usable provider search citations. These are conservative gates, not independent validation of credential authenticity or claim-to-source entailment. No registry API or LinkedIn API is called directly.

## Packaging and tests

`scripts/check.mjs` checks manifest assets and JavaScript syntax. Node's test runner covers pure validation, mocked worker/storage/network integration and Happy DOM page/popup fixtures. `scripts/package.mjs` uses an explicit allowlist and a dependency-free ZIP writer. No development dependency or mock response is included in the loadable package.

Tavily reports run four focused basic searches concurrently, with independent 60-second aborts. Partial failures are shown but not cached. Public search results are grouped by query purpose and filtered by exact name/handle phrases or a user-supplied LinkedIn profile URL; this is relevance filtering, not identity verification. API model generation is not used for Tavily reports.

History, getReport and deleteReport are restricted to the extension settings page. Cache retention is bounded at 50 reports and 7 days, pruned during serialized saves. Report exports use an explicit public-field formatter instead of dumping storage. The settings page accepts public profile/name prefill parameters but never auto-starts research.
