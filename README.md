# Food engineering tools
Static Persian RTL site (no build step or backend). Open `index.html` in a browser.
GitHub Pages: Settings > Pages > Deploy from branch > main / root.

## Pages
- `thermal.html`, `formulation.html`, `fitting.html`: thermal process, least-cost formulation, model fitting.
- `dairy.html`, `bakery.html`, `beverage.html`: industry tools.
- `design.html`: Factory Design hub for industry-specific modules.
- `dairy-design.html`: dairy factory pre-sizing (reception, balances, equipment, packaging, cold store, site services, utility load summary, economics).
- `plant-utilities.html`: shared heat exchanger, steam/condensate, boiler, pump and CIP dosing calculators.
- `about.html`: methods and limits.

## Shared files
- `style.css`, `ui.js`, `engine.js`: styles and the original tools' helpers/engine.
- `nav.js`: header dropdown menus (hover/click/Esc). The header and footer markup is identical on every page.
- `design-core.js`: calculator definitions and renderer for the factory-design pages.

The design tools use editable illustrative examples. Each calculator shows its formulas and assumptions. Calculators are independent: transfer results manually and verify coincident demands. These estimates are not approved process conditions or construction specifications.

To add an industry, create a page and calculator definitions modeled on `dairy-design.html` and `dairy-design.js`, load the shared `design-core.js`, and link the page from `design.html` and from the "طراحی کارخانه" menu in every page header.

Run numerical regression checks with `node --test tests/design.test.cjs`.
