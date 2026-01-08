---
layout: default
title: AlphaEarth Concept Menagerie
---

# The AlphaEarth Concept Menagerie

Linear directions. Real structure. No benchmarks.

Scroll. Look. Click if you must.

---

<ul>
{% for c in site.concepts %}
  <li style="margin-bottom:40px;">
    <h2>
      {% if c.name %}{{ c.name }}{% else %}Unlabeled Specimen{% endif %}
    </h2>
    <img src="{{ '/assets/' | append: c.image | relative_url }}" style="max-width:400px;">
    <p>{{ c.short_note }}</p>
    <a href="{{ c.url | relative_url }}">View specimen</a>
  </li>
{% endfor %}
</ul>