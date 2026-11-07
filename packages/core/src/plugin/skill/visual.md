# Visual blocks

Write one fenced block with the `visual` language and a JSON spec. The desktop app replaces the fence with an interactive renderer that uses the host theme. The renderer owns the layout and the math; you supply the parameters and the claim.

Use a visual when seeing or manipulating the thing answers the question. Keep prose to the claim and the takeaway. Do not restate the labels or the numbers in the visual.

## Decide before you answer

Before writing a technical answer, decide silently whether a visual would make the claim easier to see. If one would, include it. Do not ask the user whether they want a visual, and do not describe the decision. If the user asks for a visual, you must include at least one visual even when the topic is simple.

## When not to use it

- A table answers the question. Write a Markdown table.
- A static structure with labeled nodes and edges is enough. Write a Mermaid block.
- The user asked for a file, site, report, or project change. Build the file, not an inline visual.
- The numbers are unknown. Do not invent data to fill a chart. Ask, or show the method with a clearly marked placeholder.
- You would need more than four visuals to answer one question. Pick the two that prove the point.

## Contract

- Top level: `v` is `1`, `kind` names the renderer, `title` states the claim, `data` holds the parameters.
- `unit` names the units used by the numbers. `caption` is one sentence under the visual. `note` states assumptions or limits. `source` names the formula, standard, or reference.
- Numbers carry units and a real basis. Every computed result must come from the supplied parameters. State the formula or assumption in `source` or `note`.
- Keep specs under 256 kB. Keep series under eight, points under 4,000 per series, parts under forty, nodes under fourteen.
- Use a typed kind when the question matches the table below. Use `a2ui` for a native page with text, controls, a table, or a custom scene. Use `html` only when the A2UI catalog cannot express the idea.
- For every typed kind and for `a2ui`, do not add HTML, JavaScript, colors, or CSS. The app colors every mark from its theme. For `html`, follow the sandbox rules below.
- Write the block after the prose that introduces it. Keep one claim per visual.

## Choosing a kind

| Question | Kind |
| --- | --- |
| How does the mechanism move? | `mechanism` |
| Is this beam strong and stiff enough? | `beam` |
| What are the principal stresses? | `mohr` |
| How does a material behave past yield? | `stress-strain` |
| How much work does a gas cycle produce? | `pv` |
| Will the tolerances stack up? | `tolerance` |
| How does the process flow? | `flow` |
| What does the assembly look like? | `assembly` |
| What is the agent doing? | `task` |
| What is the structure or decision path? | `diagram` |
| How do two quantities compare? | `plot` |
| Need a native page with text, a table, controls, or a custom drawing? | `a2ui` |
| Need a custom interactive app the A2UI catalog cannot express? | `html` |

## Native interfaces

`a2ui` is the general native tier. Use it for topics outside the engineering catalog when the answer needs layout, text, a table, a control, or a custom drawing. The app renders native components, so the interface inherits the app theme and appears while the messages stream.

- The outer visual is `kind: "a2ui"` with a `title` and optional `height`.
- `data.messages` is an A2UI 1.0 stream: `createSurface`, `updateComponents`, `updateDataModel`, and `deleteSurface`. One component must have `id: "root"`.
- Components are a flat list. Children reference IDs. Do not invent component names; use the catalog in `reference.md`.
- Bind values with `{"@path": "/angle"}`. A slider that writes `/angle` updates every shape that reads it.
- Use `Scene` for drawings: line, arrow, circle, rect, path, polygon, text, and group. Groups take `translate`, `rotate`, and `scale`; `animate` spins a group.
- Stream in order: `createSurface` with the root and static parts, then `updateComponents` for controls and details, then `updateDataModel`. Keep each message small so the page builds progressively.
- Use a typed renderer for engineering calculations. Use `a2ui` to explain, compare, lay out, or draw. Use `html` only when the catalog cannot express the interaction.
- Embed a typed renderer inside a page with the `Typed` component when the page needs a beam, plot, mechanism, or another engineering view beside its text and controls. Set `kind` to the typed kind and `data` to that kind's payload.
- MCP Apps from connected servers render automatically on their tool calls. Do not write an `a2ui` or `html` block for a server that already provides a `ui://` resource.

## General-purpose HTML visuals

`html` is the last tier. Use it only for a custom interactive app that the A2UI catalog cannot express: a bespoke editor, a chart with behavior the catalog lacks, or a page with an external library. Do not use it for a topic a typed kind or `a2ui` already covers.

The document runs in an opaque iframe with scripts, no same-origin access, no network, no storage, and no bridge back to the app. Treat it as a sealed page.

- Write a fragment, not a full document. Do not include `doctype`, `html`, `head`, or `body`.
- Put styles in `css` and behavior in `js`. Avoid inline `<script>` tags.
- Use the host theme: `var(--bg)`, `var(--surface)`, `var(--fg)`, `var(--muted)`, `var(--line)`, `var(--line-strong)`, `var(--accent)`, `var(--critical)`, `var(--success)`, `var(--font)`, `var(--mono)`, `var(--radius)`. Never hardcode a light or dark palette.
- No external network: no CDN, remote fonts, remote images, `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`, cookies, or IndexedDB. Inline SVG, canvas, and data URLs are allowed.
- Use semantic HTML, real buttons, labels, keyboard focus, and `aria-live` for computed results. Never inject user or fetched text with `innerHTML`.
- Keep the page to one exhibit. No card grids, KPI dashboards, decorative borders, gradients, or fake data.
- State assumptions and units inside the page when the result depends on them. Label illustrative numbers as sample data.
- Limits: html 160 kB, css 40 kB, js 80 kB, overall 256 kB. `height` is optional, 160 to 1200 px. The frame also reports its content height.

Quality bar:

- One exhibit per block. Do not build a dashboard, a card grid, or a row of KPI tiles.
- Use the host type scale: 13 px body, 11 to 12 px labels, one clear result at 19 to 24 px. Do not use display type inside the frame.
- Use one accent for the active state or the primary result. Everything else uses `--fg`, `--muted`, `--line`, and `--surface`.
- Prefer a single SVG, canvas, or diagram over rows of bordered boxes. Do not add gradients, glass panels, or decorative borders.
- Every control has a visible label and a keyboard path. Use `aria-live` for computed output.
- No invented numbers. If the data is illustrative, say so inside the frame and in `note`.
- The frame is part of the conversation. Keep the chrome quiet and let the exhibit carry the claim.

## Minimum examples

Four-bar linkage:

```visual
{"v":1,"kind":"mechanism","title":"Crank-rocker","unit":"mm","data":{"type":"fourbar","a":34,"b":104,"c":74,"d":128,"branch":"open","rpm":18},"caption":"The rocker reverses where the crank and coupler become collinear.","note":"Planar rigid-body kinematics, no joint clearance."}
```

Simply supported beam:

```visual
{"v":1,"kind":"beam","title":"Pin beam under 12 kN","unit":"m, kN, mm","data":{"type":"simply-supported","length":4,"loads":[{"type":"udl","from":0,"to":4,"magnitude":8},{"type":"point","x":3,"magnitude":12}],"section":{"shape":"rect","b":100,"h":200},"E":200,"yield":250},"caption":"The peak moment sits just past the point load.","source":"Euler-Bernoulli beam theory"}
```

Agent progress:

```visual
{"v":1,"kind":"task","title":"Checking the gearbox","data":{"status":"running","steps":[{"label":"Read the brief","state":"done"},{"label":"Size the shaft","state":"active","detail":"6204 bearing"},{"label":"Check the pin","state":"pending"}]}}
```

General-purpose gear calculator:

```visual
{"v":1,"kind":"html","title":"A 3.2:1 gear pair trades speed for torque","height":360,"data":{"html":"<div class=\"panel\"><label>Input speed <input id=\"rpm\" type=\"range\" min=\"100\" max=\"3000\" value=\"900\"></label><output id=\"speed\" aria-live=\"polite\"></output><p class=\"note\">51-tooth wheel, 16-tooth pinion, 97% efficiency.</p></div>","css":".panel{display:grid;gap:14px;max-width:420px}label{display:grid;gap:6px;color:var(--muted)}output{font:600 24px var(--mono);color:var(--accent)}.note{margin:0;color:var(--muted);font-size:12px}","js":"const rpm=document.querySelector('#rpm'),out=document.querySelector('#speed'),ratio=51/16;const draw=()=>out.textContent=Math.round(+rpm.value/ratio)+' rpm';rpm.addEventListener('input',draw);draw()"}}
```

The full field reference follows.

---

# Visual spec reference

Every block is one JSON object. Unknown fields are ignored. Missing optional fields use the defaults below.

```json
{
  "v": 1,
  "kind": "mechanism",
  "title": "Claim in one line",
  "subtitle": "Context, parameters, or configuration",
  "caption": "One sentence the reader needs after the visual.",
  "note": "Assumptions and limits.",
  "source": "Formula, standard, or reference.",
  "unit": "mm, kN, MPa",
  "height": 320,
  "data": {}
}
```

`v` is required. `title` is required. `height` is optional and capped at 720. `unit` is a display string, not a unit system. Put the actual unit of each number in the field name or in `unit`, and keep them consistent.

## mechanism

Planar linkage kinematics. One degree of freedom.

```json
{
  "type": "fourbar",
  "a": 34, "b": 104, "c": 74, "d": 128,
  "branch": "open",
  "rpm": 18,
  "angle": 38,
  "trace": false
}
```

- `type`: `fourbar` or `crank-slider`.
- Four-bar: `a` crank, `b` coupler, `c` rocker, `d` ground. `branch` is `open` or `crossed`.
- Slider-crank: `r` crank radius, `l` connecting rod, `offset` slider offset from the crank axis.
- `rpm` sets animation speed. `angle` is the starting crank angle in degrees. `trace` draws the coupler point path.
- The renderer computes joint positions by circle intersection, shows the transmission angle, checks Grashof, and reports stroke and rod ratio for a slider-crank.
- Place all lengths in the same unit. The app does not convert.

## beam

Statically determinate beam with linear elastic Euler-Bernoulli deflection.

```json
{
  "type": "simply-supported",
  "length": 4,
  "unit": "m",
  "loads": [
    { "type": "udl", "from": 0, "to": 4, "magnitude": 8 },
    { "type": "point", "x": 3, "magnitude": 12 }
  ],
  "section": { "shape": "rect", "b": 100, "h": 200 },
  "E": 200,
  "yield": 250
}
```

- `type`: `simply-supported` or `cantilever`. Supports sit at both ends for a simply supported beam, and the fixed end is at zero for a cantilever.
- `length` in metres. Point loads in kN, UDL in kN/m. Downward is positive.
- `section.shape`: `rect` (`b`, `h`), `circle` (`d`), or `ibeam` (`b`, `h`, `tw`, `tf`). Section dimensions are millimetres.
- `E` is Young's modulus in GPa. `yield` is the yield strength in MPa.
- The renderer computes reactions, shear, bending moment, peak stress, utilization, and deflection. It draws the free body, shear diagram, moment diagram, and an exaggerated deflection curve.
- Do not state a peak value in prose unless you compute it with the same parameters.

## mohr

Plane stress, isotropic, linear elastic.

```json
{ "sigmaX": 80, "sigmaY": 20, "tauXY": 40 }
```

- All values in the same stress unit, normally MPa.
- `tauXY` is positive on the positive x face in the positive y direction.
- The renderer computes the centre, radius, principal stresses, maximum shear, and principal angle. The slider rotates the plane from 0 to 180 degrees.

## stress-strain

```json
{
  "materials": [
    { "name": "Steel S275", "E": 200, "yield": 275, "ultimate": 430, "ultimateStrain": 15, "fractureStrain": 22 },
    { "name": "Aluminium 6061-T6", "E": 69, "yield": 276, "ultimate": 310, "ultimateStrain": 8, "fractureStrain": 12 }
  ]
}
```

- `E` in GPa, stresses in MPa, strains in percent.
- Use `points: [[strainPercent, stressMPa], ...]` instead of the four parameters when you have measured data. The renderer plots the points directly.
- The generated curve is linear to yield, then linear hardening to ultimate, then a drop to fracture. It is a teaching idealization, not a mill certificate.

## pv

```json
{
  "gas": { "gamma": 1.4 },
  "steps": [
    { "type": "adiabatic", "label": "Compression", "from": [100, 1.0], "to": [695.8, 0.25] },
    { "type": "isochoric", "label": "Heat addition", "p1": 695.8, "p2": 2200, "v1": 0.25 },
    { "type": "adiabatic", "label": "Expansion", "from": [2200, 0.25], "to": [315.9, 1.0] },
    { "type": "isochoric", "label": "Heat rejection", "p1": 315.9, "p2": 100, "v1": 1.0 }
  ]
}
```

- `from` and `to` are `[pressure, specificVolume]`. Pressure in kPa, specific volume in m³/kg, work in kJ/kg.
- `type`: `isothermal` (`n = 1`), `adiabatic` (`n = gamma`), `isochoric` (`v` constant), `isobaric` (`p` constant), or `polytropic` (`n` supplied).
- For a polytropic step you may give `from` and `to`, or `from` and `ratio` (`v2 / v1`), or `p1`, `v1`, and `v2`.
- Work is `p1 v1 ln(v2/v1)` for `n = 1`, and `(p2 v2 - p1 v1) / (1 - n)` otherwise. Constant volume work is zero.
- The renderer shades positive work and animates a piston with the current state.

## tolerance

```json
{
  "nominal": 0.3,
  "limits": { "upper": 0.3, "lower": 0.3 },
  "stack": [
    { "name": "Shaft diameter", "plus": 0.05, "minus": 0.05 },
    { "name": "Bearing width", "plus": 0.02, "minus": 0.01 },
    { "name": "Spacer", "plus": 0.1, "minus": 0.05 },
    { "name": "Housing depth", "plus": 0.08, "minus": 0.08 }
  ]
}
```

- All dimensions in the same unit.
- `nominal` is the controlled result, for example a clearance. The stack items are the tolerance contributors; they carry only tolerances.
- `plus` and `minus` are absolute tolerance magnitudes, always positive. The worst case adds every contribution.
- Worst case is `sum(plus)` and `sum(minus)`. RSS is `sqrt(sum(((plus + minus) / 2)^2))`.
- `limits` is optional. When present, the renderer states whether the worst case fits.
- Do not mix worst-case and RSS in one claim.

## flow

Industrial process schematic.

```json
{
  "nodes": [
    { "id": "tank", "label": "Reservoir", "type": "tank", "detail": "40 L" },
    { "id": "pump", "label": "Pump", "type": "pump", "detail": "12 L/min", "active": true }
  ],
  "edges": [{ "from": "tank", "to": "pump", "label": "suction" }],
  "readouts": [{ "label": "Flow", "value": "12 L/min" }]
}
```

- `type`: `source`, `pump`, `valve`, `tank`, `heat`, `machine`, `sensor`, `sink`.
- `x` and `y` are optional, from 0 to 1. Without them the renderer lays the flow out by graph depth.
- `active` colors one stream or unit with the app accent.
- `readouts` is at most two rows of `{ "label", "value" }`.
- This is a schematic, not a hydraulic calculation. Do not imply pressure drop or cavitation analysis unless you computed it.

## assembly

```json
{
  "explode": 0.65,
  "parts": [
    { "id": "housing", "label": "Housing", "shape": "box", "size": [150, 110, 110], "position": [-55, 55, 0], "tone": "dark", "explode": [-30, 0, 0] },
    { "id": "shaft", "label": "Input shaft", "shape": "shaft", "size": [18, 170, 18], "position": [0, 55, 0], "rotation": [0, 0, 90], "tone": "steel" },
    { "id": "gear", "label": "Gear z24 m2", "shape": "gear", "size": [52, 14, 52], "position": [10, 55, 0], "teeth": 24, "module": 2, "thickness": 14, "hole": 20, "tone": "accent" }
  ]
}
```

- `shape`: `box`, `cylinder`, `shaft`, `gear`, `bearing`, `plate`.
- `size` in millimetres. For a cylinder, `size[0]` is diameter and `size[1]` is length. For a gear, `teeth`, `module`, `thickness`, and `hole` set the geometry. `hole` is the bore diameter in both gears and bearings.
- `position` in millimetres, `rotation` in degrees around x, y, z.
- `explode` is the assembly direction. `explode` at the top sets the initial separation from 0 to 1.
- `tone`: `steel`, `dark`, or `accent`. Use accent for the part the claim is about.
- Gear teeth are simplified trapezoids, not true involute profiles. Say so in `note` when gear meshing matters.

## task

Agent progress, not telemetry.

```json
{
  "status": "running",
  "elapsed": 84,
  "steps": [
    { "label": "Read the brief", "detail": "12 kN at the gear mesh", "state": "done" },
    { "label": "Size the shaft", "state": "active" },
    { "label": "Check the pin", "state": "pending" },
    { "label": "Write the note", "state": "pending" }
  ]
}
```

- `status`: `running`, `done`, or `blocked`.
- `state`: `done`, `active`, `pending`, or `blocked`.
- Keep two to eight steps. Put the artifact each step produces in `detail`.
- Emit this at the start of a long task and again when the state changes. Do not emit a new task block for every tool call.

## diagram

```json
{
  "nodes": [
    { "id": "brief", "label": "Requirement", "detail": "loads, envelope", "tone": "accent" },
    { "id": "model", "label": "Parametric model", "detail": "dimensions" },
    { "id": "check", "label": "Analysis", "detail": "stress, deflection" }
  ],
  "edges": [
    { "from": "brief", "to": "model" },
    { "from": "model", "to": "check" },
    { "from": "check", "to": "model", "label": "revise", "style": "dashed" }
  ]
}
```

- `tone`: `accent`, `muted`, or `critical`.
- `style`: `solid` or `dashed`. `arrow` defaults to true.
- Without `x` and `y`, a chain of three or more nodes lays out vertically. Branching layouts lay out in columns.
- Use this for a process, decision path, or structure. Use Mermaid instead when nodes and edges alone tell the whole story and no interaction is needed.

## plot

```json
{
  "x": { "label": "cycles to failure", "unit": "N", "scale": "log" },
  "y": { "label": "stress amplitude", "unit": "MPa" },
  "series": [
    { "label": "S275 at R = -1", "style": "points", "tone": "accent", "points": [[1000, 420], [10000, 330], [100000, 275], [1000000, 240]] }
  ],
  "annotations": [{ "at": [1000000, 240], "label": "endurance limit" }]
}
```

- `x` and `y` accept `label`, `unit`, `domain` as `[min, max]`, and `scale` as `linear` or `log`.
- `series.style`: `line`, `points`, `area`, or `bar`. `tone`: `accent` or `muted`.
- `annotations[].at` is `[x, y]`.
- Use labels that state the quantity and unit. A chart with no unit is a sketch.
- Declare `x.domain` and `y.domain` whenever you know the range. The plot draws while the fence streams, and a fixed domain keeps the axes still while points arrive; without one the scale reflows as each point lands.

## a2ui

Native interface composition. Use it for arbitrary topics that need layout, text, a table, controls, or a custom drawing. The app renders it with its own components and theme, so it appears while the messages stream and never needs HTML or browser testing.

The outer visual:

```json
{
  "v": 1,
  "kind": "a2ui",
  "title": "Translation and rotation",
  "height": 520,
  "data": {
    "messages": [
      { "version": "1.0", "createSurface": { "surfaceId": "main", "components": [], "dataModel": {} } }
    ]
  }
}
```

- `data.messages` is an A2UI 1.0 stream. Messages apply in order: `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`.
- One component must have `id: "root"`. Components are a flat list; `children` and `child` reference IDs.
- Bind any value with `{"@path": "/angle"}`. A slider that writes `/angle` updates every component and shape that reads it.
- Keep each message small. `createSurface` carries the root and static parts; `updateComponents` adds controls and detail; `updateDataModel` fills values. The renderer merges by ID, so an unfinished message shows what it already has.
- Do not add HTML, CSS, JavaScript, colors, or fonts. The catalog below owns the look.

Catalog:

| Component | Props |
| --- | --- |
| `Column` | `children`, `gap`, `align` (`start`, `center`, `end`, `stretch`), `justify` (`start`, `center`, `end`, `spaceBetween`, `spaceAround`) |
| `Row` | same as `Column`, plus `wrap` |
| `Card` | `child` or `children` |
| `Text` | `text`, `variant` (`body`, `h1`, `h2`, `caption`, `code`), `align` (`start`, `center`, `end`) |
| `Divider` | none |
| `Slider` | `label`, `min`, `max`, `step`, `value` binding |
| `CheckBox` | `label`, `value` binding |
| `TextField` | `label`, `placeholder`, `value` binding |
| `ChoicePicker` | `label`, `options` as `[{ "label", "value" }]`, `value` binding |
| `Table` | `columns` as `[{ "label", "key" }]`, `rows` as objects |
| `Metric` | `label`, `value`, `unit`, `caption` |
| `Callout` | `tone` (`info`, `warn`, `critical`, `success`), `title`, `text` |
| `Steps` | `items` as `[{ "label", "state", "detail" }]`, state `done`, `active`, `pending` |
| `Scene` | `view` (`width`, `height`, `grid`), `label`, `shapes` |
| `Typed` | `kind` (a typed renderer), `title`, `subtitle`, `note`, `data` (that renderer's payload) |

`Typed` embeds an engineering renderer inside the page, so a beam, plot, mechanism, or assembly can sit beside text and controls. Use it instead of rebuilding a typed visual from Scene marks. The embedded renderer keeps its stage and controls but drops its own card header.

Scene shapes:

- Common: `tone` (`accent`, `muted`, `fg`, `critical`, `success`, `line`), `fill` (`none`, `accent`, `accent-2`), `width`, `dash`, `opacity`, `translate` `[x, y]`, `rotate` degrees, `origin` `[x, y]`, `scale` number or `[x, y]`.
- `line`, `arrow`: `from`, `to`; `arrow` adds `head`.
- `circle`: `at`, `r`.
- `rect`: `at` is the center, `size` `[w, h]`, `radius`.
- `path`: `d`.
- `polygon`: `points`.
- `text`: `at`, `text`, `align`, `size`, `weight`.
- `group`: `shapes`.
- `animate`: `{ "from": 0, "to": 360, "duration": 8, "center": [x, y], "once": false }` rotates the shape or group continuously.

Translation and rotation example:

```json
{
  "v": 1,
  "kind": "a2ui",
  "title": "Translation and rotation",
  "height": 520,
  "unit": "grid units",
  "data": {
    "messages": [
      {
        "version": "1.0",
        "createSurface": {
          "surfaceId": "main",
          "components": [
            {
              "id": "root",
              "component": "Column",
              "children": ["intro", "scene", "angle", "tx", "ty", "note"],
              "gap": 10
            },
            {
              "id": "intro",
              "component": "Text",
              "text": "Rotation turns the square about the origin. Translation moves the whole frame.",
              "variant": "caption"
            },
            {
              "id": "scene",
              "component": "Scene",
              "view": { "width": 520, "height": 300, "grid": 40 },
              "label": "A square rotated about the origin and a translation vector",
              "shapes": [
                {
                  "type": "group",
                  "translate": [260, 150],
                  "shapes": [
                    {
                      "type": "group",
                      "rotate": { "@path": "/angle" },
                      "shapes": [
                        { "type": "rect", "at": [0, 0], "size": [96, 96], "fill": "accent-2", "tone": "accent" },
                        { "type": "arrow", "from": [0, 0], "to": [130, 0], "tone": "accent" },
                        { "type": "circle", "at": [0, 0], "r": 4, "fill": "accent", "tone": "accent" }
                      ]
                    },
                    {
                      "type": "arrow",
                      "from": [0, 0],
                      "to": [{ "@path": "/tx" }, { "@path": "/ty" }],
                      "tone": "muted",
                      "dash": true
                    },
                    {
                      "type": "group",
                      "translate": [{ "@path": "/tx" }, { "@path": "/ty" }],
                      "shapes": [
                        { "type": "circle", "at": [0, 0], "r": 5, "fill": "accent", "tone": "accent" },
                        { "type": "text", "at": [0, -12], "text": "t", "tone": "fg" }
                      ]
                    }
                  ]
                }
              ]
            },
            { "id": "angle", "component": "Slider", "label": "Rotation", "min": 0, "max": 360, "step": 1, "value": { "@path": "/angle" } },
            { "id": "tx", "component": "Slider", "label": "Translation x", "min": -120, "max": 120, "step": 2, "value": { "@path": "/tx" } },
            { "id": "ty", "component": "Slider", "label": "Translation y", "min": -100, "max": 100, "step": 2, "value": { "@path": "/ty" } },
            {
              "id": "note",
              "component": "Text",
              "text": "The matrix acts on the homogeneous column vector [x y 1]ᵀ.",
              "variant": "caption"
            }
          ],
          "dataModel": { "angle": 30, "tx": 60, "ty": -40 }
        }
      }
    ]
  }
}
```

## html

General-purpose sandboxed UI. Use it only when no typed kind or `a2ui` fits.

```json
{
  "html": "<div class=\"panel\">...</div>",
  "css": ".panel{display:grid;gap:12px}",
  "js": "const el = document.querySelector('.panel'); el.dataset.ready = 'true'"
}
```

- `html` is required. `css` and `js` are optional strings. The document is a fragment, not a full page.
- The frame has `sandbox="allow-scripts"` without same-origin. It has no network, no storage, no cookies, no parent DOM access, and no bridge back to the app.
- Use only `var(--bg)`, `var(--surface)`, `var(--fg)`, `var(--muted)`, `var(--line)`, `var(--line-strong)`, `var(--accent)`, `var(--critical)`, `var(--success)`, `var(--font)`, `var(--mono)`, and `var(--radius)` for theme values.
- The page is measured after load and after every resize. Set `height` when the initial layout must reserve space before scripts run; the frame clamps it to 160 through 1200 pixels.
- Limits: html 160 kB, css 40 kB, js 80 kB, overall 256 kB.
- Do not use external scripts, styles, fonts, images, `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`, cookies, IndexedDB, or `window.parent`.
- Prefer one exhibit. Use real controls with labels, keyboard focus, and `aria-live` for computed output.
- Label sample data, assumptions, and units inside the page. Do not invent live data or sources.

Full example:

```json
{
  "v": 1,
  "kind": "html",
  "title": "A 3.2:1 gear pair trades speed for torque",
  "subtitle": "16-tooth pinion, 51-tooth wheel, 97% efficiency",
  "height": 400,
  "unit": "rpm, N·m, kW",
  "data": {
    "html": "<div class=\"panel\"><label>Input speed <input id=\"rpm\" type=\"range\" min=\"100\" max=\"3000\" value=\"900\"></label><div class=\"readout\"><span>Output speed</span><strong id=\"speed\" aria-live=\"polite\"></strong></div><p class=\"note\">The wheel turns 3.19 times slower and 3.19 times stronger, less the mesh loss.</p></div>",
    "css": ".panel{display:grid;gap:14px;max-width:440px}label{display:grid;gap:6px;color:var(--muted)}.readout{display:flex;align-items:baseline;justify-content:space-between;gap:16px;padding-top:12px;border-top:1px solid var(--line)}.readout span{color:var(--muted)}.readout strong{font:600 24px var(--mono);color:var(--accent)}.note{margin:0;color:var(--muted);font-size:12px}",
    "js": "const rpm=document.querySelector('#rpm'),out=document.querySelector('#speed'),ratio=51/16;const draw=()=>out.textContent=Math.round(+rpm.value/ratio)+' rpm';rpm.addEventListener('input',draw);draw()"
  },
  "caption": "The same mesh that lowers speed raises torque.",
  "note": "Ideal ratio; mesh efficiency is illustrative.",
  "source": "Gear ratio i = z2 / z1"
}
```

## Review checklist

Before writing the block, check:

- The title states the claim, not the topic.
- Units are named and consistent.
- Every number is either supplied by the user, computed by the renderer, or clearly labeled as an assumption.
- The visual is the smallest one that proves the claim.
- The block has a caption and an assumption or source when the result depends on a model.
- If the block is `html`, it uses theme tokens, has no external network, and shows one exhibit rather than a dashboard.
- If the user asked for a visual, at least one visual is present.
