# Test record — 0.1.0, six-language local preview

Recorded 2026-10-02. This replaces the earlier 2026-10-01 container record with
an actual completed local run. Local automation and real-device acceptance are
recorded separately; the original PRD's real-device sign-off remains open.

## Completed local run

Environment: macOS arm64; Node.js v22.17.0; Python 3.9.6; Playwright 1.57.0;
official Playwright Chromium 143.0.7499.4 (full Chrome for Testing, headless).
Desktop viewport: 1366 × 900. Touch viewport: 390 × 844, emulated.

| Check | Actual result |
|---|---|
| `node --test tests/*.test.js` | 64 passed; 0 failed; 0 skipped; exit 0 |
| `python tests/browser_test.py` with `CHROMIUM_PATH` | 39 passed; 0 failed; exit 0 |
| JavaScript syntax checks | All 15 app, locale and build modules passed |
| Python compile checks | Vendor, packaging and browser-test scripts passed |
| `python3 scripts/vendor.py --check` | All four pinned files verified |
| `python3 scripts/package.py` | 30 app-only files; six language entries; no docs, tests, environment or Git data |
| README local file references | 39 references across two files passed; six tables, six image uses and six details elements |
| Rendered English and Chinese README | Each: 3 / 3 images loaded; three tables; three details elements; no horizontal overflow |

Full Node TAP output is in [unit-results.tap](unit-results.tap). The completed
browser report, including every case, is in [browser-results.json](browser-results.json).
Screenshots and the test downloads remain in the ignored `test-results/` folder.
Current real example screenshots are included in `assets/readme/`.

## Coverage and corrections

All original **55 unit tests and 22 browser scenarios** remain and passed.
Nine additional unit tests cover six matching language catalogues (333 keys each),
message parameters, path handling, independent language storage, decimal commas,
legacy names, whitelisted default-name metadata, structured errors and six
static HTML entries with real relative assets and translated metadata.

Seventeen additional browser scenarios cover a desktop and touch workflow for
each language, plus a failed language-module load, denied storage, 3D dependency
failure across a language switch, literal legacy names and the packaged site
under a subdirectory. They check retained input nodes and unsubmitted values,
selection/history and geometry, localized help/errors/ARIA, metric/imperial
fields, JSON round trips, actual PNG drawing text, 3D and reload behavior.

The suite produced **18 language-specific PNG artifacts**: six desktop screenshots,
six touch screenshots and six exported plans, alongside the original screenshots.
All 12 language desktop/touch screenshots were visually inspected. This is a
layout review, not independent native-language copy review. The real English
2D/3D and Traditional Chinese examples were also inspected in the in-app browser.

Actual failures were repaired before the final passing run. Calibration clicks
are rounded to image pixels so the original 400 px / 4 m precision assertion
passes; legacy fractional JSON calibration remains supported. Dynamic text
bindings no longer clear compound preset buttons. Language URL changes stabilize
same-origin links before changing the relative base. A 3D checkbox now meets the
existing 44 px touch-target requirement. The original 3D wait was made CSP-safe
by passing a function with the same condition; `unsafe-eval` was not enabled.
No original assertion was loosened, and no test was deleted or skipped.

## Performance observation

The existing 50-wall / 50-item / 2048 px image case observed 122 animation frames
in 2.0038 seconds (60.9 mean FPS; no interval over 33.34 ms) in headless software
rendering. This is one local observation, not a guaranteed frame rate or the
PRD's 30-FPS real-device certification. GPU, browser and hardware results can differ.

## Reproduce

```sh
python3 scripts/package.py --fetch-vendor
node --test tests/*.test.js
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-test.txt
.venv/bin/python -m playwright install chromium
.venv/bin/python tests/browser_test.py
```

The packaging step requires Node 20+ and Python 3 and prepares `site/`, which is
used by the subdirectory browser scenario. Dependency downloads use official
pinned upstream files and verify SHA-256. The browser suite manages its own local
HTTP server and writes a JSON report, screenshots and downloads to `test-results/`.
`CHROMIUM_PATH` can select an installed Chromium. This completed macOS run used
the full Chrome for Testing binary from Playwright's `chromium-1200` installation.
On Linux, Playwright may need its documented `install --with-deps chromium` setup.

## Gates still open

Real iOS Safari and Android Chrome devices; current stable desktop Chrome, Edge,
Firefox and macOS Safari; screen-reader review; actual GPU/WebGL behavior;
performance on a named physical device; external-user usability validation;
independent native-language review of all six catalogues.

Claude independent review and a Claude Design canvas were unavailable because
the local Claude account was restricted. This work used the existing product
layout; it does not claim a Claude review or a new Design prototype.

GitHub Actions have not run. The repository exists locally with no remote;
no public GitHub repository or Cloudflare Pages site has been published.
Workflow files and local screenshots do not establish online deployment success.
