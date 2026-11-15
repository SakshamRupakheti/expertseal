> **Prototype status:** This is the initial source snapshot, not a validated production release. LinkedIn API integration is not implemented. Read the [publication review](docs/PUBLICATION_REVIEW.md) for known gaps and the [original project archive](docs/PROJECT_CONTEXT_ARCHIVE.md) for design context. Existing feature, privacy, pricing, and performance claims below should be treated as historical project documentation pending validation.
<div align="center">

# 🛡️ ExpertSeal

### **Real-world credential verification for the social media age.**

*Because an \$8 blue check doesn't mean they know what they're talking about.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-blue.svg)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-orange.svg)](ARCHITECTURE.md)
[![Cost: 100% Free (BYOK)](https://img.shields.io/badge/Cost-100%25%20Free%20%28BYOK%29-brightgreen.svg)](#-supported-providers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/SakshamRupakheti/expertseal?style=social)](https://github.com/SakshamRupakheti/expertseal/stargazers)

<br/>

> **"A browser extension that verifies the real-world credentials of content creators — because a blue check doesn't mean they know what they're talking about."**

<br/>

[Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Supported Providers](#-supported-providers) • [Supported Platforms](#-supported-platforms) • [Architecture](ARCHITECTURE.md) • [Community DB](community-db/README.md)

</div>

---

## 📑 Table of Contents
- [🚨 The Problem](#-the-problem)
- [💡 The Solution](#-the-solution)
- [🎬 Demo & Previews](#-demo--previews)
- [✨ How It Works](#-how-it-works)
- [🚀 Quick Start (5 Minutes)](#-quick-start-5-minutes)
- [🤖 Supported Providers](#-supported-providers)
- [🌐 Supported Platforms](#-supported-platforms)
- [🔬 How Verification Works (The Master Prompt Engine)](#-how-verification-works-the-master-prompt-engine)
- [🔒 Privacy & Security (Zero-Telemetry & BYOK)](#-privacy--security-zero-telemetry--byok)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [⭐ Star History](#-star-history)
- [❤️ Built with Purpose](#️-built-with-purpose)

---

## 🚨 The Problem

Every single day, millions of people make life-altering decisions based on advice seen on TikTok, YouTube, and X (Twitter).
- **Crypto & Finance "Gurus"** promote dubious tokens while claiming to be seasoned hedge fund managers with zero SEC or FINRA registrations.
- **Self-Proclaimed Health "Experts"** dispense dangerous medical protocols without a medical license, board certification, or clinical training.
- **The \$8 Verification Illusion**: Anyone can buy a blue verification checkmark for a few dollars a month, creating a false veneer of authority that misleads everyday people.

Social algorithms prioritize sensationalism over scientific accuracy, and platforms have little incentive to fact-check the background credentials of high-engagement creators.

---

## 💡 The Solution

**ExpertSeal** is an open-source, on-demand Chrome extension that acts as your personal forensic credential auditor.

With a single click on any creator's profile or video, an autonomous AI research agent cross-references public, authoritative registries — including **State Medical Boards, Bar Associations, University Faculty Rosters, FINRA BrokerCheck, PubMed, and SEC filings** — to verify if the creator is genuinely qualified.

```
┌───────────────────────────┐      1. User Clicks       ┌───────────────────────────────┐
│ Creator Profile           │──────────────────────────▶│ ExpertSeal Local Content      │
│ (YouTube / TikTok / X)    │      "🛡️ Verify"          │ Script & Extractor            │
└───────────────────────────┘                           └───────────────┬───────────────┘
                                                                        │ 2. Extracts Identity
                                                                        ▼
┌───────────────────────────┐      4. Live Search       ┌───────────────────────────────┐
│ Authoritative Registries  │◀──────────────────────────│ LLM Agent Grounding Engine    │
│ • State Medical Boards    │──────────────────────────▶│ (Gemini / Perplexity / OpenAI) │
│ • State Bar Registries    │      5. Evidence Gathered └───────────────┬───────────────┘
│ • University Directories  │                                           │ 3. Master Prompt
│ • FINRA / SEC Filings     │                                           │
└───────────────────────────┘                                           ▼
                                                        ┌───────────────────────────────┐
                                                        │ Instant Credential Verdict    │
                                                        │ ✅ VERIFIED EXPERT            │
                                                        │ ❌ NOT VERIFIED               │
                                                        │ ⚠️ INSUFFICIENT DATA          │
                                                        └───────────────────────────────┘
```

- **Zero Cost & Free Forever**: No subscriptions. Bring Your Own Key (BYOK) with generous free tiers from Google Gemini.
- **On-Demand Only**: Zero background tracking. It runs only when you click "Verify".
- **Completely Private**: Keys and results stay 100% in your local browser storage.

---

## 🎬 Demo & Previews

<!-- TODO: Add animated GIF showing "Verify" button click on YouTube channel and modal report pop-up -->
```
┌────────────────────────────────────────────────────────────────────────┐
│  Andrew Huberman  ✓                                    [ 🛡️ Verify ]   │
│  @hubermanlab • 5.8M subscribers • 240 videos                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🛡️ EXPERTSEAL VERIFICATION REPORT                                │  │
│  │ Status: ✅ VERIFIED EXPERT (Confidence: 96%)                      │  │
│  │ Domain: Neurobiology & Ophthalmology                             │  │
│  │                                                                  │  │
│  │ Confirmed Credentials:                                           │  │
│  │ • Associate Professor of Neurobiology, Stanford University Med   │  │
│  │ • Ph.D. in Neuroscience, University of California, Davis (2004)  │  │
│  │ • 100+ Peer-Reviewed Publications indexed on PubMed             │  │
│  │                                                                  │  │
│  │ Primary Evidence:                                                │  │
│  │ 🔗 med.stanford.edu/profiles/andrew-huberman                     │  │
│  │ 🔗 pubmed.ncbi.nlm.nih.gov/?term=Huberman+AD                    │  │
│  │                                                                  │  │
│  │ [ Cached Locally ] [ Export to Community DB ] [ Close ]          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```
> *<!-- TODO: Replace ASCII mockup above with `assets/demo.gif` once extension screenshot suite is recorded. -->*

---

## ✨ How It Works

Using ExpertSeal is as simple as 1-2-3:

1. **Browse as Usual** 📱  
   Explore your feeds on **TikTok, YouTube, or X** without any changes to your normal browsing habits.
2. **Spot an "Expert" & Click 🛡️ Verify** 🔍  
   When a creator gives legal, medical, or financial advice, tap the discreet **"🛡️ Verify"** badge injected right next to their channel name or profile header.
3. **Live Forensic Registry Search** 🏛️  
   ExpertSeal's AI agent deploys live web searches against university faculty directories, state licensing portals, medical boards, bar associations, and official publications.
4. **Get a Ground-Truth Verdict** 📊  
   Within seconds, receive a transparent report:
   - ✅ **Verified Expert**: Confirmed licenses, faculty positions, or terminal degrees in their stated field.
   - ❌ **Not Verified**: Claims contradicted by public registries (e.g. claiming to be an active MD with no medical license).
   - ⚠️ **Insufficient Data**: Unverifiable pseudonym, hobbyist creator, or ambiguous public records.
5. **Verify Once, Trust Forever** ⚡  
   Results are stored in your local browser cache. Future visits to the same creator load instantly with zero API calls.

---

## 🚀 Quick Start (5 Minutes)

You can install and run ExpertSeal in minutes without any compilation or developer tooling.

### Step 1: Clone or Download this Repo
```bash
git clone https://github.com/SakshamRupakheti/expertseal.git
```
*(Or click **Code > Download ZIP** and unzip it to a folder on your computer.)*

### Step 2: Load Unpacked in Chrome
1. In Google Chrome (or Brave, Edge, Arc), go to:
   ```text
   chrome://extensions/
   ```
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. In the top-left corner, click **Load unpacked**.
4. Select the `expertseal` folder (the folder containing `manifest.json`).

### Step 3: Add Your Free API Key
1. Click the **ExpertSeal (🛡️)** icon in your browser toolbar or extensions puzzle menu.
2. Select **Google Gemini** (Recommended — 100% Free tier).
3. Paste your API key obtained for free at [Google AI Studio](https://aistudio.google.com/app/apikey).
4. Click **Save Configuration**.

### Step 4: Verify Your First Creator!
Open any creator page on [YouTube](https://www.youtube.com), [TikTok](https://www.tiktok.com), or [X](https://x.com) and click **🛡️ Verify**!

---

## 🤖 Supported Providers

ExpertSeal supports the industry's leading LLM providers with live web search capabilities:

| Provider | Model Family | Web Search Grounding | Free Tier Available? | Setup Guide |
|---|---|:---:|:---:|---|
| **Google Gemini** <br>*(Recommended)* | `gemini-1.5-flash` <br> `gemini-1.5-pro` | ✅ Native Google Search | ✅ **Yes (Generous Free Tier)** | [Get Gemini Key](https://aistudio.google.com/app/apikey) |
| **Perplexity AI** | `sonar` <br> `sonar-pro` | ✅ Built-in Live Search | ⚠️ Limited / Paid | [Get Perplexity Key](https://www.perplexity.ai/settings/api) |
| **OpenAI** | `gpt-4o` <br> `gpt-4o-mini` | ✅ Web Search Tool | ❌ Paid API Credits | [Get OpenAI Key](https://platform.openai.com/api-keys) |

> [!TIP]
> **Why Google Gemini is Recommended**: Google AI Studio provides free API keys with up to 15 Requests Per Minute (RPM) and native Google Search grounding at zero cost. For individual personal browsing, you will virtually never hit these limits!

---

## 🌐 Supported Platforms

| Platform | Profile Page Verification | Video / Tweet Inline Badge | Status |
|---|:---:|:---:|:---:|
| **YouTube** | ✅ Supported | ✅ Supported | 🟢 Stable |
| **X (Twitter)** | ✅ Supported | ✅ Supported | 🟢 Stable |
| **TikTok** | ✅ Supported | ✅ Supported | 🟢 Stable |
| **Instagram** | ⏳ In Development | ⏳ In Development | 🟡 [Roadmap](#️-roadmap) |
| **LinkedIn** | ⏳ In Development | ⏳ In Development | 🟡 [Roadmap](#️-roadmap) |

---

## 🔬 How Verification Works (The Master Prompt Engine)

Unlike naive LLM wrappers that simply "ask ChatGPT what it thinks," ExpertSeal utilizes a rigorous, multi-step verification protocol:

```
[ Step 1: Identify Claims ]
• Extracts self-declared credentials from profile bio, banner text, and handle.
• Classifies domain of advice: Medicine, Finance, Law, Science, Nutrition.

[ Step 2: Targeted Grounding Searches ]
• Generates high-precision boolean search operators targeting authoritative sources:
  site:*.gov OR site:*.edu OR site:finra.org OR site:pubmed.ncbi.nlm.nih.gov

[ Step 3: Registry Cross-Referencing ]
• Matches legal full names against active state registers.
• Flags discrepancy between "Ph.D. in Literature" and offering "cardiovascular advice."

[ Step 4: Confidence Scoring & Schema Output ]
• Evaluates primary vs. secondary citations.
• Returns structured JSON with strict schema validation and evidence links.
```

Our master prompt explicitly guards against **hallucinations**: if a credential cannot be corroborated by official sources or primary institutional pages, the model is strictly forbidden from assuming validity and must output `INSUFFICIENT_DATA`.

---

## 🔒 Privacy & Security (Zero-Telemetry & BYOK)

We built ExpertSeal because we value privacy, autonomy, and security.

- **Bring Your Own Key (BYOK)**: Your API key is stored locally in `chrome.storage.local`. It is used exclusively to make direct HTTPS requests to the respective provider (e.g. `generativelanguage.googleapis.com`).
- **Zero Intermediary Servers**: There are no ExpertSeal analytics servers, no tracking beacons, and no middlemen.
- **On-Demand Execution**: ExpertSeal does not crawl or scrape pages in the background. It wakes up only when you press the **Verify** button.
- **Sandboxed UI**: Injected badges and modal dialogs are isolated using **Closed Shadow DOM** (`mode: 'closed'`), shielding your data from third-party scripts on the target webpage.
- **100% Auditable Open Source**: Every line of code is open for review. Inspect the network tab yourself in Chrome DevTools to verify that requests only communicate with your chosen AI provider.

---

## 🗺️ Roadmap

We are moving fast to expand ExpertSeal across the web. Here is our public roadmap:

- [x] Chrome Extension (Manifest V3)
- [x] BYOK multi-provider support (Gemini, Perplexity, OpenAI)
- [x] YouTube, TikTok, and X (Twitter) profile extractors
- [x] Local caching layer in `chrome.storage.local`
- [ ] **Firefox Add-on** (Manifest V3 Firefox port)
- [ ] **Crowdsourced Community Database** ([`community-db/`](community-db/README.md))
- [ ] **Instagram Reels & Profile Support**
- [ ] **LinkedIn Profile Integration** (cross-checking claimed experience against external registries)
- [ ] **Substack & Medium Writer Verification**
- [ ] **Mobile Companion App** (iOS / Android Share Sheet extension)
- [ ] **Enterprise Trust Layer API** (b2b trust layer for platforms and news aggregators)

---

## 🤝 Contributing

We welcome contributions of all shapes and sizes! Whether you want to add a new platform extractor, integrate another LLM provider, or submit verified creator records to our [Community DB](community-db/README.md), check out our comprehensive guide:

👉 **[Read CONTRIBUTING.md](CONTRIBUTING.md)**

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## 📜 License

ExpertSeal is open-source software licensed under the **[MIT License](LICENSE)**.

Copyright (c) 2026 ExpertSeal Contributors.

---

## ⭐ Star History

If you believe the internet needs real-world accountability, please star this repository! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=SakshamRupakheti/expertseal&type=Date)](https://star-history.com/#SakshamRupakheti/expertseal&Date)

---

## ❤️ Built with Purpose

ExpertSeal was created to combat the epidemic of online misinformation and restore transparency to social media.

**Let's build a more truthful internet, together.** 🛡️
