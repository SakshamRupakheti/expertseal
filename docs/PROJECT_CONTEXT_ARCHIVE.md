> Historical project context supplied by the author. This archive contains design intentions and illustrative snippets, some of which differ from the checked-in implementation. See [publication review](PUBLICATION_REVIEW.md) for the code review findings. Example credentials and performance claims below have not been independently verified.
🛡️ ExpertSeal: Complete Chat Context, Workflow, Data & Code Archive

This document serves as the comprehensive archive of the entire conversation, design decisions, architectural workflow, data schemas, and codebase for ExpertSeal (v1.0.0).

1. Executive Summary & Genesis Context
1.1 The Original User Ideas & Problem Statement
Initial Concept (Request 1): The user initially proposed building a new social media network dedicated to experts—"TikTok for experts", or "Reddit where people are verified and real identity is known." Experts could post video answers, and beginners could ask niche questions.
The Strategic Pivot (Request 2 & 3):
Building and bootstrapping a two-sided social network is notoriously slow, costly, and difficult due to cold-start network effects.
Instead of building another isolated silo, the user proposed building a "firewall between the user and online unverified information"—a trust layer that operates directly where users already spend time (YouTube, TikTok, X).
Long-term strategic goal: The user envisioned that once this trust layer gains traction and creator verification data, it can be open-sourced to build virality and credibility, or licensed/sold to platforms like Meta, TikTok, or X who struggle with trust & safety.
Key Non-Negotiables & Constraints:
Zero Operating Cost ($0 hosting): No continuous servers, no scraping backend, no subscription infrastructure.
BYOK (Bring Your Own Key): Users provide their own API key (Gemini Free Tier, OpenAI, or Perplexity).
On-Demand Only: Verification runs strictly when the user clicks "Verify" on a specific creator. No automatic background scraping that exhausts API quotas.
Open Source: MIT licensed, hosted on GitHub with structured contribution guides, issue templates, and community verification registries.
Privacy-First: Keys and browsing history remain local to the user's browser (chrome.storage).
2. End-to-End System Workflow
2.1 High-Level Architecture Flowchart
2.2 User Interaction Workflow
Installation & Setup:
User installs unpacked extension from chrome://extensions.
User clicks the extension popup icon.
User selects an AI provider (e.g., Google Gemini) and inputs their API key.
Key is securely saved to chrome.storage.sync.
Browsing:
As the user browses YouTube video pages/channels, TikTok creator profiles/videos, or X profiles/posts, a lightweight MutationObserver with debounce monitors DOM changes.
When a creator profile element is found, ExpertSeal injects an unobtrusive emerald badge: 🛡️ Verify.
Verification:
The user clicks Verify.
An animated loading spinner appears inside the button.
The background script queries the LLM with live search grounding to vet the creator's real-world credentials against institutional registries.
Within 2-4 seconds, a glassmorphic floating overlay card slides in displaying:
Verification Status: VERIFIED_EXPERT (Emerald), NOT_VERIFIED (Rose), INCONCLUSIVE (Amber), or ERROR (Gray).
Confidence Score: e.g., 92%.
Primary Field / Niche: e.g., "Cardiology & Internal Medicine".
Credentials List: Institutional affiliations, degrees, board licenses, NPI numbers.
Citations / Verification Sources: Direct URLs to verifiable profiles (LinkedIn, hospital pages, state registers).
Warning Signals / Red Flags: Any undisclosed sponsored promotions, disciplinary actions, or dubious claims.
3. Data Models & Specifications
3.1 Settings Schema (chrome.storage.sync)
json
{
  "provider": "gemini", // "gemini" | "openai" | "perplexity"
  "apiKey": "AIzaSy...", // Unified API key
  "geminiApiKey": "AIzaSy...",
  "openaiApiKey": "sk-...",
  "perplexityApiKey": "pplx-...",
  "verificationsCount": 14,
  "lastVerifiedAt": 1731618000000
}
3.2 Cache Schema (chrome.storage.local)

Key pattern: cache_{platform}_{normalized_handle} (e.g. cache_youtube_hubermanlab)

json
{
  "creator": {
    "handle": "hubermanlab",
    "name": "Andrew Huberman",
    "platform": "youtube",
    "url": "https://www.youtube.com/@hubermanlab"
  },
  "verdict": "VERIFIED_EXPERT",
  "confidenceScore": 95,
  "niche": "Neuroscience & Neurobiology",
  "credentials": [
    {
      "type": "degree",
      "title": "Ph.D. in Neuroscience",
      "institution": "University of California, Davis",
      "year": 2004,
      "verified": true
    },
    {
      "type": "position",
      "title": "Tenured Professor of Neurobiology and Ophthalmology",
      "institution": "Stanford University School of Medicine",
      "verified": true
    }
  ],
  "institutionalAffiliations": ["Stanford University School of Medicine"],
  "independentProfiles": [
    { "type": "academic", "url": "https://profiles.stanford.edu/andrew-huberman" },
    { "type": "pubmed", "url": "https://pubmed.ncbi.nlm.nih.gov/?term=Huberman+AD" }
  ],
  "redFlags": [],
  "summary": "Tenured professor of neurobiology at Stanford School of Medicine with extensive peer-reviewed publications.",
  "timestamp": 1731618000000,
  "expiresAt": 1734210000000
}
3.3 The Master Verification Prompt Specification

The prompt instructs the AI to operate as an objective institutional credential verification agent.

Primary Objective: Look past social follower counts and vanity badges. Search for primary source records:
Medical: State licensing boards, NPI registry (npiregistry.cms.hhs.gov), AMA, PubMed.
Legal: State Bar associations, Martindale-Hubbell.
Financial: FINRA BrokerCheck, SEC IAPD, CFA Institute.
Academic / Scientific: University faculty pages, Google Scholar, ORCID, ResearchGate.
Engineering / Tech: IEEE, ACM, patent registries, verified GitHub/open source contributions.
Strict JSON Output Constraint: AI returns zero conversational preamble or markdown codeblocks—only pure parsed JSON conforming to the output schema.
4. Codebase Architecture & File Inventory

The complete codebase consists of 24 files located at C:\Users\saksh\.gemini\antigravity\scratch\expertseal\.

expertseal/
├── manifest.json                     # Chrome Manifest V3 configuration
├── ARCHITECTURE.md                   # Full system architecture documentation
├── CONTRIBUTING.md                   # Open-source contribution guidelines
├── README.md                         # Comprehensive GitHub repository README
├── LICENSE                           # MIT License
├── CODE_OF_CONDUCT.md                # Contributor Covenant v2.1
├── .gitignore                        # Git ignore patterns
│
├── background/
│   └── service-worker.js             # 816 lines: Master prompt, 3 LLM clients, cache & routing
│
├── content/
│   ├── content.js                    # 759 lines: Platform detection, DOM scraping, UI injection
│   └── content.css                   # 559 lines: Isolated CSS with es- prefix, glassmorphic styling
│
├── popup/
│   ├── popup.html                    # 218 lines: Settings UI with SVG shield, provider cards
│   ├── popup.css                     # Glassmorphic dark theme CSS
│   └── popup.js                      # Popup controller, key encryption & cache manager
│
├── lib/
│   ├── prompt.js                     # Master prompt reference and documentation
│   ├── platforms.js                  # Platform DOM selector matrix & extraction rules
│   └── cache.js                      # Local storage caching algorithms and TTL logic
│
├── icons/
│   ├── icon16.png                    # 16x16 extension icon
│   ├── icon48.png                    # 48x48 extension icon
│   └── icon128.png                   # 128x128 extension icon
│
├── community-db/
│   ├── README.md                     # Community database submission format
│   └── verified/.gitkeep             # Directory placeholder for community verified profiles
│
└── .github/
    ├── PULL_REQUEST_TEMPLATE.md      # Pull request checklist
    └── ISSUE_TEMPLATE/
        ├── bug_report.md             # Bug reporting template
        └── feature_request.md        # Feature request template
5. Key Code Highlights
5.1 manifest.json (Manifest V3)
json
{
  "manifest_version": 3,
  "name": "ExpertSeal - Creator Credential Verifier",
  "version": "1.0.0",
  "description": "Verify the real-world credentials of online experts and creators on YouTube, TikTok, and X using grounded AI.",
  "permissions": ["storage"],
  "host_permissions": [
    "https://*.youtube.com/*",
    "https://*.tiktok.com/*",
    "https://*.twitter.com/*",
    "https://*.x.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.openai.com/*",
    "https://api.perplexity.ai/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.youtube.com/*",
        "https://*.tiktok.com/*",
        "https://*.twitter.com/*",
        "https://*.x.com/*"
      ],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
5.2 Gemini Grounded Search Call (background/service-worker.js)
javascript
async function callGemini(apiKey, creatorInfo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const prompt = buildVerificationPrompt(creatorInfo);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }], // Live web search grounding
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });
  // Parses response, normalizes JSON, saves to cache, returns result
}
6. Git Status & Repository Publish Instructions
Current Git Status: Committed locally on master (6678342).
Remote Repository: To push to GitHub:
powershell
cd C:\Users\saksh\.gemini\antigravity\scratch\expertseal
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/expertseal.git
git branch -M main
git push -u origin main