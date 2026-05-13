// AEF Concept Lab — browser-only labeling + EE training + static PR contribution.

const EE_SCOPE = "https://www.googleapis.com/auth/earthengine";

const state = {
  signedIn: false,
  tokenClient: null,
  map: null,
  pointsLayer: null,
  points: [],          // { lat, lng, label: 0|1, marker }
  bandNames: null,
  embeddingImage: null,
  weights: null,       // Float64Array of length n
  intercept: null,     // number
  scoreLayer: null,
  predLayer: null,
  snapshotDataUrl: null,
};

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);
function setStatus(elId, msg, isError) {
  const el = $(elId);
  el.textContent = msg || "";
  el.classList.toggle("error", !!isError);
}
function setBusy(btn, on, busyLabel) {
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.textContent = busyLabel || "Working…";
    btn.disabled = true;
  } else {
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
    btn.disabled = false;
  }
}

// ---------- Sign-in ----------
function bootSignIn() {
  if (!window.LAB_CONFIG?.oauthClientId) {
    $("setup-banner").style.display = "block";
    $("signin-btn").disabled = true;
    return;
  }

  // GIS may load after this script — wait for it.
  function ready() {
    state.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: window.LAB_CONFIG.oauthClientId,
      scope: EE_SCOPE,
      callback: onTokenResponse,
    });
  }
  if (window.google?.accounts?.oauth2) ready();
  else {
    const iv = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(iv);
        ready();
      }
    }, 100);
  }

  $("signin-btn").addEventListener("click", () => {
    if (!state.tokenClient) return;
    state.tokenClient.requestAccessToken({ prompt: state.signedIn ? "" : "consent" });
  });
}

function onTokenResponse(resp) {
  console.log("[lab] GIS token response:", resp);
  if (resp.error) {
    $("auth-status").textContent = `Sign-in error: ${resp.error}`;
    return;
  }
  if (typeof ee === "undefined") {
    $("auth-status").textContent = "EE JS API didn't load (check console).";
    console.error("[lab] `ee` global is undefined — EE JS API failed to load.");
    return;
  }
  try {
    console.log("[lab] calling ee.data.setAuthToken…");
    ee.data.setAuthToken(
      window.LAB_CONFIG.oauthClientId,
      "Bearer",
      resp.access_token,
      resp.expires_in,
      null,
      null,
      false
    );
    console.log("[lab] setAuthToken returned, calling ee.initialize…");
    initEarthEngine();
  } catch (err) {
    console.error("[lab] setAuthToken threw:", err);
    $("auth-status").textContent = "EE auth setup failed: " + err.message;
  }
}

function initEarthEngine() {
  ee.initialize(
    null, null,
    () => {
      console.log("[lab] ee.initialize success");
      state.signedIn = true;
      $("auth-status").textContent = "Signed in";
      $("signin-btn").textContent = "Re-authenticate";
      resolveEmbeddingImage()
        .then(() => console.log("[lab] embedding resolved:", state.bandNames?.length, "bands"))
        .catch(err => {
          console.error("[lab] embedding resolve failed:", err);
          $("auth-status").textContent = "EE init OK, but asset failed: " + err.message;
        });
    },
    (err) => {
      console.error("[lab] ee.initialize error:", err);
      $("auth-status").textContent = "EE init failed: " + err;
    }
  );
}

// ---------- Map ----------
function bootMap() {
  state.map = L.map("map", { preferCanvas: false }).setView([40.7, -74.0], 9);

  // crossOrigin lets us capture the canvas to PNG later without tainting.
  const satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri",
      maxZoom: 19,
      crossOrigin: "anonymous",
    }
  ).addTo(state.map);

  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
      crossOrigin: "anonymous",
    }
  );

  // CartoDB Voyager — clean political/road map with labels, good companion to satellite.
  const cartoVoyager = L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 20,
      subdomains: "abcd",
      crossOrigin: "anonymous",
    }
  );

  // Esri reference overlay — boundaries + place names on top of any base.
  const esriLabels = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Reference &copy; Esri",
      maxZoom: 19,
      crossOrigin: "anonymous",
    }
  );

  state.pointsLayer = L.layerGroup().addTo(state.map);

  state.layerControl = L.control.layers(
    {
      "Satellite (Esri)": satellite,
      "Streets (CARTO)": cartoVoyager,
      "OpenStreetMap": osm,
    },
    {
      "Place labels": esriLabels,
      "Labels": state.pointsLayer,
    },
    { collapsed: false, position: "topright" }
  ).addTo(state.map);

  state.map.on("click", onMapClick);
}

function onMapClick(e) {
  if (!state.signedIn) {
    setStatus("train-status", "Sign in to Earth Engine first.", true);
    return;
  }
  const label = parseInt(
    document.querySelector('input[name="label"]:checked').value, 10
  );
  addPoint(e.latlng.lat, e.latlng.lng, label);
}

function addPoint(lat, lng, label) {
  const color = label === 1 ? "#2d7" : "#d33";
  const marker = L.circleMarker([lat, lng], {
    radius: 5,
    color: color,
    fillColor: color,
    fillOpacity: 0.85,
    weight: 1,
  });
  marker.addTo(state.pointsLayer);
  state.points.push({ lat, lng, label, marker });
  refreshCounts();
}

function refreshCounts() {
  const pos = state.points.filter(p => p.label === 1).length;
  const neg = state.points.filter(p => p.label === 0).length;
  $("pos-count").textContent = pos;
  $("neg-count").textContent = neg;
  $("train-btn").disabled = !(state.signedIn && pos >= 2 && neg >= 2);
}

function undoLastPoint() {
  const p = state.points.pop();
  if (p) state.pointsLayer.removeLayer(p.marker);
  refreshCounts();
}

function clearPoints() {
  state.points.forEach(p => state.pointsLayer.removeLayer(p.marker));
  state.points = [];
  state.weights = null;
  state.intercept = null;
  state.snapshotDataUrl = null;
  removeLayer("scoreLayer");
  removeLayer("predLayer");
  refreshCounts();
  $("contribute-section").style.display = "none";
  setStatus("train-status", "");
  $("snapshot-preview-wrap").style.display = "none";
  $("snapshot-preview").src = "";
  $("recapture-btn").textContent = "Capture from map";
}

// ---------- Earth Engine: asset + training ----------
async function resolveEmbeddingImage() {
  const assetId = $("asset-id").value.trim();
  const year = parseInt($("year-select").value, 10);
  state.bandNames = null;
  state.embeddingImage = null;

  return new Promise((resolve, reject) => {
    ee.data.getAsset(assetId, (info, err) => {
      if (err) return reject(new Error(err));
      // EE JS returns "Image" / "ImageCollection" (CamelCase); Python uses uppercase.
      const t = (info.type || "").toUpperCase();
      let img;
      if (t === "IMAGE") {
        img = ee.Image(assetId);
      } else if (t === "IMAGECOLLECTION" || t === "IMAGE_COLLECTION") {
        const start = ee.Date.fromYMD(year, 1, 1);
        const end = start.advance(1, "year");
        const coll = ee.ImageCollection(assetId)
          .filterDate(start, end)
          .sort("system:time_start", false);
        img = ee.Image(coll.mosaic());
      } else {
        return reject(new Error("Asset is neither Image nor ImageCollection: " + info.type));
      }
      img.bandNames().evaluate((names, err2) => {
        if (err2) return reject(new Error(err2));
        state.embeddingImage = img;
        state.bandNames = names;
        resolve();
      });
    });
  });
}

function buildTrainingFC() {
  const features = state.points.map(p =>
    ee.Feature(ee.Geometry.Point([p.lng, p.lat]), { label: p.label })
  );
  return ee.FeatureCollection(features);
}

async function train() {
  setStatus("train-status", "Resolving embedding image…");
  await resolveEmbeddingImage();

  setStatus("train-status", "Sampling embedding at labeled points…");
  const trainFC = buildTrainingFC();
  const samples = state.embeddingImage.sampleRegions({
    collection: trainFC,
    properties: ["label"],
    scale: 10,
    geometries: false,
  });

  // Pull samples client-side; the sample count is tiny so this is cheap.
  const samplesJson = await new Promise((resolve, reject) =>
    samples.evaluate((v, e) => e ? reject(new Error(e)) : resolve(v))
  );
  const usable = (samplesJson.features || []).filter(f =>
    state.bandNames.every(name => f.properties[name] != null)
  );
  console.log(`[lab] pulled ${usable.length} usable samples (of ${samplesJson.features?.length || 0})`);
  if (usable.length < 4) {
    throw new Error(`Only ${usable.length} usable samples after dropping nulls; need at least 4.`);
  }
  const X = usable.map(f => state.bandNames.map(name => Number(f.properties[name])));
  const y = usable.map(f => f.properties.label === 1 ? 1 : -1);
  const numPos = y.filter(v => v === 1).length;
  const numNeg = y.filter(v => v === -1).length;
  if (numPos < 2 || numNeg < 2) {
    throw new Error(`After dropping nulls: ${numPos} positives, ${numNeg} negatives. Need ≥2 of each.`);
  }

  setStatus("train-status", `Training linear SVM in JS on ${X.length} samples…`);
  const { w, b } = trainLinearSVM(X, y, { C: 1.0, epochs: 200 });
  state.weights = w;
  state.intercept = b;
  console.log("[lab] weights:", Array.from(w).map(v => v.toFixed(3)).join(","), "  b:", b.toFixed(3));

  // Diagnostic: training-score distribution, separated by class.
  const scoresPos = [], scoresNeg = [];
  for (let i = 0; i < X.length; i++) {
    let s = b;
    for (let j = 0; j < w.length; j++) s += w[j] * X[i][j];
    (y[i] === 1 ? scoresPos : scoresNeg).push(s);
  }
  const summary = (arr) => arr.length
    ? `min=${Math.min(...arr).toFixed(2)} median=${arr.slice().sort((a, b) => a - b)[arr.length >> 1].toFixed(2)} max=${Math.max(...arr).toFixed(2)}`
    : "(none)";
  console.log("[lab] training scores | positives:", summary(scoresPos));
  console.log("[lab] training scores | negatives:", summary(scoresNeg));
  // Stash the positive score max — used to pick the EE Code Editor `hi` bound.
  state.posScoreMax = scoresPos.length ? Math.max(...scoresPos) : 1.0;

  setStatus("train-status", "Rendering score + prediction layers…");
  await renderScoreLayers(w, b);

  setStatus("train-status", `Done. Trained on ${state.points.length} points; ${w.length}-d vector.`);
  $("contribute-section").style.display = "block";
  $("open-pr-btn").disabled = false;
  // Snapshot is captured on-demand via the "Recapture from map" button so the
  // user can choose the framing/zoom/layers they want before saving.
}

// Linear SVM via subgradient descent on hinge loss + L2 (sklearn LinearSVC-equivalent).
// Returns { w, b } with the convention that label +1/-1 maps to score > 0 / < 0.
function trainLinearSVM(X, y, opts = {}) {
  const C = opts.C ?? 1.0;
  const epochs = opts.epochs ?? 200;
  const lr = opts.lr ?? 0.01;
  const n = X.length;
  const d = X[0].length;
  const lambda = 1.0 / (C * n);
  const w = new Float64Array(d);
  let b = 0;

  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;

  for (let e = 0; e < epochs; e++) {
    // Fisher–Yates shuffle.
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    for (let k = 0; k < n; k++) {
      const i = order[k];
      const xi = X[i];
      const yi = y[i];
      let wx = b;
      for (let j = 0; j < d; j++) wx += w[j] * xi[j];
      const margin = yi * wx;
      // L2 shrinkage every step (does not touch bias, matches sklearn LinearSVC).
      const shrink = 1 - lr * lambda;
      for (let j = 0; j < d; j++) w[j] *= shrink;
      if (margin < 1) {
        for (let j = 0; j < d; j++) w[j] += lr * yi * xi[j];
        b += lr * yi;
      }
    }
  }
  return { w, b };
}

async function renderScoreLayers(w, b) {
  const names = state.bandNames;
  const weightsImg = ee.Image.constant(Array.from(w)).rename(names);
  const score = state.embeddingImage
    .select(names)
    .multiply(weightsImg)
    .reduce(ee.Reducer.sum())
    .add(b)
    .rename("svm_score");

  // Symmetric range around 0 for the visualization. The decision boundary is at 0,
  // so this gives blue-white-red color stretch with white = decision boundary.
  const span = 2.0;
  const lo = -span, hi = span;

  const scoreVis = { min: lo, max: hi, palette: ["0000ff", "ffffff", "ff0000"] };
  // selfMask leaves only pixels with value 1; explicit min/max guards against
  // EE defaulting to the wrong range when the palette has a single color.
  const predImg = score.gt(0).selfMask().rename("pred");
  const predVis = { min: 1, max: 1, palette: ["00ff00"] };

  removeLayer("scoreLayer");
  removeLayer("predLayer");
  // Prediction layer is on by default; score layer is opt-in via the legend.
  state.scoreLayer = await eeLayer(score, scoreVis, 0.85, "Score (continuous)", false);
  state.predLayer = await eeLayer(predImg, predVis, 0.65, "Prediction (mask)", true);
}

function eeLayer(eeImage, vis, opacity, name, visibleByDefault) {
  return new Promise((resolve, reject) => {
    eeImage.getMap(vis, (mapInfo, err) => {
      if (err) return reject(new Error(err));
      const layer = L.tileLayer(mapInfo.urlFormat, {
        opacity,
        crossOrigin: "anonymous",
      });
      if (visibleByDefault) layer.addTo(state.map);
      if (state.layerControl) state.layerControl.addOverlay(layer, name);
      resolve(layer);
    });
  });
}

function removeLayer(key) {
  if (state[key]) {
    state.map.removeLayer(state[key]);
    if (state.layerControl) state.layerControl.removeLayer(state[key]);
    state[key] = null;
  }
}

// ---------- Snapshot ----------
async function captureSnapshot() {
  console.log("[lab] capturing snapshot…");
  const node = document.getElementById("map");
  let rawDataUrl;
  try {
    rawDataUrl = await domtoimage.toPng(node, {
      width: node.clientWidth,
      height: node.clientHeight,
      style: { transform: "none" },
      cacheBust: false,
      // Skip the zoom +/- and the layer toggle control. Attribution stays
      // (required by Esri/OSM/Carto licenses).
      filter: (n) => {
        if (!(n instanceof Element)) return true;
        const cls = n.classList;
        if (!cls) return true;
        if (cls.contains("leaflet-control-zoom")) return false;
        if (cls.contains("leaflet-control-layers")) return false;
        return true;
      },
    });
  } catch (err) {
    console.error("[lab] snapshot capture failed:", err);
    throw new Error("Snapshot failed: " + (err.message || err));
  }
  console.log(`[lab] raw snapshot: ${(rawDataUrl.length / 1024).toFixed(0)} KB`);
  const dataUrl = await downscaleImage(rawDataUrl, 900, "image/jpeg", 0.85);
  console.log(`[lab] downscaled snapshot: ${(dataUrl.length / 1024).toFixed(0)} KB`);
  state.snapshotDataUrl = dataUrl;
  $("snapshot-preview").src = dataUrl;
  $("snapshot-preview-wrap").style.display = "";
  $("recapture-btn").textContent = "Recapture from map";
  return dataUrl;
}

function onSnapshotUpload(evt) {
  const file = evt.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const raw = reader.result;
    console.log(`[lab] uploaded image: ${(raw.length / 1024).toFixed(0)} KB`);
    const dataUrl = await downscaleImage(raw, 900, "image/jpeg", 0.85);
    console.log(`[lab] downscaled upload: ${(dataUrl.length / 1024).toFixed(0)} KB`);
    state.snapshotDataUrl = dataUrl;
    $("snapshot-preview").src = dataUrl;
    $("snapshot-preview-wrap").style.display = "";
  };
  reader.readAsDataURL(file);
}

// Downscale a data URI to maxWidth and re-encode as JPEG.
// Keeps aspect ratio; if the source is already smaller, just re-encodes.
function downscaleImage(dataUrl, maxWidth, mimeType, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL(mimeType, quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(new Error("Image decode failed"));
    img.src = dataUrl;
  });
}

// ---------- Build YAML + open PR ----------
function buildPointsGeoJSON() {
  return {
    type: "FeatureCollection",
    features: state.points.map(p => ({
      type: "Feature",
      properties: {
        label: p.label === 1 ? "positive" : "negative",
        latitude: p.lat,
        longitude: p.lng,
      },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    })),
  };
}

function downloadPoints() {
  if (state.points.length === 0) {
    setStatus("train-status", "No points to download.", true);
    return;
  }
  const gj = buildPointsGeoJSON();
  const text = JSON.stringify(gj, null, 2);
  const blob = new Blob([text], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "").replace("T", "T");
  a.href = url;
  a.download = `labeled_points_${ts}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`[lab] downloaded ${state.points.length} points`);
}

async function uploadPoints(file) {
  if (!file) return;
  const text = await file.text();
  let gj;
  try {
    gj = JSON.parse(text);
  } catch (err) {
    setStatus("train-status", `Not valid JSON: ${err.message}`, true);
    return;
  }
  if (gj.type !== "FeatureCollection" || !Array.isArray(gj.features)) {
    setStatus("train-status", "Expected a GeoJSON FeatureCollection.", true);
    return;
  }

  let added = 0, skipped = 0;
  const bounds = [];
  for (const f of gj.features) {
    if (!f || f.type !== "Feature" || !f.geometry) { skipped++; continue; }
    if (f.geometry.type !== "Point") { skipped++; continue; }
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) { skipped++; continue; }
    const labelRaw = String(f.properties?.label ?? "").toLowerCase().trim();
    if (labelRaw !== "positive" && labelRaw !== "negative") { skipped++; continue; }
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) { skipped++; continue; }
    addPoint(lat, lng, labelRaw === "positive" ? 1 : 0);
    bounds.push([lat, lng]);
    added++;
  }

  if (added > 0 && bounds.length > 0) {
    state.map.fitBounds(L.latLngBounds(bounds).pad(0.2));
  }
  const msg = `Loaded ${added} points` + (skipped ? ` (${skipped} skipped — wrong type or label).` : ".");
  setStatus("train-status", msg, skipped > 0 && added === 0);
  console.log("[lab]", msg);
}

function slugify(s) {
  return (s || "concept").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "concept";
}

function buildYaml() {
  const title = $("concept-name").value.trim() || "Unnamed Concept";
  const slug = slugify(title);
  const center = state.map.getCenter();

  const payload = {
    layout: "concept",
    title,
    short_note: $("concept-short-note").value.trim(),
    description: $("concept-description").value.trim(),
    vector: Array.from(state.weights).map(v => Number(v.toFixed(4))),
    intercept: Number(state.intercept.toFixed(4)),
    lat: Number(center.lat.toFixed(4)),
    lon: Number(center.lng.toFixed(4)),
    zoom: state.map.getZoom(),
    lo: 0,
    hi: Number((state.posScoreMax ?? 1.0).toFixed(2)),
    embedding_asset: $("asset-id").value.trim(),
    embedding_year: parseInt($("year-select").value, 10),
    notes: $("concept-notes").value.trim(),
    created_at: new Date().toISOString().slice(0, 10),
  };
  const author = $("concept-author").value.trim().replace(/^@/, "");
  if (author) payload.created_by = author;

  if (state.snapshotDataUrl) payload.image_data = state.snapshotDataUrl;

  if ($("include-points").checked) {
    payload.points_geojson = JSON.stringify(buildPointsGeoJSON());
  }

  // Re-order keys: layout/title first, heavy fields (image_data, points_geojson) last.
  const orderedKeys = [
    "layout", "title", "short_note", "description",
    "vector", "intercept",
    "lat", "lon", "zoom", "lo", "hi",
    "embedding_asset", "embedding_year", "notes",
    "created_by", "created_at",
    "points_geojson", "image_data",
  ];
  const ordered = {};
  for (const k of orderedKeys) if (k in payload) ordered[k] = payload[k];

  const yamlBody = jsyaml.dump(ordered, { lineWidth: 100000, noRefs: true });
  // Jekyll collection items: YAML front-matter + body. Body is the rendered
  // content; we leave a marker so the file looks intentional.
  const text = "---\n" + yamlBody + "---\n\n<!-- Generated by the Lab. -->\n";
  return { slug, text };
}

async function copyAndOpenPR() {
  if (!state.weights) {
    setStatus("pr-status", "Train a concept first.", true);
    return;
  }
  if (!$("concept-name").value.trim()) {
    setStatus("pr-status", "Give the concept a name first.", true);
    return;
  }
  const { slug, text } = buildYaml();

  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    setStatus("pr-status",
      "Couldn't auto-copy to clipboard. Use the textarea below to copy the file manually.", true);
    showFallbackTextarea(text);
    return;
  }

  const { owner, name: repo, branch } = window.LAB_CONFIG.repo;
  const url = `https://github.com/${owner}/${repo}/new/${branch}/docs/_concepts/?filename=${encodeURIComponent(slug + ".md")}`;
  window.open(url, "_blank", "noopener");
  setStatus("pr-status",
    `Concept file copied to clipboard (${(text.length / 1024).toFixed(0)} KB). The GitHub editor opened in a new tab. There:
    (1) Ctrl+V to paste.
    (2) Click "Commit changes…" (top right).
    (3) Pick a branch name, click "Propose changes".
    (4) Add a PR title + description.
    (5) Click "Create pull request".`);
  showFallbackTextarea(text); // also show it for re-copy / paranoia
}

function showFallbackTextarea(text) {
  let ta = document.getElementById("yaml-fallback");
  if (!ta) {
    ta = document.createElement("textarea");
    ta.id = "yaml-fallback";
    ta.readOnly = true;
    ta.style.width = "100%";
    ta.style.height = "120px";
    ta.style.marginTop = "8px";
    ta.style.fontFamily = "monospace";
    ta.style.fontSize = "11px";
    $("contribute-section").appendChild(ta);
  }
  ta.value = text;
}

// ---------- Wire it all up ----------
function bootControls() {
  $("undo-btn").addEventListener("click", undoLastPoint);
  $("clear-points-btn").addEventListener("click", clearPoints);
  $("download-points-btn").addEventListener("click", downloadPoints);
  $("upload-points").addEventListener("change", (e) => uploadPoints(e.target.files?.[0]));
  $("train-btn").addEventListener("click", () => {
    setBusy($("train-btn"), true, "Training…");
    train()
      .catch(err => setStatus("train-status", "Failed: " + (err.message || err), true))
      .finally(() => setBusy($("train-btn"), false));
  });
  $("recapture-btn").addEventListener("click", () => {
    captureSnapshot().catch(err => {
      setStatus("pr-status", err.message || String(err), true);
    });
  });
  $("snapshot-upload").addEventListener("change", onSnapshotUpload);
  $("open-pr-btn").addEventListener("click", copyAndOpenPR);
  $("year-select").addEventListener("change", () => {
    if (state.signedIn) resolveEmbeddingImage().catch(() => { });
  });
  $("asset-id").addEventListener("change", () => {
    if (state.signedIn) resolveEmbeddingImage().catch(() => { });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  bootMap();
  bootControls();
  bootSignIn();
});
