# Local open-source research preview

This optional mode adds SearXNG discovery, public academic lookups, deterministic identity/credential handling, a real MCP stdio server and a loopback companion. Existing providers work without installing it. No paid model API is required. External websites still receive searches and source requests.

## 1. Prepare local search

Use a SearXNG instance you control. Its JSON API must be enabled; arbitrary public instances are not supported defaults. See the official [container guide](https://docs.searxng.org/admin/installation-docker.html) and [search API](https://docs.searxng.org/dev/search_api.html).

On the development machine, WSL 3.0.5, Ubuntu and Docker were installed with the operator's administrator consent. The official SearXNG container returned JSON successfully from Windows on November 17, 2026. The instructions below are for a new installation; no restart was initiated during this setup.

Open **PowerShell as Administrator**, then run:

```powershell
wsl --install -d Ubuntu
```

Follow [Microsoft's installation steps](https://learn.microsoft.com/en-us/windows/wsl/install), restart if Windows asks, and open Ubuntu once to create your Linux username/password. Do this yourself; do not share the password.

Inside Ubuntu, change to this checkout's `companion/searxng` directory and run:

```sh
bash setup-wsl.sh
```

The script installs Ubuntu's Docker package if absent, starts it, generates a private SearXNG secret and runs the official image bound to **127.0.0.1:8080**, not the LAN. It does not overwrite existing configuration. This script completed successfully in Ubuntu WSL. Review the image's current tag/digest for reproducible deployments. Stop it with `sudo docker stop expertseal-searxng`, or from Windows with `wsl -d Ubuntu -u root -- docker stop expertseal-searxng`.

From Windows PowerShell, verify JSON access:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/search?q=searxng&format=json'
```

A `results` array is required. HTML or HTTP 403 means JSON is unavailable. Fix your instance rather than cycling through public instances or bypassing search-engine restrictions. If WSL loopback forwarding is unavailable, repair the WSL networking configuration; do not expose the service on the LAN as a workaround.

## 2. Optional local model

Install [Ollama](https://ollama.com/) and pull the requested model:

```sh
ollama pull qwen3.5:2b
```

This model was downloaded and CPU inference was tested on the development machine. Automatic GPU selection timed out, so the default `ollamaDevice` is `cpu`. Two of three synthetic cases returned accepted statement selections; one proposed the wrong order and safely fell back to deterministic output. A subsequent live discovery report also used an accepted selection. Use `"model": "none"` for faster deterministic output without inference. `qwen3.5:4b` is optional, never an automatic fallback, and has not been evaluated here.

The model uses [structured output](https://docs.ollama.com/capabilities/structured-outputs) to select source-scoped biography passages and canonical statement IDs. The service supplies the exact passage text and URLs. It never accepts new model-written qualifications or citations. This is deliberately constrained extractive summarization, not unrestricted model extraction or factual verification. Model errors fall back to rule-selected quotations with a visible limitation.

## 3. Pair the companion

Load the 2.0 preview unpacked extension from this branch, or its packaged directory. Keep an existing 1.4 installation separate if comparing versions. Copy the extension ID from its Details page.

In PowerShell, from `companion`:

```powershell
npm ci
node setup.js YOUR_EXTENSION_ID
$env:EXPERTSEAL_CONFIG = (Resolve-Path './config.local.json').Path
npm start
```

`setup.js` generates a random token and a private, ignored configuration file. It refuses to overwrite an existing file. The listener binds only to `127.0.0.1:3210`. Leave that terminal open; Ctrl+C stops the companion and MCP child. The companion is not registered as a system service or scheduled task and has no public listener.

For Windows with this Ubuntu setup, use the following instead of `npm start`. It starts the existing container and keeps WSL alive while the companion runs. Without an active WSL process, background containers can stop when WSL becomes idle. The execution-policy setting applies only to this invocation, not the machine policy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-windows.ps1
```

Open the configuration file locally and copy its `token` into ExpertSeal's masked key field after selecting **Local open-source research**. Save and grant the optional loopback permission. The configured `extensionOrigin` must exactly match `chrome-extension://YOUR_EXTENSION_ID`, including when using Edge. Never paste tokens into chat, source files or GitHub.

Configuration fields:

| Field | Meaning |
| --- | --- |
| `searxng` | Your loopback HTTP or self-hosted public HTTPS origin, trailing slash, no embedded credentials |
| `ollama` | Loopback HTTP origin, normally `http://127.0.0.1:11434/` |
| `model` | `none`, `qwen3.5:2b`, or `qwen3.5:4b` |
| `ollamaDevice` | `cpu` (default, tested here) or `auto` (Ollama chooses hardware) |
| `sourceOrigins` | Exact public HTTPS origins approved for HTML collection, with provenance class |
| `openalex` / `openalexKey` | Enable academic discovery; optional free key for your account's quota |
| `orcidToken` | Optional public `/read-public` token; never a member's private-data authorization |

OpenAlex [documents keyless basic use and optional free keys](https://help.openalex.org/api/authentication/). Quotas still apply. ORCID [documents obtaining a public search token](https://info.orcid.org/documentation/api-tutorials/api-tutorial-searching-the-orcid-registry/); review its non-commercial public API terms. Missing tokens or failed sources are disclosed, never replaced with paid services.

## 4. Approve professional source origins

Discovery is enabled immediately, but **source collection starts with an empty allowlist**. Review an institution/employer/portfolio's identity and automated-access terms before adding its exact origin. For example, this fictional configuration illustrates the format, not a recommended real source:

```json
"sourceOrigins": [
  { "origin": "https://university.example", "type": "institutional" },
  { "origin": "https://portfolio.example", "type": "self_reported" },
  { "origin": "https://project.example", "type": "original_work" }
]
```

An allowlist entry is an operator-reviewed provenance assertion. Do not label a shared blogging/social host institutional. The service still checks robots.txt, public DNS/IPs, response sizes and content types, and refuses redirects. It will skip blocked, redirected, PDF and JavaScript-only records. Do not weaken these checks to obtain a result. Restart after configuration changes; this changes the cache fingerprint.

## 5. Research and inspect

Click **Check credentials** on a supported profile or use the manual URL field. Set the subject in settings, or use **Set subject / refine identity** from the report. Public profile context and supported selected-post text are hints, not proof of expertise. A subject must be explicitly selected for topic overlap.

The main report contains identity, education, experience and topic fit. **View evidence** exposes qualifications, authored work, direct identity links, candidate sources and limitations. A `matched` identity means a public Person/ORCID record explicitly links the account, not proof of legal identity. A possible match never attributes credentials. LinkedIn excerpts stay self-reported leads.

Structured Schema.org Person fields and selected public ORCID sections are supported. University attendance is labeled affiliation, not a degree. Structured authored work requires an explicit author identifier tied to a linked Person record.

Biography extraction also supports complete English sentences about study, work and authored publications. It requires one directly linked Person record on the fetched page and a main-content region. First-person statements are accepted only on self-reported About/Bio pages; other statements must explicitly begin with that person's full name. Quoted, testimonial, negative, hypothetical and known instruction-like text is excluded conservatively. The report shows the actual passage and source. A personal biography remains self-reported, even when the account link is matched. No degree, employer field, dates or topical expertise are inferred from a quote. Unrecognized wording, pronouns, other languages and unsupported layouts remain unextracted. This is not a general CV parser or independent credential verification.

After updating the companion, restart it and run a fresh check. Its new startup fingerprint prevents reuse of older reports. Reopen settings to load the new quotation renderer; reload social tabs for on-page rendering.

## MCP tools and client

The official maintained TypeScript SDK runs in Node. The HTTP companion uses its stdio client to spawn `mcp.js`; the browser does not launch executables. Independent MCP hosts can configure `node /absolute/path/companion/mcp.js` with `EXPERTSEAL_CONFIG` in the child environment.

Tools: `public_profile_discovery`, `academic_record_discovery`, `professional_experience_discovery`, `identity_matching`, `credential_extraction`, `topic_relevance`, `evidence_summary`, and the orchestrating `research_creator`. The first tool returns a random research session ID; subsequent modular tools operate on that session's server-collected data, not caller-invented evidence. Sessions expire after two minutes and are bounded to eight. The full pipeline drops its session when done.

## Hosted mode design, not deployed

This release intentionally has no hosted listener or arbitrary remote extension endpoint. A future hosted implementation must use HTTPS, per-user authentication and storage isolation, explicit registration of extension origins, rate limits, abuse controls and opt-in narrowly scoped browser permissions. It must not proxy arbitrary URLs or reuse local pairing tokens. Deployment requires separate approval.

## Reproduce checks

Run `npm ci`, `npm run check`, `npm test`, and `npm run package` at the repository root. Then run `npm ci`, `npm run check`, and `npm test` in `companion`. Tests use synthetic people, mocked public records and real local HTTP/stdio transports. They require permission to open loopback sockets.

`node evaluate-model.js qwen3.5:2b` explicitly calls your running local Ollama with three synthetic cases. It reports model acceptance/fallback, identity state and latency. This opt-in evaluation is not part of the ordinary test suite and does not use real creator data.
