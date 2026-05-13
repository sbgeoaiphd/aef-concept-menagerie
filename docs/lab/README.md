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
4. EE-side: `image.sampleRegions(...)` → `ee.Classifier.libsvm({kernelType: 'LINEAR'}).train(...)`.
5. Linear weights are recovered with a small trick: classify the zero vector + each one-hot basis vector with `setOutputMode('RAW')`; decode `b = decision[0]`, `w_i = decision[i+1] - b`.
6. Score + prediction layers are added to the Leaflet map via `image.getMap(...)`.
7. The visible map area is captured (`dom-to-image`) as a PNG data URI.
8. Everything (vector, intercept, metadata, optional GeoJSON, embedded image) is rendered to YAML.
9. UI copies the YAML to the user's clipboard and opens `https://github.com/.../new/main/docs/_concepts/?filename=<slug>.yml` in a new tab — GitHub auto-forks, the editor opens, user pastes (Ctrl-V), clicks "Propose new file" → "Create pull request."

No server, no GitHub OAuth, no commit-via-API. The only outbound dependency is Google (for EE auth + tiles).

## Stack

- [Leaflet](https://leafletjs.com/) for the map, Esri World Imagery as the basemap
- [Earth Engine JS API](https://developers.google.com/earth-engine/guides/client_libraries) for sampling + training + visualization
- [Google Identity Services](https://developers.google.com/identity/oauth2/web) for sign-in
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML emit
- [dom-to-image](https://github.com/tsayen/dom-to-image) for the map snapshot

All loaded from CDNs. If any CDN goes down, the page breaks — could be pinned/vendored later.
