# Contributing

Use Node 22+, run `npm ci`, then run `npm run check`, `npm test`, and `npm run package` before opening a pull request. Load the source directory through Chrome or Edge's **Load unpacked** for manual testing; reload the extension and refresh the page after changes.

Keep changes focused. Add regression tests for meaningful failures: incorrect creator selection, message authorization, secret exposure, malformed provider output, unsafe links and cache behavior. Record installed-browser and live-provider validation separately from mocked checks in `docs/TESTING.md`.

Do not add API keys, `.env` files, browser profiles, user reports, private records or raw provider error bodies to Git. CI and automated tests must use synthetic credentials and fixtures. There must be no automatic API calls simply from visiting a social page or opening the popup.

Treat page text and model output as untrusted. Use safe URL checks and DOM text nodes. Scope creator extraction to the clicked author. Do not call an AI assessment independent credential certification, infer misconduct from absent records, or label cached data permanently trustworthy.

Runtime changes must remain compatible with Manifest V3's content security policy. The extension has no hosted backend; new permissions or data destinations need a clear explanation in the README/privacy policy.

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are under the [MIT license](LICENSE).
