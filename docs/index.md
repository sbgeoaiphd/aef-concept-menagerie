---
layout: default
title: The AlphaEarth Concept Menagerie
---

# The AlphaEarth Concept Menagerie

Linear directions. Real structure. No benchmarks.

This exhibit is built around **AlphaEarth Foundations** embeddings.  
Read the announcement: [AlphaEarth Foundations helps map our planet in unprecedented detail](https://deepmind.google/blog/alphaearth-foundations-helps-map-our-planet-in-unprecedented-detail/)

Scroll. Look. Click if you must.

{% assign specimens = site.concepts | sort: "order" %}

{% for c in specimens %}
<hr style="margin:56px 0; opacity:0.35;">

<div style="display:flex; gap:22px; align-items:flex-start; flex-wrap:wrap;">
  <div style="min-width:280px;">
    <a href="{{ c.url | relative_url }}" style="text-decoration:none;">
      <img
        src="{{ '/assets/' | append: c.image | relative_url }}"
        alt="{% if c.title and c.title != '' %}{{ c.title }}{% else %}Unlabeled specimen{% endif %}"
        style="max-width:420px; width:100%; border-radius:10px; border:1px solid rgba(0,0,0,0.12);"
      >
    </a>
  </div>

  <div style="max-width:560px;">
    <h2 style="margin-top:0; margin-bottom:10px;">
      {% if c.unlabeled == true or c.title == nil or c.title == "" %}
        Unlabeled Specimen{% if c.specimen_id %} #{{ c.specimen_id }}{% endif %}
      {% else %}
        {{ c.title }}
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
