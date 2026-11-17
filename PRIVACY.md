# ExpertSeal privacy

ExpertSeal is an open-source browser extension. There is no centrally operated ExpertSeal server, account, analytics, advertising or telemetry. The optional 2.0 research mode uses a companion service you run yourself.

## Optional local companion

Only an explicit research click sends the selected public creator URL, public name, bio, context/LinkedIn hints, selected subject and bounded selected-post hint to `127.0.0.1:3210`. A health handshake checks service configuration before cache reuse. The pairing token is sent in an Authorization header and stored only in trusted extension local storage, like existing keys. It is never returned to content scripts or included in research exports.

The companion forwards bounded search queries to your configured SearXNG, public author queries to OpenAlex, and, if configured, public-record queries to ORCID. It fetches approved professional source pages subject to robots/access checks. Search engines and source operators can see those requests and the service's IP address. It does not send social-site cookies or credentials, private messages, contact lists, browsing history or full social pages. ORCID requests select professional/name/link sections; they do not request contact/address sections. Retrieved source documents are untrusted, parsed transiently and reduced to professional fields. No analytics or request-content logging is added.

Optional Ollama processing receives up to eight bounded public biography passages (380 characters each), their categories/opaque IDs, and canonical short evidence statements, using a loopback endpoint. It selects supplied passages and cannot add new facts or URLs. Full fetched pages are not sent to the model. Accepted source quotations are included in browser reports and exports, labeled by provenance. Operator API tokens and the pairing secret live in the private companion configuration, not the repository. Protect this file with your OS account permissions; Unix file modes do not guarantee a private Windows ACL.

The companion retains at most eight transient research sessions for two minutes. Full research calls discard their sessions when complete. Reports remain in the extension's existing local cache and optional user exports, not a shared public database. Restarting the service changes its fingerprint, preventing stale cache reuse across configurations. Uninstalling the extension does not delete companion configuration, SearXNG/container data, Ollama model files or exported reports; those are separately managed local software.

The optional browser permission covers HTTP loopback. Its match pattern cannot express port restrictions, but the worker's endpoint is fixed to port 3210. Saving local mode asks for this permission; merely installing or visiting a social page does not grant it or start research. The companion also checks exact Host, extension Origin and bearer authentication. Other installed local software with access to your files is outside this protection boundary. No hosted deployment is enabled in this preview.

## Data on your device

- Your selected provider and API keys are saved in `chrome.storage.local` in this browser profile. ExpertSeal does not encrypt the keys and does not promise protection from someone who can access your browser profile or computer.
- Storage is restricted to trusted extension contexts. Content scripts cannot read settings or API keys through the extension's message interface.
- Upgrading from the prototype copies existing keys from Chrome Sync into local storage and removes those keys from Sync. Previous copies may already have synced under your browser's rules.
- Research reports and identity hints are cached locally for seven days, with up to 50 reports. Recent reports can be opened without API requests and deleted individually. Clear reports removes cached reports; Remove key deletes the selected provider's stored key. Uninstalling the extension removes its extension storage according to browser behavior.

## Data sent to providers

Only when you click Research credentials, Check credentials, or Refresh research, ExpertSeal sends the selected creator's public profile URL, public name and available bio to your selected provider. It also sends your API key directly to that provider over HTTPS. It does not send your social-media cookies, private messages, whole browsing history or page contents.

Tavily source-search mode sends the public name/handle and optional field/company/location hint in search queries, plus the supplied public LinkedIn URL for career and education searches; it does not send the bio. Other AI providers receive the bounded creator object including these optional hints. It returns source links and excerpts without an AI verdict. Provider endpoints are Tavily's Search API, Google's Gemini API, OpenAI's API, or Perplexity's API. Those services perform search or AI processing remotely; the extension itself runs locally. BYOK does not mean the AI model runs on your computer.

Provider terms, retention and billing apply. Google currently states that free-tier Gemini inputs may be used to improve its products. Do not submit private or sensitive information in the creator-name field. Read the provider's terms before using an API key.

## Websites and reports

Content scripts inspect relevant public creator elements on YouTube, TikTok and X/Twitter to place buttons. This DOM inspection does not start API requests. Only HTTP(S) links are displayed in research reports. Clicking a source opens that external site, which has its own privacy practices.

Google Search suggestions, when supplied by the API, are displayed in a sandboxed frame without scripts, same-origin privileges, forms or external image loading. Search links can open a new tab on user interaction.

References: [Gemini pricing and data-use table](https://ai.google.dev/gemini-api/docs/pricing), [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

Report downloads contain public research content, user-provided identity hints, links and limitations; API keys and unmatched candidate people are excluded. Downloaded files are saved outside extension storage and persist after clearing reports or uninstalling. Opening a social-page report's refinement link passes its public profile URL and display name to the extension settings tab. This makes no provider request.
