# 🤝 Contributing to ExpertSeal

First off, thank you for considering contributing to **ExpertSeal**! 🎉

Misinformation on social media is at an all-time high. Algorithmic feeds elevate self-proclaimed "gurus," "doctors," and "wealth managers" whose primary qualification is often just a verified subscription badge. By contributing to ExpertSeal, you are helping build an open, decentralized public good that restores accountability to the internet.

---

## 🧭 Table of Contents
1. [Core Principles](#-core-principles)
2. [Ways to Contribute](#-ways-to-contribute)
3. [Local Development Setup](#-local-development-setup)
4. [Code Style & Standards](#-code-style--standards)
5. [Step-by-Step: Adding a New Platform](#-step-by-step-adding-a-new-platform)
6. [Step-by-Step: Adding a New LLM Provider](#-step-by-step-adding-a-new-llm-provider)
7. [Submitting a Pull Request (PR)](#-submitting-a-pull-request-pr)
8. [Code of Conduct](#-code-of-conduct)

---

## 🎯 Core Principles

Before writing code, keep ExpertSeal's core philosophy in mind:
- **100% Free & Open Source**: No paywalls, subscription models, or premium pay-to-verify tiers for end users.
- **BYOK (Bring Your Own Key)**: Users bring their own LLM API keys (Gemini, OpenAI, Perplexity). We run zero intermediary servers.
- **On-Demand Only**: No continuous background scraping, no background network beacons, and no tracking cookies. The extension activates only when the user deliberately clicks "Verify".
- **Zero Telemetry**: We do not collect user habits, search history, or personal identifiers.
- **Vanilla & Lightweight**: We avoid heavy frameworks (React, Angular) inside injected content scripts to keep bundle size tiny (<200KB) and DOM performance instantaneous.

---

## 💡 Ways to Contribute

You don't need to be an expert in Chrome extensions or AI to contribute! Here are several ways you can help:

| Area | Description |
|---|---|
| **🐛 Bug Reports** | Find an issue with DOM selectors, page navigation, or LLM parsing? [Open a Bug Report](.github/ISSUE_TEMPLATE/bug_report.md). |
| **✨ Feature Requests** | Have an idea for a new platform, UX improvement, or provider? [Open a Feature Request](.github/ISSUE_TEMPLATE/feature_request.md). |
| **🌐 Add a Platform** | Expand ExpertSeal to Instagram, LinkedIn, Threads, Substack, Reddit, or Bluesky. |
| **🤖 Add an LLM Provider** | Add support for Claude, Groq, Ollama / Local LLMs, or Mistral. |
| **🗄️ Community Database** | Submit verified creator profiles to [`community-db/`](community-db/README.md) to build our crowdsourced public cache. |
| **📖 Documentation** | Improve guides, fix typos, write tutorials, or add translations for non-English users. |

---

## 🛠️ Local Development Setup

ExpertSeal requires no complex build step or transpiler for basic development. It runs pure, modern ES modules directly in Chromium-based browsers.

### Prerequisites
- Google Chrome, Brave, Arc, or Microsoft Edge (version 116+ supporting Manifest V3)
- Git installed on your machine
- An API key for at least one supported provider:
  - [Google AI Studio](https://aistudio.google.com/) (Gemini - Free)
  - [OpenAI Platform](https://platform.openai.com/)
  - [Perplexity API](https://www.perplexity.ai/settings/api)

### Installation
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/SakshamRupakheti/expertseal.git
   cd expertseal
   ```

2. Open Chrome and navigate to the Extensions management page:
   ```text
   chrome://extensions/
   ```

3. In the top-right corner, toggle **Developer mode** to **ON**.

4. In the top-left corner, click **Load unpacked**.

5. Select the `expertseal` folder (the directory containing `manifest.json`).

6. The **ExpertSeal** shield icon will now appear in your browser toolbar!

### Development Workflow & Live Reload
- When you modify files in `popup/` or `content/`, simply refresh the target social media webpage to load updated content scripts.
- When you modify `background/service_worker.js` or `manifest.json`, go to `chrome://extensions/` and click the **Reload (🔄)** icon on the ExpertSeal card.
- Open Chrome DevTools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`) to inspect console logs and DOM elements.

---

## 🎨 Code Style & Standards

- **Modern JavaScript**: Use clean, modern ECMAScript features (async/await, destructuring, optional chaining, template literals).
- **No Injected Frameworks**: Keep content scripts in lightweight, modular Vanilla JS. Do not inject React or Vue into host pages.
- **Closed Shadow DOM**: Any UI elements injected into external pages (badges, verification cards, modal drawers) MUST use closed Shadow DOM (`attachShadow({ mode: 'closed' })`) to guarantee CSS style isolation and security.
- **Defensive Error Handling**: Assume DOM elements may be missing or altered at any time by platform A/B tests. Never allow an uncaught exception in a content script to break host page functionality.
- **Strict Linting**: Indent with 2 spaces, use single quotes for JS strings, semicolons required.

---

## 🌐 Step-by-Step: Adding a New Platform

Want to add support for a new social media site (e.g., **Instagram** or **LinkedIn**)?

### Step 1: Update `manifest.json`
Add the target domain to `content_scripts.matches` and `host_permissions`:
```json
{
  "matches": [
    "*://*.instagram.com/*"
  ]
}
```

### Step 2: Create a Platform Extractor
Create a new extractor in `src/content/extractors/instagram.js` inheriting from `BaseExtractor`:

```javascript
import { BaseExtractor } from './base.js';

export class InstagramExtractor extends BaseExtractor {
  static matches(url) {
    return /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+/.test(url);
  }

  getPlatformName() {
    return 'instagram';
  }

  extractIdentity() {
    const handleElement = document.querySelector('header h2, header h1');
    const handle = handleElement ? handleElement.textContent.trim() : null;

    const bioElement = document.querySelector('header section > div:last-child');
    const bio = bioElement ? bioElement.textContent.trim() : '';

    if (!handle) return null;

    return {
      platform: 'instagram',
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      displayName: document.querySelector('header h1')?.textContent?.trim() || handle,
      profileUrl: window.location.href.split('?')[0],
      bioText: bio,
      claimedDomain: this.inferClaimedDomain(bio)
    };
  }

  getBadgeMountPoint() {
    // Return DOM node where the "🛡️ Verify" badge should be prepended/appended
    return document.querySelector('header section > div');
  }
}
```

### Step 3: Register in Extractor Registry
In `src/content/extractors/index.js`, import and register your new extractor:
```javascript
import { InstagramExtractor } from './instagram.js';

export const EXTRACTORS = [
  YouTubeExtractor,
  TikTokExtractor,
  TwitterExtractor,
  InstagramExtractor // <-- Add here
];
```

### Step 4: Test Profile Scenarios
Test on at least 3 distinct profile types:
1. Standard creator with a filled bio.
2. Verified celebrity with a blue tick.
3. Edge case (long bios, RTL languages, emojis, special characters in handle).

---

## 🤖 Step-by-Step: Adding a New LLM Provider

Want to add another model provider (e.g., **Anthropic Claude** with web search, or **Ollama**)?

### Step 1: Create the Provider Adapter
Create a new file in `src/providers/<provider_name>.js` extending `BaseProvider`:

```javascript
import { BaseProvider } from './base.js';

export class ClaudeProvider extends BaseProvider {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
    this.name = 'claude';
  }

  async validateKey() {
    // Quick test ping to verify user API key works
  }

  async verifyCreator(creatorIdentity) {
    const prompt = this.buildPrompt(creatorIdentity);
    
    // Call Provider API with web search capabilities enabled
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    return this.normalizeResponse(data);
  }
}
```

### Step 2: Register Provider in UI & Background Worker
- Update `src/popup/popup.html` to add the provider option to the dropdown.
- Update `src/providers/index.js` to expose the new adapter.
- Ensure the provider's API URL is declared in `host_permissions` in `manifest.json`.

---

## 🚀 Submitting a Pull Request (PR)

1. **Fork the repo** and clone it locally.
2. **Create a branch** for your work:
   ```bash
   git checkout -b feat/add-instagram-extractor
   ```
3. **Commit your changes** with clear, semantic commit messages:
   - `feat: add Instagram profile DOM extractor`
   - `fix: resolve YouTube SPA navigation badge re-render bug`
   - `docs: update setup instructions for Perplexity API key`
4. **Push to your fork**:
   ```bash
   git push origin feat/add-instagram-extractor
   ```
5. **Open a PR** against the `main` branch of `SakshamRupakheti/expertseal`.
6. Fill out all sections of the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
7. Our maintainers will review your PR and provide constructive feedback!

---

## 📜 Code of Conduct

ExpertSeal is an inclusive, welcoming community. All participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any violations or inappropriate behavior to [conduct@expertseal.org](mailto:conduct@expertseal.org).

Thank you for helping keep the internet honest! 🛡️✨
