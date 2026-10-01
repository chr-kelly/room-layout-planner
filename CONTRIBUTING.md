# Contributing

Keep the application static, local-first, framework-free and usable without
accounts. Propose major scope additions in an issue before implementing them.
No PR should imply structural, collision, regulatory or measurement guarantees.

Run `npm test`, `python3 scripts/vendor.py --check`, and the Playwright suite.
Add a regression test for fixes. Verify the 390 px UI using touch, the 1366 px UI
using mouse/keyboard, and error handling with unavailable storage and WebGL.
Document actual browser/device versions; never mark unrun checks as passed.

All six catalogues in `src/locales/` must have the same keys and interpolation
variables. Write concise, natural copy in each language and preserve the meaning
of limits, calibration and privacy notes. Use stable message descriptors and error
codes; never match English error strings or inject translated HTML. Names written
by users must remain literal. Keep language choice independent of geometry and units.

After editing copy, run `node scripts/build-pages.mjs` and commit the generated
HTML entries. Before browser tests, run `python3 scripts/package.py` to prepare
the subdirectory-hosting fixture. For an additional language, update the locale
manifest/loaders, static packaging list and both regression suites together.

Do not check in personal plans, access tokens, `.env` files, `node_modules`,
localStorage dumps or downloaded user data. Add only fixtures that you own or
may redistribute. Retain dependency licenses, pinned versions and integrity
checks. Do not replace a local dependency with a hidden runtime CDN request.
