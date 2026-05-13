# AlphaEarth Concept Menagerie

A curated exhibit of linear concepts discovered in [AlphaEarth Foundations](https://deepmind.google/blog/alphaearth-foundations-helps-map-our-planet-in-unprecedented-detail/) embeddings.

Each specimen is a single 64-dimensional vector that, when dotted with the embedding image, lights up a real-world feature: catfish ponds, palm-oil-mill lagoons, the northern edges of woodlands. Linear directions, real structure, no benchmarks.

## Browse

→ **[sbgeoaiphd.github.io/aef-concept-menagerie](https://sbgeoaiphd.github.io/aef-concept-menagerie/)**

## Contribute

Two paths, both end in a pull request:

- **The Lab** ([sbgeoaiphd.github.io/aef-concept-menagerie/lab/](https://sbgeoaiphd.github.io/aef-concept-menagerie/lab/)) — a browser UI that signs you in to Earth Engine (using *your* EE quota), lets you click positive/negative examples on a satellite map, trains a linear SVM in the browser, and emits a ready-to-paste concept file. No clones, no Python, no token handshakes.
- **Hand-edit** a Markdown file in [docs/_concepts/](docs/_concepts/). The schema is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

In both cases: open a pull request, a maintainer reviews and merges, and your concept appears in the menagerie.

## Repo layout

```
docs/
├── _config.yml                  Jekyll config (Pages serves /docs)
├── index.md                     Gallery home
├── _layouts/concept.html        Per-specimen page (renders front-matter)
├── _concepts/*.md               One file per concept (YAML front-matter)
├── assets/*.png                 Screenshots referenced by concepts
└── lab/                         The browser contribution UI
    ├── index.html
    ├── app.js                   Auth + labeling + JS-side SVM + PR flow
    ├── config.js                OAuth client ID + repo coords
    ├── styles.css
    └── README.md                Maintainer notes incl. OAuth setup
CONTRIBUTING.md                  Contributor guide (Lab + hand-edit)
LICENSE                          MIT
```

## License

MIT. Contributed concepts (vectors, screenshots, training points) are redistributed under the same terms — see [CONTRIBUTING.md](CONTRIBUTING.md) for details.
