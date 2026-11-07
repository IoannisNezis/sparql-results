# sparql-results

A framework-agnostic web component for rendering [SPARQL JSON results](https://www.w3.org/TR/sparql11-results-json/).

Feed it a standard SPARQL results object and a render config, and it draws a
table or a line plot inside a `<sparql-results>` custom element. Tables support
IRI shortening, SPARQL-star, images, and optional infinite-scroll pagination.

## Usage

```js
import "sparql-results";

const el = document.querySelector("sparql-results");

const results = {
  head: { vars: ["country", "population"] },
  results: {
    bindings: [
      {
        country: { type: "literal", value: "Germany" },
        population: { type: "literal", value: "83000000" },
      },
      {
        country: { type: "literal", value: "France" },
        population: { type: "literal", value: "68000000" },
      },
    ],
  },
};

el.render_results(results, { type: "table" });
```

```html
<sparql-results></sparql-results>
```

To draw a line plot instead, pass a `lineplot` config naming the variables to
use for each axis:

```js
el.render_results(results, { type: "lineplot", x: "country", y: ["population"] });
```

## Configuring from the query

A query can carry its own render config as YAML frontmatter in `#+` comment
lines, under a `result-plot` key. Since they are ordinary comments, the query
still runs unchanged against any SPARQL endpoint. Use `extractConfig` to read
the config back out:

```js
import { extractConfig } from "sparql-results";

const parsed = extractConfig(query);
if (parsed.ok) {
  el.render_results(results, parsed.config);
} else {
  console.error(parsed.error);
}
```

A query without `#+` lines (or without a `result-plot` key) yields the default
`{ type: "table" }`. Malformed YAML, unknown fields, and wrongly typed values
produce `{ ok: false, error }`. Only the shape of the config is checked, not
whether the variables it names are actually selected by the query.

### Table

```sparql
#+ result-plot:
#+   type: table
#+   paginated: true
SELECT ?item ?label WHERE {
  ?item rdfs:label ?label .
}
```

| Field       | Type    | Description                                                      |
| ----------- | ------- | ---------------------------------------------------------------- |
| `paginated` | boolean | Enable infinite scrolling via the `load-more` event (optional). |

### Line plot

```sparql
#+ result-plot:
#+   type: lineplot
#+   x: year
#+   y: population
#+   xLabel: Year
#+   yLabel: Inhabitants
SELECT ?year ?population WHERE {
  wd:Q2833 p:P1082 ?statement .
  ?statement ps:P1082 ?population ;
             pq:P585 ?date .
  BIND(YEAR(?date) AS ?year)
}
ORDER BY ?year
```

`y` takes a single variable or a list, drawing one line per variable:

```sparql
#+ result-plot:
#+   type: lineplot
#+   x: year
#+   y: [male, female]
```

| Field    | Type             | Description                                  |
| -------- | ---------------- | -------------------------------------------- |
| `x`      | string           | Variable for the x-axis (required).          |
| `y`      | string \| list   | One or more variables to plot (required).    |
| `xLabel` | string           | x-axis label; defaults to the variable name. |
| `yLabel` | string           | y-axis label; defaults to the variable name. |

### Petrimaps

The `petrimaps` type describes a map rendered by
[qlever-petrimaps](https://github.com/ad-freiburg/qlever-petrimaps). Its
`layers` list mirrors the per-query layer config of the petrimaps
`/query?cfg=` endpoint, one entry per layer.

> **Note:** petrimaps configs are currently parsed and validated only;
> `render_results` does not render them yet.

Plain geometries in a fixed color:

```sparql
#+ result-plot:
#+   type: petrimaps
#+   layers:
#+     - geomfield: ?geometry
#+       name: Benches
#+       style: objects
#+       color: "e6550d"
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
SELECT ?osm_id ?geometry WHERE {
  ?osm_id osmkey:amenity "bench" ;
          geo:hasGeometry/geo:asWKT ?geometry .
}
```

A heatmap weighted by a numeric variable:

```sparql
#+ result-plot:
#+   type: petrimaps
#+   layers:
#+     - geomfield: ?geometry
#+       weightfield: ?population
#+       style: heatmap
#+       colorscheme: YlOrRd
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?place ?geometry ?population WHERE {
  ?place osmkey:place "city" ;
         osmkey:population ?pop ;
         geo:hasGeometry/geo:asWKT ?geometry .
  BIND(xsd:integer(?pop) AS ?population)
}
```

A raster, aggregating the weight into grid cells of `rasterw` × `rasterh`
web-mercator pseudometers:

```sparql
#+ result-plot:
#+   type: petrimaps
#+   layers:
#+     - geomfield: ?geometry
#+       weightfield: ?population
#+       style: raster
#+       rasterw: 5000
#+       rasterh: 5000
#+       colorscheme: spectralexp
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?place ?geometry ?population WHERE {
  ?place osmkey:place ?type ;
         osmkey:population ?pop ;
         geo:hasGeometry/geo:asWKT ?geometry .
  BIND(xsd:integer(?pop) AS ?population)
}
```

Several layers, each with its own geometry variable and style. `group` puts
layers under a shared tab in the layer switcher; a `checkbox` layer can be
switched on and off on its own, and `enabled: false` starts it switched off:

```sparql
#+ result-plot:
#+   type: petrimaps
#+   layers:
#+     - id: stations
#+       name: Railway stations
#+       group: Railways
#+       geomfield: ?station_geom
#+       style: objects
#+       color: "3388ff"
#+       pointradius: 5
#+     - id: lines
#+       name: Railway lines
#+       group: Railways
#+       geomfield: ?line_geom
#+       toggle: checkbox
#+       enabled: false
#+       style: objects
#+       color: "636363"
#+       linew: 2
#+       lineopacity: 0.8
```

| Field         | Type    | Description                                                                 |
| ------------- | ------- | --------------------------------------------------------------------------- |
| `geomfield`   | string  | Variable holding the WKT geometry, with leading `?` (required).             |
| `id`          | string  | Stable layer id; generated by petrimaps if omitted.                         |
| `name`        | string  | Layer name shown in the UI; defaults to `geomfield`.                        |
| `weightfield` | string  | Variable holding a numeric weight for `heatmap` and `raster` styles.        |
| `rasterfield` | string  | Variable holding the raster-metadata subject.                               |
| `toggle`      | string  | `checkbox` (switched on/off on its own) or `radio` (default, exclusive).    |
| `enabled`     | boolean | Whether a `checkbox` layer starts switched on (default `true`).             |
| `group`       | string  | Layer-switcher tab to list the layer under; ungrouped layers share one.     |
| `rasterw`     | integer | Raster cell width in web-mercator pseudometers (default `10`).              |
| `rasterh`     | integer | Raster cell height in web-mercator pseudometers (default `10`).             |
| `color`       | string  | 6-digit hex color without `#` (default `"3388ff"`).                         |
| `colorscheme` | string  | Heatmap/raster color scheme (default `spectralexp`).                        |
| `style`       | string  | `auto` (default), `objects`, `heatmap` or `raster`.                         |
| `linew`       | number  | Line width of rendered objects (default `3`).                               |
| `fillopacity` | number  | Polygon fill opacity, `0`–`1` (default `0.5`).                              |
| `lineopacity` | number  | Line opacity, `0`–`1` (default `1`).                                        |
| `pointradius` | number  | Radius of rendered points (default `3`).                                    |

Variable fields (`geomfield`, `weightfield`, `rasterfield`) take the
variable name with its leading `?`, e.g. `?geometry`.

Quote `color` values: an all-digit hex like `"000000"` would otherwise parse as
a YAML number. Available color schemes are `spectral`, `RdYlGn`, `RdYlBu`,
`RdGy`, `YlOrRd`, `Blues`, `Greens`, `Greys`, `Oranges` and `Reds`, each also
with an `exp` suffix (e.g. `Bluesexp`), plus `w2b` and `b2w` for heatmaps.

## Development

```sh
npm run dev      # start the Vite dev server with a fixture browser
npm run build    # type-check and build the distributable
```

## License

[Apache-2.0](LICENSE)
