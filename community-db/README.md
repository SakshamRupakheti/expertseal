# 🌐 ExpertSeal Community Verification Database (`community-db`)

Welcome to the **ExpertSeal Community Database** — an open, decentralized, crowdsourced repository of real-world credential verification reports for social media creators across YouTube, TikTok, and X (Twitter).

---

## 🎯 What is the Community Database?

When an ExpertSeal user triggers a credential lookup using their own LLM API key, ExpertSeal produces a structured, ground-truth-backed verification report.

Because public credentials (board certifications, bar admissions, academic appointments, peer-reviewed publications) rarely change overnight, re-querying an LLM for the exact same creator is redundant. The **Community Database** serves as a **git-backed public cache and open ledger of verified creators**.

- **100% Transparent**: Every record is stored as an auditable JSON file in this repository.
- **Zero Cost for Lookups**: Users who opt into the community cache can check creator credentials instantly with zero API consumption.
- **Peer-Reviewed & Verifiable**: Every submission includes citation links, verification timestamps, and provenance data.

---

## ⚙️ How It Works

```
                                  [ User triggers verification ]
                                               │
                                               ▼
                              [ Local Cache Check (Chrome Storage) ]
                                     │                   │
                            (Found)  │                   │ (Not Found)
                                     ▼                   ▼
                            [ Display Result ]   [ Query Community DB ]
                                                         │
                                        ┌────────────────┴───────────────┐
                                (Found) ▼                                ▼ (Not Found)
                       [ Display Result & Cache ]             [ Run LLM Agent Web Search ]
                                                                         │
                                                                         ▼
                                                              [ Generate JSON Report ]
                                                                         │
                                                                         ▼
                                                       [ Optional: Submit PR to Community DB ]
```

1. **On-Demand Search**: The extension verifies a creator via live web search (medical boards, universities, bar registries, SEC filings, LinkedIn).
2. **Local Preservation**: The verified payload is stored locally in `chrome.storage.local`.
3. **Optional Contribution**: With one click in the extension UI, the user can export the verified JSON payload and open a pull request to this repository.
4. **Automated CI Validation**: A GitHub Actions workflow validates the JSON schema, ensures citations are live, and checks for consensus.
5. **Instant Distribution**: Once merged, all ExpertSeal users benefit from instant, zero-token verifications!

---

## 📂 Directory Structure & Naming Conventions

Verified reports live in the `verified/` folder, organized by platform and creator handle:

```
community-db/
├── README.md
└── verified/
    ├── youtube/
    │   ├── @hubermanlab.json
    │   └── @aliabdaal.json
    ├── tiktok/
    │   └── @dr.karanr.json
    └── x/
        └── @peterattiamd.json
```

### File Naming Convention
- Directory name: Platform identifier (`youtube`, `tiktok`, `x`).
- File name: Canonical handle with leading `@` symbol + `.json` (e.g. `@handle.json`). Handles should be lowercase.

---

## 📋 Data Format & Schema Specification

Every verification record strictly conforms to the JSON schema below:

```json
{
  "$schema": "https://expertseal.org/schemas/v1/verification.json",
  "version": "1.0.0",
  "creator": {
    "platform": "youtube",
    "handle": "@hubermanlab",
    "displayName": "Andrew Huberman",
    "profileUrl": "https://www.youtube.com/@hubermanlab",
    "claimedDomain": "Neurobiology, Ophthalmology, Health & Fitness"
  },
  "verification": {
    "status": "VERIFIED_EXPERT",
    "confidenceScore": 0.96,
    "summary": "Tenured Associate Professor of Neurobiology and Ophthalmology at Stanford University School of Medicine. Ph.D. in Neuroscience from UC Davis.",
    "verifiedAt": "2026-11-13T00:00:00Z",
    "verifiedByModel": "gemini-1.5-pro",
    "agentVersion": "0.1.0"
  },
  "credentials": [
    {
      "type": "ACADEMIC_APPOINTMENT",
      "title": "Associate Professor of Neurobiology",
      "institution": "Stanford University School of Medicine",
      "status": "CONFIRMED",
      "evidenceUrl": "https://med.stanford.edu/profiles/andrew-huberman",
      "notes": "Faculty profile active and confirmed."
    },
    {
      "type": "DEGREE",
      "title": "Ph.D. in Neuroscience",
      "institution": "University of California, Davis",
      "status": "CONFIRMED",
      "evidenceUrl": "https://ucdavis.edu",
      "notes": "Dissertation completed 2004."
    }
  ],
  "disclaimers": [
    "Expertise applies strictly to neuroscience and ophthalmology; general health advice should be confirmed with a personal physician."
  ],
  "verificationAudit": {
    "searchedRegistries": [
      "Stanford Faculty Directory",
      "PubMed Author Search",
      "California Medical Board (not an MD)"
    ],
    "discrepanciesFound": []
  }
}
```

### Possible `status` Values
| Status | Meaning |
|---|---|
| `VERIFIED_EXPERT` | Creator possesses authentic, verifiable credentials in their claimed domain. |
| `NOT_VERIFIED` | Claims could not be validated or contradict public registries (e.g., claiming to be a licensed MD without board registry). |
| `INSUFFICIENT_DATA` | Public records are inconclusive, ambiguous, or the creator uses a pseudonym that cannot be tied to an individual. |

---

## 🤝 How to Contribute a Verification

Want to add a verified creator to the database? Follow these simple steps:

1. **Run ExpertSeal**: Navigate to the creator's profile page on YouTube, TikTok, or X. Click the **🛡️ Verify** button.
2. **Review Output**: Carefully inspect the generated credentials, citations, and evidence URLs. Make sure the links are accurate and reputable (e.g., `.edu`, `.gov`, official state licensing portals).
3. **Export JSON**: In the ExpertSeal popup or report modal, click **"Export for Community DB"**.
4. **Fork & Branch**: Fork the `expertseal` repository and create a new branch:
   ```bash
   git checkout -b add-creator-youtube-hubermanlab
   ```
5. **Place File**: Save the file under `community-db/verified/<platform>/<@handle>.json`.
6. **Submit PR**: Open a Pull Request titled `feat(community-db): verify <platform>/<@handle>`. Include a brief note with primary evidence URLs.

---

## 🔒 Privacy & Ethical Guidelines

- **Public Figures Only**: We only accept verifications for public creator channels with >1,000 followers or those publicly providing medical, financial, or legal advice.
- **Zero PII Leakage**: Never submit personal home addresses, private phone numbers, or unredacted personal identification numbers. Only include publicly published professional registries.
- **Zero User Telemetry**: Submissions are strictly manual and opt-in. The extension will **never** transmit verification reports without your explicit manual action.

---

## 🚀 The Future: The Global Trust Layer

Today, this database serves as a transparent, open-source Git cache for the browser extension.

In the future, the Community Database will power:
1. **The ExpertSeal Trust Layer API**: A decentralized, low-latency API enabling platforms, comment sections, and aggregators to display credential badges automatically.
2. **Platform Enterprise Licensing**: Licensing high-integrity verification datasets to social platforms seeking automated compliance with misinformation policies.
3. **Web of Trust Consensus**: Multi-signature attestations by certified domain specialists to build the definitive registry of online authority.
