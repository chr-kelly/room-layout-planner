# Architecture and extension points

One canonical, versioned SI-unit model drives both renderers. `validateProject`
returns a new whitelisted object, never the caller's arbitrary JSON object.
The image raster is intentionally kept in a separate session map; its metadata
and calibration live in the model. History snapshots carry the metadata while
raster-map retention follows current and undo/redo references.

Editing uses validated transactions. A pointer drag records its starting
snapshot, renders transient changes, then validates and records one final edit.
Cancel or invalid completion restores the starting snapshot. New/open/clear are
explicit history boundaries. Saving is debounced after completed edits; failures
are visible and do not discard the model.

2D uses a Canvas renderer and inverse viewport transforms for hit tests. Units
are formatting/input adapters, not geometry transforms. Wall lengths are measured
on centerlines; the rectangle helper separately constructs clear inside dimensions.
In 3D, plan (x, y) maps to Three.js (x, z), and height maps to y. Furniture rotation
has the opposite sign about the Three.js y axis to preserve plan orientation.

`scene3d.js` is lazy imported. A missing dependency, unsupported WebGL, or lost
context does not take down the editing model. 3D is read-only in this release,
and navigation is not part of undo history. Rendering pauses while hidden.

Six local `src/locales/*.js` catalogues share stable message keys. Pure validation
uses `PlannerError` codes and structured parameters while retaining its original
English `.message`. `src/i18n.js` resolves messages at the UI boundary and binds
text/attributes directly, preserving existing form nodes during a language switch.
It does not reload the project, create a history entry, or change display units.
Number formatters are cached so localized canvas labels do not repeatedly create
Intl formatters while drawing.

Schema 1 accepts optional `nameKey` metadata on project and furniture names.
Only an allowed default key paired with its canonical default name is retained.
Old JSON without the marker and custom/renamed names are literal; no identity is
inferred from spelling. The metadata describes presentation, never geometry.
Interactive image calibration rounds clicks to image pixels to avoid browser
subpixel pointer noise; imported fractional calibration points remain valid.

`scripts/build-pages.mjs` regenerates six HTML entries from the English entry and
catalogues. Relative assets and a module-derived base path support both root
hosting and repository subdirectories. `scripts/package.py` creates an app-only
`site/` folder; it never uploads anything. The language preference has its own
storage key, separate from the shared project key.

The optional `?test=1` diagnostic object exposes copied read-only snapshots,
viewport projection and scene geometry for regression assertions. It neither
writes state nor makes network requests. It is not a backend API.

Potential next steps are real-device validation and usability improvements before
P1 door/window associations, valid-polygon area, cost inputs or richer models.
Any added model must have a clear license and an exact-size bounding contract.
AI recognition, multiplayer and CAD interchange are deliberately not implicit
extensions of this schema.
