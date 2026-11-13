# 🏛️ ExpertSeal Architecture & Technical Specification

ExpertSeal is an on-demand, privacy-preserving browser extension built on **Chrome Extensions Manifest V3**. It verifies content creators' real-world credentials using grounded Large Language Model (LLM) agents equipped with live web search, following a strict **Bring-Your-Own-Key (BYOK)** and **zero-telemetry** architecture.

---

## 📐 Table of Contents
1. [System Overview](#-system-overview)
2. [Component Breakdown](#-component-breakdown)
3. [End-to-End Data Flow](#-end-to-end-data-flow)
4. [Platform Extraction & SPA Navigation Strategy](#-platform-extraction--spa-navigation-strategy)
5. [LLM Agent & Search Grounding Engine](#-llm-agent--search-grounding-engine)
6. [Caching & State Architecture](#-caching--state-architecture)
7. [Security & Isolation Model](#-security--isolation-model)
8. [Future: Community DB & Trust Layer Architecture](#-future-community-db--trust-layer-architecture)

---

## 🌐 System Overview

ExpertSeal runs entirely within the user's browser sandbox. There are no intermediate proxy servers, tracking beacons, or centralized databases required for basic operation.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  USER BROWSER RUNTIME                                  │
│                                                                                        │
│  ┌────────────────────────┐                   ┌─────────────────────────────────────┐  │
│  │   Active Browser Tab   │                   │     Background Service Worker       │  │
│  │  (YouTube / X / TikTok)│                   │            (MV3 Worker)             │  │
│  │                        │                   │                                     │  │
│  │  ┌──────────────────┐  │ MessagePassing    │  ┌───────────────────────────────┐  │  │
│  │  │ Content Script   │──┼───────────────────┼─▶│ Orchestrator / Request Router │  │  │
│  │  │  - DOM Extractor │  │ (Action: VERIFY)  │  └──────────────┬────────────────┘  │  │
│  │  │  - Badge Injector│  │                   │                 │                   │  │
│  │  │  - Shadow DOM UI │◀─┼───────────────────┼─────────┐       │                   │  │
│  │  └──────────────────┘  │ (Action: RENDER)  │         │       ▼                   │  │
│  └────────────────────────┘                   │  ┌───────────────────────────────┐  │  │
│                                               │  │ Cache Manager                 │  │  │
│  ┌────────────────────────┐                   │  │ (chrome.storage.local)        │  │  │
│  │   Action Popup / UI    │                   │  └──────────────┬────────────────┘  │  │
│  │  - API Key Settings    │                   │                 │ (Cache Miss)      │  │
│  │  - Provider Selector   │                   │                 ▼                   │  │
│  │  - Cache Inspector     │                   │  ┌───────────────────────────────┐  │  │
│  └────────────────────────┘                   │  │ Provider Adapter Engine       │  │  │
│                                               │  │ - Gemini / OpenAI / Perplexity│  │  │
│                                               │  └──────────────┬────────────────┘  │  │
└───────────────────────────────────────────────┼─────────────────┼──────────────────────┘
                                                │                 │ Direct HTTPS
                                                │                 ▼ (User's API Key)
                                                │  ┌──────────────────────────────────┐
                                                │  │ External LLM APIs                │
                                                │  │ - Google Gemini (Search Ground)  │
                                                │  │ - Perplexity API (Sonar Search)  │
                                                │  │ - OpenAI API (Web Search Tools)  │
                                                │  └──────────────────────────────────┘
```

---

## 🧩 Component Breakdown

The extension is organized into modular subsystems under Manifest V3:

```
expertseal/
├── manifest.json              # Extension manifest (MV3 declarations, permissions, host permissions)
├── background/
│   └── service-worker.js      # Central background listener, lifecycle, caching layer, LLM dispatch
├── content/
│   ├── content.js             # Injected coordinator, DOM extractors, badge injector, modal drawer
│   └── content.css            # Scoped styles for injected badge and verification report overlay
├── lib/
│   ├── platforms.js           # Platform extraction catalog & selector specifications (YouTube, TikTok, X)
│   ├── prompt.js              # Master verification prompt specification and schema contracts
│   └── cache.js               # Storage layer specifications and cache key helpers
├── popup/
│   ├── popup.html             # Options and status interface (API keys, provider picker)
│   ├── popup.js               # Settings controller & API key validator
│   └── popup.css              # Minimal dark/light settings UI
├── icons/
│   ├── icon16.png             # Toolbar icon (16x16)
│   ├── icon48.png             # Extensions management icon (48x48)
│   └── icon128.png            # Chrome Web Store & installer icon (128x128)
├── community-db/              # Public crowdsourced verification ledger
│   ├── README.md              # Community DB specification and contribution guide
│   └── verified/              # Creator verification JSON files organized by platform
└── .github/                   # GitHub workflows, Issue & PR templates
```

### 1. Injected Content Script (`src/content/`)
- Injected on matching URLs (`youtube.com/*`, `tiktok.com/*`, `twitter.com/*`, `x.com/*`).
- Does **not** run background heavy computation; it remains dormant until matching navigation patterns occur.
- Manages an unobtrusive badge near the creator's username or channel title.
- Renders reports inside an isolated **Closed Shadow DOM** (`attachShadow({ mode: 'closed' })`) to prevent page CSS clashes and block host page JavaScript from reading extension state.

### 2. Platform Extractors (`src/content/extractors/`)
- Specialized adapter classes for each social platform.
- Normalizes disparate DOM structures into a uniform `CreatorIdentity` payload:
  - Canonical Handle (e.g. `@hubermanlab`)
  - Display Name (e.g. `Andrew Huberman`)
  - Platform Identifier (`youtube`, `tiktok`, `x`)
  - Profile URL & Bio/Description text
  - Self-claimed titles or domains (e.g., "Doctor", "CFA", "Harvard Prof")

### 3. Background Service Worker (`src/background/service_worker.js`)
- Listens for messages dispatched from content scripts and popup UI.
- Validates requests against configured API keys and provider preferences.
- Manages local cache lookups before triggering expensive external network calls.
- Executes HTTPS queries directly to the selected LLM provider endpoint.
- Normalizes provider-specific responses into the standardized `VerificationReport` schema.

### 4. Popup & Settings (`src/popup/`)
- Manages BYOK credentials securely via `chrome.storage.local`.
- Enables switching active provider (Google Gemini, OpenAI, Perplexity).
- Allows clearing local cache, viewing recent checks, and exporting records to `community-db`.

---

## ⚡ End-to-End Data Flow

The following sequence details what happens when a user clicks **"🛡️ Verify"**:

```
User Tab (DOM)            Content Script           Background Worker             LLM Provider API
      │                          │                         │                            │
      │ 1. Click "🛡️ Verify"    │                         │                            │
      ├─────────────────────────▶│                         │                            │
      │                          │ 2. Extract Identity     │                            │
      │                          │    (handle, bio, etc.)  │                            │
      │                          │                         │                            │
      │                          │ 3. Send Message         │                            │
      │                          │    "VERIFY_CREATOR"     │                            │
      │                          ├────────────────────────▶│                            │
      │                          │                         │ 4. Read Cache              │
      │                          │                         │    (chrome.storage.local)  │
      │                          │                         │                            │
      │                          │                         │ 5. [Cache Miss]            │
      │                          │                         │    Build Master Prompt     │
      │                          │                         │    & Grounding Query       │
      │                          │                         │                            │
      │                          │                         │ 6. POST /v1beta/models...  │
      │                          │                         │    (with search tool)      │
      │                          │                         ├───────────────────────────▶│
      │                          │                         │                            │
      │                          │                         │ 7. Perform Web Search      │
      │                          │                         │    (Cross-ref registries)  │
      │                          │                         │                            │
      │                          │                         │ 8. Return JSON Report      │
      │                          │                         │◀───────────────────────────┤
      │                          │                         │                            │
      │                          │                         │ 9. Validate Schema         │
      │                          │                         │    & Write to Local Cache  │
      │                          │                         │                            │
      │                          │ 10. Return Report       │                            │
      │                          │◀────────────────────────┤                            │
      │                          │                         │                            │
      │ 11. Render Result Modal  │                         │                            │
      │     & Update Badge       │                         │                            │
      │◀─────────────────────────┤                         │                            │
```

---

## 🕵️ Platform Extraction & SPA Navigation Strategy

Modern social media platforms are Single Page Applications (SPAs) built with React (X/Twitter), Polymer/Web Components (YouTube), and custom virtual DOM frameworks (TikTok). Standard DOMContentLoaded listeners are insufficient because pages mutate dynamically without full HTTP reloads.

### 1. SPA Detection Architecture
ExpertSeal combines three detection strategies:
- **`chrome.webNavigation.onHistoryStateUpdated`** (in Service Worker): Informs the content script whenever `pushState` or `replaceState` updates the browser URL.
- **`MutationObserver`** (in Content Script): Watches for critical header elements (channel banners, profile headers, tweet headers). Throttled via `requestAnimationFrame` and debounced to prevent CPU spikes.
- **URL Path Heuristics**: Distinguishes creator profile pages (e.g. `x.com/username`, `youtube.com/@channel`) from irrelevant feeds (e.g. `x.com/home`, `youtube.com/feed/subscriptions`).

### 2. Platform Selector Catalog

| Platform | Handle Selector | Display Name Selector | Bio / Claim Selector |
|---|---|---|---|
| **YouTube** | `ytd-channel-name yt-formatted-string`, `yt-page-header-renderer .yt-core-attributed-string` | `#channel-name #text`, `ytd-page-header-renderer h1` | `#channel-tagline`, `#description-container yt-formatted-string` |
| **TikTok** | `[data-e2e="user-title"]`, `h1[data-e2e="user-subtitle"]` | `[data-e2e="user-subtitle"]`, `h2[data-e2e="user-title"]` | `[data-e2e="user-bio"]` |
| **X (Twitter)**| `[data-testid="UserName"] div > span:last-child`, `div[dir="ltr"] > span` | `[data-testid="UserName"] span > span` | `[data-testid="UserDescription"]` |

*Fallbacks include checking OpenGraph meta tags (`<meta property="og:title">`), Twitter cards, and Schema.org microdata embedded in the document head.*

---

## 🤖 LLM Agent & Search Grounding Engine

ExpertSeal uses a **grounded reasoning pipeline**. The LLM is strictly instructed to act as a forensic credential auditor, cross-referencing public authoritative registries before reaching a verdict.

### 1. Master System Prompt Design
The core prompt instructs the model to:
- Identify explicit professional claims made in the bio or content (e.g. "Board Certified Cardiologist", "Licensed Attorney", "Professor of Finance").
- Formulate search queries for primary authority databases:
  - **Medical/Healthcare**: State Medical Boards (e.g., California Medical Board, General Medical Council), NPI Registry, PubMed, institutional faculty rosters.
  - **Legal**: State Bar Associations, court dockets, law firm directories.
  - **Financial**: FINRA BrokerCheck, SEC IAPD, CFA Institute Member Directory.
  - **Academic**: University department directories, Google Scholar, ORCID registries.
- Apply high confidence standards: If credentials cannot be corroborated in official registries, classify as `INSUFFICIENT_DATA` or `NOT_VERIFIED` rather than guessing.

### 2. Supported Provider Adapters

```
                  ┌──────────────────────────────────────────────┐
                  │           BaseProviderAdapter                │
                  │   - verifyCreator(identity): Promise<Report> │
                  │   - validateApiKey(key): Promise<boolean>    │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┼────────────────────────┐
                 ▼                       ▼                        ▼
      ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
      │    GeminiAdapter     ││    OpenAIAdapter     ││  PerplexityAdapter   │
      │ - Google Search Tool ││ - Responses / Search ││ - Sonar Online Model │
      │ - JSON Schema Output ││ - Structured Outputs ││ - Citation Extraction│
      └──────────────────────┘└──────────────────────┘└──────────────────────┘
```

#### Provider Specifics:
1. **Google Gemini (Recommended)**:
   - Uses `gemini-1.5-flash` or `gemini-1.5-pro`.
   - Leverages native **Google Search Grounding** (`tools: [{ googleSearch: {} }]`).
   - Free tier provides generous RPM/TPM limits ideal for personal browsing.
2. **Perplexity AI**:
   - Uses `sonar` or `sonar-pro` models with built-in search synthesis and automatic citation extraction.
3. **OpenAI**:
   - Uses `gpt-4o` with integrated Web Search tool support and JSON schema enforcement (`response_format: { type: "json_object" }`).

---

## 💾 Caching & State Architecture

To prevent unnecessary API costs and minimize latency, ExpertSeal implements a rigorous multi-tier caching model.

### Storage Scheme (`chrome.storage.local`)
All cached verifications use a deterministic hash key:
```typescript
Key: `es_cache:${platform}:${handle.toLowerCase()}`
```

### Stored Record Schema
```typescript
interface CachedRecord {
  key: string;               // e.g. "es_cache:youtube:@hubermanlab"
  timestamp: number;         // Unix timestamp (ms)
  ttl: number;               // Milliseconds until stale (default 30 days)
  data: VerificationReport;  // Normalized verification payload
}
```

### Invalidation & Refresh Policy
- **TTL Expiration**: Records default to a 30-day freshness window. Credentials rarely change within days, but certifications can expire.
- **Manual Force-Refresh**: Users can click **"Re-Verify"** inside the report modal to bypass local cache and query the LLM fresh.
- **LRU Eviction**: If cache volume exceeds 5MB (Chrome storage quota safety margin), the oldest 20% of entries are pruned automatically.

---

## 🛡️ Security & Isolation Model

Browser extensions that inject code into third-party websites operate in hostile runtime environments. ExpertSeal enforces defense-in-depth:

```
┌────────────────────────────────────────────────────────┐
│ Host Page (youtube.com / x.com / tiktok.com)           │
│ - Untrusted scripts, tracking ads, third-party code    │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │ #expertseal-shadow-root (Closed Shadow DOM)    │   │
│   │                                                │   │
│   │   [ CSS Reset: all: initial ]                  │   │
│   │   - Protected from host CSS cascade            │   │
│   │   - Host JS cannot access `shadowRoot`         │   │
│   │   - All innerHTML sanitized via DOMPurify      │   │
│   │                                                │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

1. **Closed Shadow DOM**: The extension badge and report drawer are attached via `element.attachShadow({ mode: 'closed' })`. This prevents page scripts from hijacking extension UI elements or reading displayed verification records.
2. **HTML Sanitization**: All text returned from LLM providers is treated as untrusted user input and sanitized with strict HTML escaping before insertion into the DOM.
3. **Zero Third-Party Exfiltration**:
   - API keys are stored exclusively in `chrome.storage.local`.
   - Keys are **never** synced via `chrome.storage.sync` to prevent inadvertent cloud synchronization.
   - API calls are initiated exclusively from the isolated Background Service Worker directly to `googleapis.com`, `api.openai.com`, or `api.perplexity.ai`.
4. **Manifest V3 Strict CSP**: No `eval()`, no remote code loading, no dynamic script tags (`<script src="...">`).

---

## 🔮 Future: Community DB & Trust Layer Architecture

The ultimate vision for ExpertSeal extends beyond individual local browsing sessions:

```
[ User Browser (Local BYOK) ]
              │
              │ (Opt-in Verification Share)
              ▼
[ Git-Backed Open Ledger (community-db) ]
              │
              │ (Automated GitHub Actions CI Verification)
              ▼
[ Decentralized CDN Cache (Cloudflare Pages / IPFS) ]
              │
              ├──────────────────────────────────┐
              ▼                                  ▼
[ ExpertSeal Global Zero-Token Read ]    [ Enterprise Trust Layer API ]
(Instant badges for 10M+ users)         (Platforms, Search Engines, News aggregators)
```

1. **Distributed Public Cache**: Popular creators (e.g. top 100,000 channels across YouTube, TikTok, X) are verified once and distributed via static JSON endpoints globally.
2. **Consensus Verification**: Multiple users verifying the same creator cross-validate findings; if conflicting verdicts arise, the entry is flagged for human or multi-agent review.
3. **B2B Trust Layer API**: Social platforms and comment engines can integrate ExpertSeal's verification endpoint to combat health and financial fraud programmatically.
