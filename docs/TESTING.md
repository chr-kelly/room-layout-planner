# Test record — 0.1.0 development preview

Recorded 2026-10-01. This record distinguishes execution from authored coverage.
**This is not a completed P0 browser-acceptance sign-off.**

## Executed successfully

Environment: Linux working container; Node.js v22.16.0; Python 3.13.5.

| Check | Actual result |
|---|---|
| `node --test tests/*.test.js` | 55 passed; 0 failed; 0 skipped |
| `node --check` on all 6 application JavaScript modules | Passed syntax checks |
| Python compile checks for vendor utility and browser suite | Passed |
| Included example JSON through the application validator | Passed |
| Upstream Three.js LICENSE SHA-256 | Matches pinned upstream digest |

The complete Node TAP output is stored in `unit-results.tap`. Unit tests cover
metre/foot/inch conversion, unchanged geometry across unit settings, clear-inside
rectangle geometry, 3–4–5 distance, rotation/hit tests, calibration, history limits
and redo branching, version and schema rejection, unique IDs, finite/ranged values,
image headers and limits, storage failure, and application-specific cache clearing.
Passing these tests does **not** prove mouse/touch UX, exported rendering, GPU
behavior, or browser security behavior.

## Authored, but not executed to completion

`tests/browser_test.py` contains 22 end-to-end scenarios targeting desktop
1366 × 900 and emulated touch 390 × 844. These include editing/dragging, unit
switching, calibration, image rejection, PNG/JSON downloads, refresh/recovery,
confirmation cancellation, storage denied, unavailable WebGL/missing dependency,
3D size consistency/walk controls, XSS text handling, re-alignment, and a 50-wall /
50-furniture scene with a 2048-pixel image.

**No browser pass count, UI screenshot, or FPS result is claimed.** Local automated
navigation was blocked by the execution environment's browser policy. Preparation
of an alternate test environment was also interrupted by a tool security block.
No policy bypass was attempted. These restrictions are not evidence that the
application passes or fails those browser scenarios.

Runtime Three.js files were fetched and their hashes inspected in a separate
environment, but were not successfully incorporated into this source archive.
The local dependency-fetch utility therefore still needs to be run in the target
environment; its complete download/install path is not reported as locally passed.

## Reproduce locally

```sh
python3 scripts/vendor.py
python3 scripts/vendor.py --check
node --test tests/*.test.js
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
python3 tests/browser_test.py
```

Use a supported desktop environment without the execution restrictions above.
On Linux, Playwright may additionally need system libraries; its standard
`python3 -m playwright install --with-deps chromium` command installs those in a
suitable test environment. The suite serves the project locally and writes its
actual JSON report and screenshots to `test-results/`.

## Release gates still open

Real-device iOS Safari and Android Chrome; current stable desktop Chrome, Edge,
Firefox and macOS Safari; keyboard and touch accessibility; screen-reader review;
actual GPU/WebGL behavior; full offline-package request inspection; storage and
export behavior in those browsers; visual review of screenshots; performance on
a named reference device; external-user usability validation.

The 30-FPS performance target in the PRD is **not measured or certified** here.
GitHub Actions have **not run**, no remote repository has been created for this
project, and no Pages site has been deployed by this delivery. Workflow YAML files
are configuration only, not proof of successful CI or hosting.
