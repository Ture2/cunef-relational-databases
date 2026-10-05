'use strict';

/* ==========================================================================
   ER diagrams as inline SVG, in the course's Chen notation:
   entity = rectangle (weak: double), relationship = diamond (identifying: double),
   attribute = ellipse (key underlined, partial key dashed underline,
   multivalued double, derived dashed), hierarchy = triangle with d / o.
   Cardinalities are look-across (min,max) written next to each entity.

   chenSvg(spec)   free layout with normalized centres (concept cards, quiz).
   modelSvg(ex)    an exercise's ER model on a grid; attributes are listed
                   inside each entity box so larger models stay readable.
   ========================================================================== */

const ErDiagram = (() => {
  const CH = 7.1;                          // approx. width of one character at the diagram font size
  const tw = (s) => String(s).length * CH;
  /* Entity names are bold and often upper case (LIBRO, DEPARTAMENTO): capitals are wider. */
  const twBold = (s) => [...String(s)].reduce((w, c) => w + (/[A-ZÁÉÍÓÚÜÑ0-9]/.test(c) ? 9.4 : 7.4), 0);
  const r1 = (n) => Math.round(n * 10) / 10;

  /* Where the segment from the centre of a shape towards (tx, ty) leaves the shape. */
  function exitPoint(n, tx, ty) {
    const dx = tx - n.x;
    const dy = ty - n.y;
    if (!dx && !dy) return { x: n.x, y: n.y };
    const hw = n.w / 2;
    const hh = n.h / 2;
    let t;
    if (n.shape === 'diamond') t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    else if (n.shape === 'ellipse') t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    else if (n.shape === 'tri') t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9)) * 0.85;
    else t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    t = Math.min(t, 1);
    return { x: n.x + dx * t, y: n.y + dy * t };
  }

  function line(a, b, { total = false, dashed = false, cls = '' } = {}) {
    const dash = dashed ? ' stroke-dasharray="5 4"' : '';
    if (!total) return `<line class="er-edge ${cls}" x1="${r1(a.x)}" y1="${r1(a.y)}" x2="${r1(b.x)}" y2="${r1(b.y)}"${dash}/>`;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ox = (-(b.y - a.y) / len) * 2.2;
    const oy = ((b.x - a.x) / len) * 2.2;
    return [1, -1].map((k) =>
      `<line class="er-edge ${cls}" x1="${r1(a.x + ox * k)}" y1="${r1(a.y + oy * k)}" x2="${r1(b.x + ox * k)}" y2="${r1(b.y + oy * k)}"${dash}/>`).join('');
  }

  /* Label near point a of the segment a→b, pushed to one side so it does not sit on the line. */
  function labelPos(a, b, along = 16, side = 11, flip = false) {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let nx = -uy;
    let ny = ux;
    if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }   // above / right of the line by default
    if (flip) { nx = -nx; ny = -ny; }
    const anchor = Math.abs(nx) < 0.35 ? 'middle' : nx > 0 ? 'start' : 'end';
    return { x: a.x + ux * along + nx * side, y: a.y + uy * along + ny * side, anchor };
  }
  const labelSvg = (pos, text) => `<text class="er-card" x="${r1(pos.x)}" y="${r1(pos.y + 4)}" text-anchor="${pos.anchor}">${esc(text)}</text>`;
  const edgeLabel = (a, b, text, along, side) => labelSvg(labelPos(a, b, along, side), text);

  function shapeSvg(n) {
    const { x, y, w, h } = n;
    const L = x - w / 2;
    const T = y - h / 2;
    switch (n.type) {
      case 'entity': {
        const inner = n.weak ? `<rect class="er-line" x="${r1(L + 4)}" y="${r1(T + 4)}" width="${r1(w - 8)}" height="${r1(h - 8)}" fill="none"/>` : '';
        return `<rect class="er-ent" x="${r1(L)}" y="${r1(T)}" width="${r1(w)}" height="${r1(h)}"/>${inner}
          <text class="er-name" x="${r1(x)}" y="${r1(y + 4.5)}" text-anchor="middle">${esc(n.label)}</text>`;
      }
      case 'relationship': {
        const pts = (k) => `${r1(x)},${r1(y - h / 2 + k)} ${r1(x + w / 2 - k * 1.8)},${r1(y)} ${r1(x)},${r1(y + h / 2 - k)} ${r1(x - w / 2 + k * 1.8)},${r1(y)}`;
        return `<polygon class="er-rel" points="${pts(0)}"/>${n.identifying ? `<polygon class="er-line" fill="none" points="${pts(5)}"/>` : ''}
          <text class="er-label" x="${r1(x)}" y="${r1(y + 4)}" text-anchor="middle">${esc(n.label)}</text>`;
      }
      case 'attribute': {
        const k = n.kind;
        const dash = k === 'derived' ? ' stroke-dasharray="4 3"' : '';
        const dbl = k === 'multivalued' ? `<ellipse class="er-line" fill="none" cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w / 2 - 4)}" ry="${r1(h / 2 - 4)}"/>` : '';
        const ul = k === 'key' || k === 'partial'
          ? `<line class="er-line" x1="${r1(x - tw(n.label) / 2)}" y1="${r1(y + 7)}" x2="${r1(x + tw(n.label) / 2)}" y2="${r1(y + 7)}"${k === 'partial' ? ' stroke-dasharray="3 2"' : ''}/>`
          : '';
        return `<ellipse class="er-att" cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w / 2)}" ry="${r1(h / 2)}"${dash}/>${dbl}
          <text class="er-label" x="${r1(x)}" y="${r1(y + 4)}" text-anchor="middle">${esc(n.label)}</text>${ul}`;
      }
      case 'isa':
        return `<polygon class="er-isa" points="${r1(x)},${r1(T)} ${r1(x + w / 2)},${r1(T + h)} ${r1(x - w / 2)},${r1(T + h)}"/>
          <text class="er-label" x="${r1(x)}" y="${r1(y + 9)}" text-anchor="middle">${esc(n.label || '')}</text>`;
      default:
        return '';
    }
  }

  function sized(n) {
    const out = { ...n };
    if (n.type === 'entity') Object.assign(out, { w: Math.max(96, twBold(n.label) + 24), h: 40, shape: 'rect' });
    else if (n.type === 'relationship') Object.assign(out, { w: Math.max(92, tw(n.label) + 48), h: 52, shape: 'diamond' });
    else if (n.type === 'attribute') Object.assign(out, { w: Math.max(70, tw(n.label) + 28), h: 32, shape: 'ellipse' });
    else Object.assign(out, { w: 40, h: 34, shape: 'tri' });
    return out;
  }

  function svgWrap(w, h, body, alt) {
    return `<svg class="er-svg" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}" style="max-width:${Math.ceil(w)}px" role="img" aria-label="${esc(alt)}">
      <title>${esc(alt)}</title>${body}</svg>`;
  }

  function autoAlt(nodes, edges) {
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const ents = nodes.filter((n) => n.type === 'entity').map((n) => (n.weak ? t('weak entity {name}', { name: n.label }) : t('entity {name}', { name: n.label })));
    const rels = nodes.filter((n) => n.type === 'relationship').map((r) => {
      const ends = edges.filter((e) => e.to === r.id || e.from === r.id).map((e) => {
        const other = byId[e.from === r.id ? e.to : e.from];
        return other && other.type === 'entity' ? `${other.label}${e.card ? ` ${e.card}` : ''}` : null;
      }).filter(Boolean);
      return t('relationship {name} between {ends}', { name: r.label, ends: ends.join(t(' and ')) });
    });
    const kindName = (k) => ({ key: t('key'), partial: t('partial key'), multivalued: t('multivalued'), derived: t('derived'), composite: t('composite') }[k] || k);
    const atts = nodes.filter((n) => n.type === 'attribute').map((a) => `${a.label}${a.kind ? ` (${kindName(a.kind)})` : ''}`);
    return atts.length
      ? t('ER diagram: {items}. Attributes: {attributes}.', { items: [...ents, ...rels].join('; '), attributes: atts.join(', ') })
      : t('ER diagram: {items}.', { items: [...ents, ...rels].join('; ') });
  }

  /* ---- Free layout --------------------------------------------------------- */

  function chenSvg(spec) {
    const W = spec.w || 560;
    const H = spec.h || 240;
    const nodes = spec.nodes.map((n) => sized({ ...n, x: n.cx * W, y: n.cy * H }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    // Grow the canvas if a shape touches the border.
    let minX = 0; let minY = 0; let maxX = W; let maxY = H;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.w / 2 - 6); maxX = Math.max(maxX, n.x + n.w / 2 + 6);
      minY = Math.min(minY, n.y - n.h / 2 - 6); maxY = Math.max(maxY, n.y + n.h / 2 + 6);
    });
    nodes.forEach((n) => { n.x -= minX; n.y -= minY; });
    const edges = (spec.edges || []).map((e) => {
      const a = byId[e.from];
      const b = byId[e.to];
      if (!a || !b) return '';
      const p = exitPoint(a, b.x, b.y);
      const q = exitPoint(b, a.x, a.y);
      return line(p, q, e) + (e.card ? edgeLabel(p, q, e.card) : '');
    }).join('');
    const body = `<g>${edges}</g><g>${nodes.map(shapeSvg).join('')}</g>`;
    return svgWrap(maxX - minX, maxY - minY, body, spec.alt || autoAlt(spec.nodes, spec.edges || []));
  }

  /* ---- Exercise models ----------------------------------------------------- */

  const ROW = 18;        // attribute row height inside an entity box
  const HEAD = 28;       // entity header height

  const attrText = (a) => {
    if (a.kind === 'multivalued') return `{${a.name}}`;
    if (a.kind === 'derived') return `/${a.name}`;
    if (a.kind === 'composite') return `${a.name} (${(a.parts || []).join(', ')})`;
    return a.name;
  };

  function entityBox(e, x, y) {
    const w = Math.max(110, tw(e.id) + 34, ...e.attrs.map((a) => tw(attrText(a)) + 26));
    const h = HEAD + e.attrs.length * ROW + (e.attrs.length ? 8 : 0);
    return { type: 'entity', id: e.id, e, x, y, w, h, shape: 'rect' };
  }

  function entityBoxSvg(b) {
    const L = b.x - b.w / 2;
    const T = b.y - b.h / 2;
    const weak = b.e.weak ? `<rect class="er-line" x="${r1(L + 3.5)}" y="${r1(T + 3.5)}" width="${r1(b.w - 7)}" height="${r1(b.h - 7)}" fill="none"/>` : '';
    const rows = b.e.attrs.map((a, i) => {
      const ty = T + HEAD + 13 + i * ROW;
      const text = attrText(a);
      const cls = a.kind === 'derived' ? 'er-attr derived' : 'er-attr';
      const ul = a.kind === 'key' || a.kind === 'partial'
        ? `<line class="er-line" x1="${r1(L + 12)}" y1="${r1(ty + 3)}" x2="${r1(L + 12 + tw(text))}" y2="${r1(ty + 3)}"${a.kind === 'partial' ? ' stroke-dasharray="3 2"' : ''}/>`
        : '';
      return `<text class="${cls}" x="${r1(L + 12)}" y="${r1(ty)}">${esc(text)}</text>${ul}`;
    }).join('');
    return `<g class="er-box"><rect class="er-ent" x="${r1(L)}" y="${r1(T)}" width="${r1(b.w)}" height="${r1(b.h)}"/>
      <rect class="er-ent-head" x="${r1(L)}" y="${r1(T)}" width="${r1(b.w)}" height="${HEAD}"/>${weak}
      <text class="er-name" x="${r1(b.x)}" y="${r1(T + 18.5)}" text-anchor="middle">${esc(b.e.id)}</text>${rows}</g>`;
  }

  /* Centres of grid lines: each integer row/column is as big as its biggest item. */
  function gridAxis(items, key, sizeKey, gap) {
    const coords = items.map((it) => it.at[key]);
    const lo = Math.floor(Math.min(...coords));
    const hi = Math.ceil(Math.max(...coords));
    const size = {};
    for (let i = lo; i <= hi; i++) size[i] = 24;
    items.forEach((it) => {
      const c = it.at[key];
      if (Number.isInteger(c)) size[c] = Math.max(size[c], it[sizeKey]);
    });
    const centre = { [lo]: size[lo] / 2 };
    for (let i = lo + 1; i <= hi; i++) centre[i] = centre[i - 1] + size[i - 1] / 2 + gap + size[i] / 2;
    return (c) => {
      const f = Math.floor(c);
      const k = c - f;
      const a = centre[Math.max(lo, Math.min(hi, f))];
      const b = centre[Math.max(lo, Math.min(hi, f + 1))];
      return a + (b - a) * k;
    };
  }

  const endEntity = (end) => end.entity;

  function modelSvg(ex) {
    const hier = ex.hierarchies || [];
    const posOf = Object.fromEntries(ex.entities.map((e) => [e.id, e.at]));
    const relAt = (r) => {
      if (r.at) return r.at;
      const ats = r.ends.map((end) => posOf[endEntity(end)]);
      const uniq = new Set(r.ends.map(endEntity));
      if (uniq.size === 1) return [ats[0][0] + 1, ats[0][1] + 1];
      return [ats.reduce((s, a) => s + a[0], 0) / ats.length, ats.reduce((s, a) => s + a[1], 0) / ats.length];
    };
    const hierAt = (hh) => {
      if (hh.at) return hh.at;
      const sup = posOf[hh.super];
      const subs = hh.subs.map((s) => posOf[s]);
      return [sup[0], (sup[1] + subs.reduce((s, a) => s + a[1], 0) / subs.length) / 2];
    };

    const probe = ex.entities.map((e) => entityBox(e, 0, 0));
    const items = [
      ...probe.map((b, i) => ({ at: ex.entities[i].at, w: b.w, h: b.h })),
      ...ex.relationships.map((r) => ({ at: relAt(r), w: Math.max(92, tw(r.id) + 48), h: 52 })),
      ...hier.map((hh) => ({ at: hierAt(hh), w: 44, h: 36 })),
    ];
    const X = gridAxis(items, 0, 'w', 56);
    const Y = gridAxis(items, 1, 'h', 40);

    const boxes = Object.fromEntries(ex.entities.map((e) => [e.id, entityBox(e, X(e.at[0]), Y(e.at[1]))]));
    const out = [];
    const labels = [];
    const shapes = [];
    const extents = [];

    const legs = [];                       // every relationship line, to place the labels afterwards
    const solids = Object.values(boxes).slice();   // shapes a label must not cover
    const blocked = (x, y, w, h) => Object.values(boxes).some((b) =>
      Math.abs(b.x - x) < (b.w + w) / 2 + 6 && Math.abs(b.y - y) < (b.h + h) / 2 + 6);

    ex.relationships.forEach((r) => {
      const at = relAt(r);
      const d = sized({ type: 'relationship', label: r.id, identifying: r.identifying, x: X(at[0]), y: Y(at[1]) });
      const unary = new Set(r.ends.map(endEntity)).size < r.ends.length;
      r.ends.forEach((end, k) => {
        const b = boxes[end.entity];
        if (!b) return;
        let p;
        if (unary) {
          // The two legs of a recursive relationship leave side by side from the box side facing the diamond.
          // A diamond clearly above or below a wide box takes the top / bottom side, near the diamond.
          const off = k === 0 ? -1 : 1;
          const hGap = Math.abs(d.x - b.x) - b.w / 2;
          const vGap = Math.abs(d.y - b.y) - b.h / 2;
          if (hGap > vGap && !(b.w > d.w * 2.5 && vGap > 20 && hGap < d.w * 1.5)) {
            p = { x: b.x + Math.sign(d.x - b.x) * b.w / 2, y: b.y + off * Math.min(12, b.h / 4) };
          } else {
            const edge = b.w / 2 - 30;
            const cx = Math.max(b.x - edge, Math.min(b.x + edge, d.x));
            p = { x: cx + off * Math.min(22, b.w / 4), y: b.y + Math.sign(d.y - b.y) * b.h / 2 };
          }
        } else {
          p = exitPoint(b, d.x, d.y);
        }
        const q = exitPoint(d, p.x, p.y);
        out.push(line(p, q, { total: false }));
        legs.push({ p, q, box: end.entity, text: end.role ? `${end.role} ${end.card}` : end.card });
      });
      shapes.push(shapeSvg(d));
      solids.push(d);
      const atts = r.attrs || [];
      if (atts.length) {
        // Relationship attributes go below the diamond, or above / beside it when an entity is in the way.
        const rowW = atts.reduce((sum, a) => sum + Math.max(70, tw(a.name) + 28) + 10, -10);
        const spots = [[0, 56], [0, -56], [rowW / 2 + d.w / 2 + 10, 0], [-(rowW / 2 + d.w / 2 + 10), 0]];
        const [ox, oy] = spots.find(([sx, sy]) => !blocked(d.x + sx, d.y + sy, rowW, 34)) || spots[0];
        let cx = d.x + ox - rowW / 2;
        atts.forEach((a) => {
          const aw = Math.max(70, tw(a.name) + 28);
          const att = sized({ type: 'attribute', label: a.name, x: cx + aw / 2, y: d.y + oy });
          cx += aw + 10;
          out.push(line(exitPoint(d, att.x, att.y), exitPoint(att, d.x, d.y)));
          shapes.push(shapeSvg(att));
          extents.push({ x: att.x, y: att.y, w: att.w, h: att.h });
          solids.push(att);
        });
      }
    });

    // Cardinality labels: next to the entity end of each line, on whichever side covers no shape
    // and stays farthest from the other lines and labels of the same box.
    const placed = [];
    const rectOf = (pos, text) => {
      const w = tw(text) * 0.9;
      const x0 = pos.anchor === 'start' ? pos.x : pos.anchor === 'end' ? pos.x - w : pos.x - w / 2;
      return { x: x0 + w / 2, y: pos.y, w, h: 14 };
    };
    // How much a label would cover: shapes count a lot, other labels a bit less.
    const overlap = (a, b, padX, padY) => Math.max(0, (a.w + b.w) / 2 + padX - Math.abs(a.x - b.x)) * Math.max(0, (a.h + b.h) / 2 + padY - Math.abs(a.y - b.y));
    const covered = (r) => solids.reduce((sum, o) => sum + overlap(o, r, 2, 1), 0) * 3
      + placed.reduce((sum, o) => sum + overlap(o, r, 2, 1), 0) * 2;
    legs.forEach((leg) => {
      const others = legs.filter((o) => o !== leg && o.box === leg.box).map((o) => o.p);
      const cands = [];
      [14, 30, 48].forEach((along) => [false, true].forEach((flip) => cands.push(labelPos(leg.p, leg.q, along, 10, flip))));
      // Farther spots, used only when every close one covers something (long role labels).
      [14, 30, 48, 66].forEach((along) => [false, true].forEach((flip) => cands.push(labelPos(leg.p, leg.q, along, 20, flip))));
      const score = (pos, i) => {
        const r = rectOf(pos, leg.text);
        const near = [...others, ...placed].map((o) => Math.hypot(o.x - r.x, o.y - r.y));
        const c = covered(r);
        return (c ? -1000 - c : 0) + Math.min(60, near.length ? Math.min(...near) : 60) - i * 3;
      };
      let best = cands[0];
      let bestScore = -Infinity;
      cands.forEach((c, i) => { const sc = score(c, i); if (sc > bestScore) { bestScore = sc; best = c; } });
      placed.push(rectOf(best, leg.text));
      labels.push(labelSvg(best, leg.text));
    });

    hier.forEach((hh) => {
      const at = hierAt(hh);
      const t = sized({ type: 'isa', label: hh.disjoint ? 'd' : 'o', x: X(at[0]), y: Y(at[1]) });
      const sup = boxes[hh.super];
      const apex = { x: t.x, y: t.y - t.h / 2 };
      const p = exitPoint(sup, apex.x, apex.y);
      out.push(line(p, apex, { total: hh.total }));
      if (hh.discriminator) labels.push(`<text class="er-card" x="${r1(apex.x + 8)}" y="${r1((p.y + apex.y) / 2 + 4)}">${esc(hh.discriminator)}</text>`);
      hh.subs.forEach((s) => {
        const b = boxes[s];
        if (!b) return;
        const base = { x: t.x, y: t.y + t.h / 2 };
        out.push(line(base, exitPoint(b, base.x, base.y)));
      });
      shapes.push(shapeSvg(t));
    });

    Object.values(boxes).forEach((b) => shapes.push(entityBoxSvg(b)));

    // Bounding box of everything drawn.
    const all = [
      ...Object.values(boxes),
      ...ex.relationships.map((r) => { const at = relAt(r); return { x: X(at[0]), y: Y(at[1]), w: Math.max(92, tw(r.id) + 48), h: 52 }; }),
      ...extents,
      ...hier.map((hh) => { const at = hierAt(hh); return { x: X(at[0]), y: Y(at[1]), w: 60, h: 40 }; }),
    ];
    const pad = 34;
    const minX = Math.min(...all.map((b) => b.x - b.w / 2)) - pad;
    const minY = Math.min(...all.map((b) => b.y - b.h / 2)) - pad;
    const maxX = Math.max(...all.map((b) => b.x + b.w / 2)) + pad;
    const maxY = Math.max(...all.map((b) => b.y + b.h / 2)) + pad;
    const body = `<g transform="translate(${r1(-minX)} ${r1(-minY)})"><g>${out.join('')}</g><g>${shapes.join('')}</g><g>${labels.join('')}</g></g>`;
    return svgWrap(maxX - minX, maxY - minY, body, t('ER model of “{title}”. The same model is described as text below the diagram.', { title: ex.title }));
  }

  /* Ratio of a relationship from its look-across cards ('1:1', '1:N', 'M:N', 'ternary'). */
  function ratioOf(r) {
    if (r.ends.length > 2) return 'ternary';
    const many = r.ends.map((e) => !/,\s*1\s*\)/.test(e.card));
    if (many[0] && many[1]) return 'M:N';
    return many[0] || many[1] ? '1:N' : '1:1';
  }

  /* The same model as text, for screen readers and for reading it closely (ER → Logical, ER practice). */
  function modelTextHtml(ex) {
    const attrs = (list) => list.map((a) => {
      const kind = { key: t('key'), partial: t('partial key'), multivalued: t('multivalued'), derived: t('derived'), composite: t('composite: {parts}', { parts: (a.parts || []).join(', ') }) }[a.kind];
      return `<code>${esc(a.name)}</code>${kind ? ` <span class="muted">(${esc(kind)})</span>` : ''}`;
    }).join(', ');
    const ents = ex.entities.map((e) => `<li><strong>${esc(e.id)}</strong>${e.weak ? ` <span class="tag-sm">${esc(t('weak'))}</span>` : ''}: ${attrs(e.attrs) || `<span class="muted">${esc(t('no attributes of its own'))}</span>`}</li>`).join('');
    const rels = ex.relationships.map((r) => {
      const ratio = ratioOf(r);
      const ends = r.ends.map((e) => `<code>${esc(e.entity)}</code>${e.role ? ` ${esc(t('as {role}', { role: e.role }))}` : ''} ${esc(e.card)}`).join(' — ');
      const at = (r.attrs || []).length ? `; ${esc(t('attributes:'))} ${attrs(r.attrs)}` : '';
      return `<li><strong>${esc(r.id)}</strong> <span class="tag-sm">${r.identifying ? esc(t('identifying')) : esc(ratio === 'ternary' ? t('ternary') : ratio)}</span>: ${ends}${at}</li>`;
    }).join('');
    const hier = (ex.hierarchies || []).map((h) => {
      const props = [h.disjoint ? t('disjoint') : t('overlapping'), h.total ? t('total') : t('partial')];
      if (h.discriminator) props.push(t('discriminator {name}', { name: h.discriminator }));
      return `<li>${t('{super} is specialized into {subs}', { super: `<strong>${esc(h.super)}</strong>`, subs: h.subs.map((s) => `<code>${esc(s)}</code>`).join(', ') })} <span class="muted">(${esc(props.join(', '))})</span></li>`;
    }).join('');
    return `<details class="model-text"><summary>${esc(t('The model as text'))}</summary>
        <div class="model-text-body">
          <h4>${esc(t('Entities'))}</h4><ul class="plain">${ents}</ul>
          ${rels ? `<h4>${esc(t('Relationships'))}</h4><ul class="plain">${rels}</ul>` : ''}
          ${hier ? `<h4>${esc(t('Hierarchies'))}</h4><ul class="plain">${hier}</ul>` : ''}
        </div></details>`;
  }

  const LEGEND = `<p class="er-legend"><span><u>${esc(t('key'))}</u></span><span><span class="dash-u">${esc(t('partial key'))}</span></span><span>{${esc(t('multivalued'))}}</span><span>/${esc(t('derived'))}</span><span>${esc(t('composite (parts)'))}</span><span>${esc(t('(min,max) look-across'))}</span></p>`;

  return { chenSvg, modelSvg, modelTextHtml, ratioOf, attrText, LEGEND };
})();
