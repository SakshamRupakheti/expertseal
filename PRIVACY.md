# ExpertSeal privacy

ExpertSeal is an open-source browser extension. There is no ExpertSeal server, account, analytics, advertising or telemetry.

## Data on your device

- Your selected provider and API keys are saved in `chrome.storage.local` in this browser profile. ExpertSeal does not encrypt the keys and does not promise protection from someone who can access your browser profile or computer.
- Storage is restricted to trusted extension contexts. Content scripts cannot read settings or API keys through the extension's message interface.
- Upgrading from the prototype copies existing keys from Chrome Sync into local storage and removes those keys from Sync. Previous copies may already have synced under your browser's rules.
- Research reports are cached locally for seven days. Clear reports removes cached reports; Remove key deletes the selected provider's stored key. Uninstalling the extension removes its extension storage according to browser behavior.

## Data sent to providers

Only when you click Research credentials, Check credentials, or Refresh research, ExpertSeal sends the selected creator's public profile URL, public name and available bio to your selected provider. It also sends your API key directly to that provider over HTTPS. It does not send your social-media cookies, private messages, whole browsing history or page contents.

Provider endpoints are Google's Gemini API, OpenAI's API, or Perplexity's API. Those services perform the AI processing remotely; the extension itself runs locally. BYOK does not mean the AI model runs on your computer.

Provider terms, retention and billing apply. Google currently states that free-tier Gemini inputs may be used to improve its products. Do not submit private or sensitive information in the creator-name field. Read the provider's terms before using an API key.

## Websites and reports

Content scripts inspect relevant public creator elements on YouTube, TikTok and X/Twitter to place buttons. This DOM inspection does not start API requests. Only HTTP(S) links are displayed in research reports. Clicking a source opens that external site, which has its own privacy practices.

Google Search suggestions, when supplied by the API, are displayed in a sandboxed frame without scripts, same-origin privileges, forms or external image loading. Search links can open a new tab on user interaction.

References: [Gemini pricing and data-use table](https://ai.google.dev/gemini-api/docs/pricing), [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
