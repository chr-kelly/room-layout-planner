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

The optional `?test=1` diagnostic object exposes copied read-only snapshots,
viewport projection and scene geometry for regression assertions. It neither
writes state nor makes network requests. It is not a backend API.

Potential next steps are real-device validation and usability improvements before
P1 door/window associations, valid-polygon area, cost inputs or richer models.
Any added model must have a clear license and an exact-size bounding contract.
AI recognition, multiplayer and CAD interchange are deliberately not implicit
extensions of this schema.
