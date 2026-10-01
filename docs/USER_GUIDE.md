# User guide

## 1. Start, choose a language and choose units

Use the header or welcome-dialog language menu for English, 繁體中文, 日本語,
Deutsch, Français or Español. English uses the root path; the other entries are
`/zh-TW/`, `/ja/`, `/de/`, `/fr/` and `/es/`. Switching keeps your plan, undo history,
selection and unsubmitted fields, and remembers your preference. An explicit
language URL wins over the saved preference. Custom and older project names are
preserved literally. Newly created default names follow the interface language.

Choose Metric or Feet + inches explicitly. Start blank, or load the example.
Before replacing an existing project, use **Download JSON first** in the
confirmation dialog. Cancel leaves the current project unchanged. Opening the
New dialog does not clear the canvas until you confirm a replacement.

## 2. Establish reliable dimensions

Without an image, use the rectangular-room helper. Enter the clear width/depth
between the inside wall faces. The app positions wall centerlines outside those
faces using the current thickness. Later changing wall thickness does not
recalculate the clear size: use the room helper again to set a required inside size.

With an image, choose PNG or JPEG, then tap two points with a measured real
separation. Enter the real distance. Two points 400 px apart set to 4 m make
200 px correspond to 2 m. Never infer scale from a bed icon or doorway.
Calibration does not remove perspective distortion or fix a bad original drawing.
Recalibration changes only the background's scale and offset, not existing walls,
furniture, or measurements. The first calibration point is held fixed in space.

The background's lock is on by default. Unlock it to move it with Select. It can
never be mistaken for furniture. Hide it or adjust opacity using its controls.
After reselecting an image with identical pixel dimensions, **Keep alignment**
requires you to confirm it has the same crop and orientation. A different image
must start uncalibrated. Same pixel dimensions alone do not prove a match.

## 3. Draw and check walls

Choose Wall and click two endpoints. Each pair creates one segment. Shift locks
the second point horizontally or vertically on desktop. Grid snapping can be
disabled in Settings. Select a wall to edit endpoints or its centerline length;
the length edit anchors endpoint A. Drag a selected endpoint handle to reshape.
Open outlines are allowed; no structural or safety classification is made.

The room helper can replace walls with a 4 × 3.5 m inside rectangle after explicit
confirmation, preserving furniture and measurements. This operation is undoable.
Global wall height and thickness apply to existing and future wall segments.

## 4. Place real furniture

Tap a preset to add it near the view center. Select it on the canvas or in the
object list. Enter actual width, depth, and height; presets are illustrative.
Drag to move, use the 90° button, or enter any finite angle. Duplicate creates an
independent object; Delete is undoable. Furniture overlap is not validated.

When using imperial units, feet and inches have separate inputs. Dimensions
must be positive. Position fields may be signed. Internally every coordinate is
stored in metres, and merely switching the display unit leaves geometry unchanged.
Numeric fields accept both decimal points and decimal commas, without thousands
separators. For example, `2.25` and `2,25` both mean 2.25 metres in a metric field.

## 5. Measure and view

Measure records a straight-line distance between two clicks, not a navigable
route or doorway clearance. Select the measurement to edit or delete it.

The 3D tab shows the same geometry as 2D. Orbit by dragging, zoom with wheel or
controls, and use Fit to reset. Cutaway shortens wall meshes for visibility only;
uncheck it to show stored wall heights. Walk uses WASD/arrow keys or on-screen
buttons and drag-to-look. It passes through walls and furniture. The floor is an
illustrative bounding plane, not a floor-area computation.

## 6. Save, compare and export

Autosave stores one project's geometry/settings on the current origin. Watch
the save status; on failure, export immediately. A missing saved image is explained
on reload. The image is not silently added to localStorage.

Export JSON to continue editing later. Optionally embed the image; the app tries
lossless PNG, then JPEG compression without changing pixel dimensions, and
rejects embedding if it still exceeds 2 MiB. It never silently omits a requested
image. Import validates the entire project and any embedded raster **before**
asking to replace the current project. Import/clear/new reset undo history.

PNG contains the project name, units, wall/measurement dimensions, and the
planning-only notice. Choose whether to include the background. PNG is not
editable project data. Use separately named A/B JSON and PNG files to compare.
Clear current project requires confirmation and only removes this app's cache.

## Keyboard shortcuts

| Key | Action |
|---|---|
| V / W / M / P | Select / wall / measure / pan |
| F | Fit current view |
| R | Rotate selected furniture 90° |
| Delete / Backspace | Delete selection, except while typing |
| Ctrl/⌘ D | Duplicate furniture |
| Ctrl/⌘ Z | Undo |
| Ctrl/⌘ Shift Z / Ctrl Y | Redo |
| Escape | Cancel the current gesture or dialog |

Every core action also has a visible button. On smaller screens, open Library,
Tools, or Details from the bottom navigation and close the panel to return to
the canvas. Dialogs, errors, help, accessible labels and PNG export text follow
the selected language and do not rely on hover.
