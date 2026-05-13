# Contributing a concept

The menagerie collects linear concept vectors trained on Alpha Earth embeddings. Each concept is a single Markdown file (front-matter only) in [docs/_concepts/](docs/_concepts/) carrying the vector, a screenshot, and a short description.

## The easy way: the Lab

Go to **[the Lab](https://sbgeoaiphd.github.io/aef-concept-menagerie/lab/)**, sign in with a Google account that has Earth Engine access, click positives and negatives on the map, hit Train. When you're happy with the result, fill in the name and notes, click **Copy YAML + open PR** — GitHub opens in a new tab with a blank file editor. Then:

1. Paste with `Ctrl+V` (or `Cmd+V`)
2. Click **Commit changes…** (top right)
3. Pick a branch name, click **Propose changes** (GitHub auto-forks if you don't have push access)
4. Add a PR title + description
5. Click **Create pull request**

That's the whole flow. No clones, no Python, no auth handshakes with this repo.

### What you need

- A Google account with Earth Engine access ([sign up](https://earthengine.google.com/) — it's free for non-commercial use).
- A GitHub account (any).

### Notes on the screenshot

Frame the map how you'd like the gallery to show the concept, then click **Capture from map**. Or upload your own (e.g. an export from the EE Code Editor) before opening the PR.

### Notes on labeled points

The Lab can optionally include your labeled points (as inline GeoJSON) in the YAML. Including them makes the concept retrainable by other people. Strongly encouraged.

## The other way: hand-edit a YAML

If the Lab doesn't work for you (or you trained the concept somewhere else), add a file under `docs/_concepts/<slug>.md` matching the schema below and open a PR.

```yaml
---
layout: concept
title: My Concept
short_note: One-liner shown in the gallery
description: Longer description of what the concept captures and how it was trained.
vector: [<n floats>]                                    # required
intercept: 0.0                                          # optional
lat: 32.6                                               # optional, default map center for the EE link
lon: -87.6
zoom: 11
lo: 0                                                   # EE visualization lower bound
hi: 2.0                                                 # EE visualization upper bound
embedding_asset: GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL   # optional
embedding_year: 2024                                    # optional
notes: Anything else worth recording, freeform.
created_by: yourgithubhandle                            # optional
created_at: 2026-05-13                                  # optional
image: my_concept.png                                   # for a file in docs/assets/
# OR:
image_data: "data:image/png;base64,..."                 # inline screenshot (what the Lab emits)
points_geojson: |                                       # optional, inline GeoJSON of labels
  { "type": "FeatureCollection", "features": [...] }
reference_url: https://...                              # optional link to source / writeup
---

<!-- Body left intentionally empty; the layout renders everything from front matter. -->
```

The image, `points_geojson`, and reference link are optional. The vector is the only field that has to be present and right.

## License

By contributing a concept, you agree it can be redistributed under the repository's MIT license. The labeled points (if you include them) and the screenshot are covered by the same license. Don't contribute labeled points that aren't yours to share.

## Review

A maintainer will glance at PRs to make sure the YAML is valid, the metadata isn't empty, and the concept isn't a duplicate of an existing one. Linear-concept quality isn't gatekept — interesting failures are also interesting.
