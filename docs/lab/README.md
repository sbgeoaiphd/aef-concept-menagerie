# Concept Lab — maintainer notes

This directory contains the browser UI that lets contributors train a new linear concept on Alpha Earth embeddings and open a pull request to the menagerie. The UI is plain HTML/JS, served as-is by GitHub Pages — no build step.

## One-time OAuth setup

Earth Engine calls from the browser need a Google OAuth 2.0 Client ID, registered against this site's origin. The client ID is **public** (it ships in `config.js`) — there is no client secret in the implicit flow. Quota is paid by whoever is signed in.

### Steps in the GCP Console

1. Pick or create a GCP project, enable the **Earth Engine API** (APIs & Services → Library).
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `AEF Concept Menagerie`
   - App domain: `https://sbgeoaiphd.github.io/aef-concept-menagerie/`
   - Authorized domains: `github.io`
   - Developer contact: your email
   - **Data Access / Scopes** — add `https://www.googleapis.com/auth/earthengine` (plus `openid` and `userinfo.email`)
   - **Test users** — add your own Google address (and anyone else allowed to use the lab while in Testing mode)
   - **Publish App** when ready to open to the public (see "Verification warning" below)
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `https://sbgeoaiphd.github.io`
     - `http://localhost:4000` (Jekyll dev)
     - `http://localhost:8000` (Python http.server)
   - Authorized redirect URIs: *(leave blank)*
4. Copy the Client ID and paste it into [`config.js`](config.js).

### Verification warning

The Earth Engine scope is "sensitive." Until the app is verified by Google, users will see a warning screen:

> Google hasn't verified this app

It is harmless — users click *Advanced → Go to AEF Concept Menagerie (unsafe)* to proceed. Verification is optional and requires a YouTube demo video plus a security review. Not worth doing until usage warrants it.

## Local development

```sh
cd docs
bundle exec jekyll serve
# or, just to test lab/ without Jekyll:
cd docs/lab
python -m http.server 8000
```

Open the corresponding `http://localhost:port/` and sign in. Make sure `localhost:port` is listed in **Authorized JavaScript origins** in your OAuth client (see step 3 above).

## How the contribution flow works (static, no backend)

1. User signs in with Google → GIS issues an access token scoped to Earth Engine.
2. `ee.data.setAuthToken(...)` + `ee.initialize(...)` brings the EE JS API online against the user's account.
3. User clicks points on the map, picks a year/asset, hits **Train**.
4. EE-side: `image.sampleRegions(...)` pulls per-point band values; `.getInfo()` brings them client-side.
5. A linear SVM is trained in JS (sub-gradient descent on hinge loss + L2, sklearn `LinearSVC`-equivalent). EE's own `libsvm` is not used because it does not expose the recovered weight vector. ~50–200 samples × 64 features runs in <100 ms.
6. The recovered `(w, b)` are used to build a score image server-side via `image.multiply(w).reduce(sum).add(b)`, then the score + thresholded prediction mask are turned into Leaflet tile layers via `image.getMap(...)`.
7. The visible map area is captured with `dom-to-image`, downscaled to ~900 px, re-encoded as JPEG at quality 0.85 (typically 80–200 KB).
8. Everything (vector, intercept, metadata, optional GeoJSON, embedded image) is rendered into a Jekyll concept file: YAML front matter + empty Markdown body.
9. UI copies the file to the user's clipboard and opens `https://github.com/.../new/main/docs/_concepts/?filename=<slug>.md` in a new tab — GitHub auto-forks, editor opens, user pastes (Ctrl-V), clicks **Commit changes…** → picks a branch → **Propose changes** → fills in title/description → **Create pull request**.

No server, no GitHub OAuth, no commit-via-API. The only outbound dependency is Google (for EE auth + tiles).

## Stack

- [Leaflet](https://leafletjs.com/) for the map, Esri World Imagery as the basemap
- [Earth Engine JS API](https://developers.google.com/earth-engine/guides/client_libraries) for sampling + visualization (training is JS-side, see flow above)
- [Google Identity Services](https://developers.google.com/identity/oauth2/web) for sign-in
- [js-yaml](https://github.com/nodeca/js-yaml) for front-matter emit
- [dom-to-image](https://github.com/tsayen/dom-to-image) for the map snapshot

All loaded from CDNs. If any CDN goes down, the page breaks — could be pinned/vendored later.
