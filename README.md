# Logarina (لُگارینا)
Persian food-engineering calculators. Static site, no build step on the server. Open `index.html` to browse, or serve this folder from any static host. For consistent webfont and saved-result behavior, use a local HTTP server: `python3 -m http.server` and then open `http://localhost:8000/`.

## Visual theme
`style.css` layers the responsive Logarina theme over `base.css`, keeping the calculator markup and behavior intact. `wheat-field.webp` is a web-optimized copy of Tim Mossholder’s [Vandenberg Village wheatfield](https://commons.wikimedia.org/wiki/File:Vandenberg_Village_wheatfield_(Unsplash).jpg), released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). See `FONT-LICENSE.txt` for the bundled font license.

Pages: home, thermal, formulation, fitting, dairy, bakery, beverage, coldstore (cold store), design (factory design hub), dairy-design (dairy factory design, 17 tools), plant-utilities (5 tools), about, units (converter), glossary, results (saved results), login, signup.
Saved results use browser localStorage for now (demo); replace with the database API in the Laravel version.
Login and signup are DEMO pages: they validate input in the browser and save/send nothing.

## Factory design
- `design-core.js`: shared helpers and renderer for the factory-design pages (tabs, inputs, live results, per-tool guide).
- `dairy-design.js`, `plant-utilities.js`: the calculators. Each tool has its fields, formula, description, input sources, warnings and a worked example computed from its own defaults. To add a tool, add an object there; the page, guide and tests pick it up. To add an industry, copy `dairy-design.js`, add a page in `tools/build_site.py`, and link it in `GROUPS`.
- `tests/design.test.cjs`: numerical regression tests. Run: `node --test tests/design.test.cjs`.

## Shared header, footer and search
`tools/build_site.py` writes the grouped main navigation (`nav.js` handles the dropdowns), the footer and the factory-design pages, and updates `search-index.js` for them. Run `python3 tools/build_site.py` from this folder after changing nav or footer links. If your own page generator (build_pages.py) also writes headers, copy the `GROUPS`, `nav()` and `FOOTER` definitions from this script into it so they do not overwrite each other.

GitHub Pages: Settings > Pages > Deploy from branch > main / root.
