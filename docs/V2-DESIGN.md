# 2.0 implementation audit

Baseline: 1.4.2, commit 403a6e2. Existing worker, provider adapters, cache serialization, sender authorization and rendering are retained. This branch adds an optional provider; it does not migrate existing users to it.

## Boundaries

- Extension worker -> fixed `http://127.0.0.1:3210/v1/research`. Optional host permission, requested only on settings save. Bearer token never reaches content scripts. No arbitrary endpoint supplied by a page.
- Loopback companion -> official MCP client -> child stdio MCP server. The browser cannot spawn processes. No public MCP HTTP endpoint.
- MCP research server -> operator-configured SearXNG/Ollama, OpenAlex/ORCID public interfaces and approved public source origins. Retrieved text never controls tools, endpoints, permissions or identity decisions.
- Public HTML collection is limited to explicitly configured exact origins with a declared provenance class. Robots restrictions, private IP rejection, DNS pinning, redirect rejection, timeouts and response limits apply. No search snippet is promoted to a credential.
- A source-scoped Person record explicitly linking the exact social account can establish a documented identity connection. Matching names, handles, locations, search rankings and user-supplied links cannot. Conflicting directly linked records suppress attribution.
- Structured professional facts are deterministic. Qwen proposes short extractive selections only. Unknown IDs, rewritten claims and unsupported URLs are rejected. Unstructured prose remains a lead; the implementation deliberately does not infer degrees from university attendance.

## Smallest reliable scope

Seven modular MCP tools plus an orchestrated research tool. Discovery returns bounded leads. Fetching yields source records. Identity decisions retain evidence. Credential extraction is separate from topical overlap and summary selection. No server-side personal database or cross-creator cache; browser cache keys include the exact creator, topic and companion configuration fingerprint. Model failures use an explicitly labeled deterministic fallback.

Subject input is explicit, or bounded public profile context labeled as a hint. Selected-post hints are optional and must come from the clicked author container. No recommended content, transcripts or popularity inputs.

Hosted deployment is a documented design only. This implementation refuses non-loopback HTTP exposure. A hosted version needs HTTPS, per-user authentication/isolation, exact extension-origin registration and new explicit permissions before implementation or deployment.
