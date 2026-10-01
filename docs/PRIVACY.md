# Privacy, data limits and recovery

The application has no login, backend API, telemetry, analytics, advertising,
remote fonts, external textures, or image upload. All runtime JavaScript is
same-origin, including vendored Three.js. Its CSP disables network `connect-src`.
The dependency download script and development package installation are explicit
maintainer network operations, not application runtime operations.

A hosting provider can still receive the IP address and ordinary request details
when it serves these static files. Browser extensions and the browser itself
are outside this application's privacy promises. No claim of absolutely zero
collection by all infrastructure is made.

## Browser state

Only `room-layout-planner.project.v1` is used for project localStorage. Geometry,
unit selection, settings, and background registration metadata are saved; image
pixels and undo history are not. Image metadata does not require the original
file path or filename. Save errors leave in-memory edits available for export.
The Clear command removes this key, not unrelated storage or downloaded files.

Data is separated by origin (scheme, host, and port). Clearing site data,
uninstalling a browser, quota failure, private sessions, or changing the URL
can lose or hide saved data. Regular JSON downloads are the recovery mechanism.
No unrequested cloud backup exists.

## Interchange limits

- Input PNG/JPEG and input JSON: at most 10 MiB each.
- Image: at most 16,000,000 pixels; each dimension at most 16,000 px.
- Embedded PNG/JPEG: at most 2 MiB decoded bytes.
- At most 200 wall segments, 200 furniture objects, and 200 measurements.
- Object/project names: at most 100 characters. IDs are unique across geometry.
- Version 1 only. Higher/unknown versions are rejected rather than partially loaded.
- Coordinates: −500 to 500 m; ordinary lengths at most 100 m; other safe ranges
  and minimum lengths are enforced by `validateProject()`.

Imports rebuild only known fields, require finite numeric values, and reject
external image URLs. Labels are written as plain text, never inserted as HTML.
Raster signatures/dimensions are checked before browser decoding; decoded
embedded-image dimensions must match metadata. The app performs no JSON script
execution. Limits are robustness controls, not a substitute for security review.
