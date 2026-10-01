# Third-party notices

## Three.js 0.180.0 (r180)

Source: https://github.com/mrdoob/three.js/tree/r180  
Copyright © 2010–2025 three.js authors  
License: MIT; the complete upstream license is included in `vendor/three/LICENSE`.

Runtime files fetched by `scripts/vendor.py` (JavaScript files are not included
in this source-only archive): `three.module.min.js`, `three.core.min.js`, `OrbitControls.js`.
The only source modification is changing the one `from 'three'` import in
`OrbitControls.js` to `from './three.module.min.js'` so no import map, CDN,
package manager, or bundler is needed. Upstream SHA-256 checksums are pinned in
`scripts/vendor.py`; the verifier reverses this documented import-path change
before checking the upstream digest. This fixed version is not a claim to be
the latest Three.js release.

## Reference / acknowledgement

Product reference: https://github.com/wy51ai/floorplan-3d  
Reference project author: wy51ai / wuyi. Its LICENSE, checked on 2026-10-01,
is MIT, Copyright (c) 2026 wuyi. The project owner also reported receiving
author permission. This repository is an independent implementation of the
supplied room-layout PRD; it does not bundle the reference project's HTML,
JavaScript, original apartment geometry, furniture models, or visual assets.
No affiliation or endorsement is implied.

The original code in `src/` and the original UI/assets are covered by this
repository's LICENSE, not by a claim of authorship over Three.js. No external
furniture models, textures, icons, web fonts, or stock photographs are bundled.
Python Playwright is a development-only test dependency, not shipped runtime code.
