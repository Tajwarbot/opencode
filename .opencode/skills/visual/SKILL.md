---
name: visual
description: Use for any mechanical, industrial, or technical answer where a drawing, chart, mechanism, or interactive exhibit would prove the point, even when the user did not ask. Use whenever the user mentions visual, visualization, diagram, chart, animation, simulation, interactive, or asks to see something. Renders an inline interactive visual in the conversation. Not for ordinary tables, static labeled structures that Mermaid already covers, or project files.
---

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

Read `reference.md` in this skill for every field and the full examples.
