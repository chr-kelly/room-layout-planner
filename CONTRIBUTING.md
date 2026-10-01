# Contributing

Keep the application static, local-first, framework-free and usable without
accounts. Propose major scope additions in an issue before implementing them.
No PR should imply structural, collision, regulatory or measurement guarantees.

Run `npm test`, `python3 scripts/vendor.py --check`, and the Playwright suite.
Add a regression test for fixes. Verify the 390 px UI using touch, the 1366 px UI
using mouse/keyboard, and error handling with unavailable storage and WebGL.
Document actual browser/device versions; never mark unrun checks as passed.

Do not check in personal plans, access tokens, `.env` files, `node_modules`,
localStorage dumps or downloaded user data. Add only fixtures that you own or
may redistribute. Retain dependency licenses, pinned versions and integrity
checks. Do not replace a local dependency with a hidden runtime CDN request.
