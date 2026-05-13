---
layout: default
title: The AlphaEarth Concept Menagerie
---

# The AlphaEarth Concept Menagerie

Linear directions. Real structure. No benchmarks.

This exhibit is built around **AlphaEarth Foundations** embeddings.  
Read the announcement: [AlphaEarth Foundations helps map our planet in unprecedented detail](https://deepmind.google/blog/alphaearth-foundations-helps-map-our-planet-in-unprecedented-detail/)

Scroll. Look. Click if you must.

<p style="margin:20px 0;">
  <a href="{{ '/lab/' | relative_url }}"
     style="display:inline-block; padding:10px 18px; background:#159957; color:#fff; border-radius:8px; text-decoration:none; font-weight:600;">
    + Contribute a new concept
  </a>
  <span style="margin-left:12px; opacity:0.75;">Train a linear concept in the browser and open a PR.</span>
</p>

{% assign specimens = site.concepts | sort: "order" %}

{% for c in specimens %}
<hr style="margin:56px 0; opacity:0.35;">

<div style="display:flex; gap:22px; align-items:flex-start; flex-wrap:wrap;">
  <div style="min-width:280px;">
    <a href="{{ c.url | relative_url }}" style="text-decoration:none;">
      {% if c.image_data %}
      <img
        src="{{ c.image_data }}"
        alt="{{ c.title | default: c.name | default: 'Unlabeled specimen' }}"
        style="max-width:420px; width:100%; border-radius:10px; border:1px solid rgba(0,0,0,0.12);"
      >
      {% elsif c.image %}
      <img
        src="{{ '/assets/' | append: c.image | relative_url }}"
        alt="{{ c.title | default: c.name | default: 'Unlabeled specimen' }}"
        style="max-width:420px; width:100%; border-radius:10px; border:1px solid rgba(0,0,0,0.12);"
      >
      {% endif %}
    </a>
  </div>

  <div style="max-width:560px;">
    {% assign card_title = c.title | default: c.name %}
    <h2 style="margin-top:0; margin-bottom:10px;">
      {% if c.unlabeled == true or card_title == nil or card_title == "" %}
        Unlabeled Specimen{% if c.specimen_id %} #{{ c.specimen_id }}{% endif %}
      {% else %}
        {{ card_title }}
      {% endif %}
    </h2>

    {% if c.short_note %}
      <p style="margin-top:0;">{{ c.short_note }}</p>
    {% endif %}

    <p style="margin-top:14px;">
      <a href="{{ c.url | relative_url }}">View specimen</a>
      {% if c.reference_url %}
        &nbsp;·&nbsp;
        <a href="{{ c.reference_url }}" target="_blank" rel="noopener">Reference</a>
      {% endif %}
    </p>
  </div>
</div>
{% endfor %}
