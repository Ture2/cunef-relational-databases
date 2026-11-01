'use strict';

/* ==========================================================================
   ER models ↔ diagrams.net (draw.io) files, in the course's Chen notation.

   toXml(model, opts)   an editable .drawio of a model: entities, relationships
                        and hierarchies as shapes, attributes as ellipses around
                        their owner, look-across (min,max) labels on the lines,
                        double lines for total participation, the ratio of an
                        n-ary relationship beside its diamond. opts.legend adds a
                        "Legend" layer with the title and the notation.
   logicalXml(tables, opts)  the tables of a logical schema (LogicalEngine.variants)
                        as a .drawio page named LOGICAL: one box per table, a line per
                        column (PK / FK / NOT NULL / → target), an arrow per foreign key.
   starter(ex)          the statement and a palette of the course's shapes.
   fromXml(text)        (async, browser only) reads a .drawio back as the ER
                        practice builder's state: { work, unread }.

   Every exported shape carries er-* attributes (kept by draw.io), so a file
   exported here is read back exactly. Shapes drawn by hand are read from
   their style: rhombus → relationship, ellipse → attribute, triangle →
   hierarchy, any other box → entity; a "(min,max)" on or near a line is its card.
   ========================================================================== */

const ErDrawio = (() => {
  const tr = typeof t === 'function' ? t : (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? String(p[k]) : m)) : s);
  const xa = (s) => String(s).replace(/[&<>"\n]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\n': '&#10;' }[c]));
  const he = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const FONT = 'html=1;whiteSpace=wrap;fontFamily=Arial;fontSize=12;strokeColor=#1A1F6C;';
  const STYLE = {
    entity: `rounded=0;fillColor=#E6EEF9;fontStyle=1;${FONT}`,
    weak: `shape=ext;double=1;rounded=0;fillColor=#E6EEF9;fontStyle=1;${FONT}`,
    relationship: `rhombus;fillColor=#FDE9DD;${FONT}`,
    identifying: `rhombus;double=1;fillColor=#FDE9DD;${FONT}`,
    attribute: `ellipse;fillColor=#FFFFFF;${FONT}`,
    multivalued: `ellipse;shape=doubleEllipse;fillColor=#FFFFFF;${FONT}`,
    derived: `ellipse;dashed=1;fillColor=#FFFFFF;${FONT}`,
    part: `ellipse;fillColor=#FFFFFF;${FONT}fontSize=11;`,
    hierarchy: `triangle;direction=north;fillColor=#FFFFFF;fontStyle=1;${FONT}`,
    line: 'endArrow=none;html=1;rounded=0;strokeColor=#1A1F6C;',
    double: 'endArrow=none;html=1;rounded=0;shape=link;strokeColor=#1A1F6C;',
    label: 'edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];fontFamily=Arial;fontSize=11;fontStyle=1;labelBackgroundColor=#FFFFFF;',
    text: 'text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacing=8;fontFamily=Arial;fontSize=12;fillColor=#FFFFFF;strokeColor=#D6D1C4;',
    ratio: 'text;html=1;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=11;fontStyle=1;',
    title: 'text;html=1;align=left;verticalAlign=middle;fontFamily=Arial;fontSize=18;fontStyle=1;fontColor=#1A1F6C;',
    legend: 'text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacing=8;fontFamily=Arial;fontSize=11;',
    table: 'rounded=0;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fillColor=#E6EEF9;strokeColor=#1A1F6C;fontFamily=Arial;fontSize=12;',
    fk: 'html=1;rounded=0;endArrow=block;endFill=1;strokeColor=#1A1F6C;',
  };
  const TITLE_H = 70;                       // the title strip of a page with a legend layer
  const LEGEND_W = 320;
  const CARD_RE = /\(\s*(\d+)\s*[,.;]\s*(\d+|[NnMm*])\s*\)/;
  /* Ratio of an n-ary relationship in end order: '1' or M, N, P… for each "many" end (as ErDiagram.naryRatio). */
  const naryRatio = (r) => {
    let k = 0;
    return r.ends.map((e) => {
      const m = (e.card || '').match(CARD_RE);
      if (!m) return '?';
      return /^\d+$/.test(m[2]) && +m[2] <= 1 ? '1' : 'MNPQRS'[k++] || 'N';
    }).join(':');
  };

  /* ---- Export --------------------------------------------------------------- */

  const textW = (s, min = 90, ch = 7.2) => Math.max(min, Math.round(String(s).length * ch + 28));
  const overlaps = (a, b, m = 6) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + m && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + m;
  /* Does the segment p–q cross box b (centre, size)? Liang–Barsky clipping. */
  function crosses(p, q, b, m = 4) {
    const x0 = b.x - b.w / 2 - m, x1 = b.x + b.w / 2 + m, y0 = b.y - b.h / 2 - m, y1 = b.y + b.h / 2 + m;
    const dx = q.x - p.x, dy = q.y - p.y;
    let lo = 0, hi = 1;
    for (const [pp, qq] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dy, p.y - y0], [dy, y1 - p.y]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const r = qq / pp;
      if (pp < 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
      if (lo > hi) return false;
    }
    return true;
  }
  const angDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const PREFER = [-90, -65, -115, -40, -140, 90, 65, 115, 40, 140, -15, -165, 15, 165, 0, 180];
  /* The lines of an entity that appears at several ends of one relationship leave its lower-right corner side by side. */
  const UNARY_LEGS = [
    'exitX=1;exitY=0.8;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;',
    'exitX=0.8;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;',
    'exitX=1;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0;entryDx=0;entryDy=0;',
    'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;',
  ];

  function attrLabel(a) {
    const n = he(a.name);
    if (a.kind === 'key') return `<u>${n}</u>`;
    if (a.kind === 'partial') return `<span style="text-decoration: underline dashed">${n}</span>`;
    return n;
  }
  const attrStyle = (a) => STYLE[a.kind === 'multivalued' ? 'multivalued' : a.kind === 'derived' ? 'derived' : 'attribute'];

  /* model: { entities: [{ id, at, weak, attrs, _uid? }], relationships, hierarchies, title }
     opts: { title, source, statement: [lines], layout: { uid: [x, y] } (centres from an import),
             legend (title + notation on a "Legend" layer), spread (grid spacing factor, default 1) } */
  function toXml(model, opts = {}) {
    let n = 1;
    const id = () => `c${++n}`;
    const cells = [];
    const layout = opts.layout || {};
    const spread = opts.spread || 1;
    const X = (c) => c * 180 * spread;
    const Y = (r) => r * 175 * spread;
    const boxes = [];                     // everything placed, for collisions: { x, y, w, h } (centres)
    const vertex = (tag, label, style, b) => {
      const cid = id();
      boxes.push(b);
      cells.push(`<object id="${cid}" label="${xa(label)}"${Object.entries(tag).map(([k, v]) => ` er-${k}="${xa(v)}"`).join('')}><mxCell style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(b.x - b.w / 2)}" y="${Math.round(b.y - b.h / 2)}" width="${Math.round(b.w)}" height="${Math.round(b.h)}" as="geometry"/></mxCell></object>`);
      return cid;
    };
    const edge = (tag, src, dst, style, label, value = '') => {
      const cid = id();
      cells.push(`<object id="${cid}" label="${xa(value)}"${Object.entries(tag).map(([k, v]) => ` er-${k}="${xa(v)}"`).join('')}><mxCell style="${style}" edge="1" parent="1" source="${src}" target="${dst}"><mxGeometry relative="1" as="geometry"/></mxCell></object>`);
      if (label) cells.push(`<mxCell id="${id()}" value="${xa(label)}" style="${STYLE.label}" vertex="1" connectable="0" parent="${cid}"><mxGeometry x="-0.62" relative="1" as="geometry"><mxPoint as="offset"/></mxGeometry></mxCell>`);
      return cid;
    };
    const centre = (uid, fallback) => (uid && layout[uid] ? { x: layout[uid][0], y: layout[uid][1] } : fallback);

    // Entities, relationships and hierarchies first: the attributes go around them.
    const ents = {};
    model.entities.forEach((e) => {
      const at = e.at || [0, 0];
      const c = centre(e._uid, { x: X(at[0]), y: Y(at[1]) });
      ents[e.id] = { e, x: c.x, y: c.y, w: Math.max(120, textW(e.id, 120, 8.4)), h: 50, dirs: [] };
    });
    const rels = model.relationships.map((r) => {
      const ats = r.ends.map((x) => ents[x.entity]).filter(Boolean);
      let fb;
      if (r.at) fb = { x: X(r.at[0]), y: Y(r.at[1]) };
      else if (new Set(r.ends.map((x) => x.entity)).size === 1) fb = { x: ats[0].x + X(1), y: ats[0].y + Y(1) };
      else fb = { x: ats.reduce((s, a) => s + a.x, 0) / ats.length, y: ats.reduce((s, a) => s + a.y, 0) / ats.length };
      const c = centre(r._uid, fb);
      return { r, x: c.x, y: c.y, w: Math.max(110, textW(r.id, 110, 7.6) + 30), h: 64, dirs: [], fixed: !!(r._uid && layout[r._uid]) };
    });
    // A diamond placed from its entities (a ternary at their mean) may land on another shape: step it down until clear.
    rels.forEach((R, i) => {
      if (R.fixed) return;
      const others = () => [...Object.values(ents), ...rels.slice(0, i)];
      for (let k = 0; k < 12 && others().some((o) => overlaps(o, R, 20)); k++) R.y += R.h / 2 + 30;
    });
    const hiers = (model.hierarchies || []).map((h) => {
      const sp = ents[h.super];
      const subs = h.subs.map((s) => ents[s]).filter(Boolean);
      const fb = h.at ? { x: X(h.at[0]), y: Y(h.at[1]) } : { x: sp.x, y: (sp.y + subs.reduce((s, a) => s + a.y, 0) / Math.max(1, subs.length)) / 2 };
      const c = centre(h._uid, fb);
      return { h, x: c.x, y: c.y, w: 50, h2: 44 };
    });
    const dir = (from, to) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    rels.forEach((R) => R.r.ends.forEach((x) => { const E = ents[x.entity]; if (E) { E.dirs.push(dir(E, R)); R.dirs.push(dir(R, E)); } }));
    hiers.forEach((H) => { const S = ents[H.h.super]; if (S) S.dirs.push(dir(S, H)); H.h.subs.forEach((s) => { if (ents[s]) ents[s].dirs.push(dir(ents[s], H)); }); });

    const ids = {};
    Object.values(ents).forEach((E) => { ids[E.e.id] = vertex({ kind: 'entity', weak: E.e.weak ? 1 : 0 }, he(E.e.id), STYLE[E.e.weak ? 'weak' : 'entity'], E); });
    rels.forEach((R) => { R.cid = vertex({ kind: 'relationship', identifying: R.r.identifying ? 1 : 0 }, he(R.r.id), STYLE[R.r.identifying ? 'identifying' : 'relationship'], R); });
    hiers.forEach((H) => { H.cid = vertex({ kind: 'hierarchy', disjoint: H.h.disjoint ? 1 : 0, total: H.h.total ? 1 : 0 }, H.h.disjoint ? 'd' : 'o', STYLE.hierarchy, { x: H.x, y: H.y, w: 50, h: 44 }); });
    // The ratio of an n-ary relationship sits just above its diamond (placed now, so the attributes keep clear of it).
    rels.forEach((R) => {
      if (R.r.ends.length < 3) return;
      const text = naryRatio(R.r);
      vertex({ kind: 'ratio' }, he(text), STYLE.ratio, { x: R.x, y: R.y - R.h / 2 - 14, w: textW(text, 50, 7.6), h: 20 });
    });

    /* Lines already decided (entity–relationship, hierarchy, then each attribute and part link as it is placed):
       a new ellipse must not sit on any of them. */
    const segs = [];
    const pin = (B, fx, fy) => ({ x: B.x - B.w / 2 + fx * B.w, y: B.y - B.h / 2 + fy * B.h });
    rels.forEach((R) => R.r.ends.forEach((x, k) => {
      const E = ents[x.entity];
      if (!E) return;
      // The legs of a unary relationship leave from pinned corners (UNARY_LEGS), not from the centre.
      if (R.r.ends.filter((y) => y.entity === x.entity).length < 2) { segs.push([E, R]); return; }
      const idx = R.r.ends.slice(0, k).filter((y) => y.entity === x.entity).length;
      const v = Object.fromEntries(UNARY_LEGS[idx % UNARY_LEGS.length].split(';').filter(Boolean).map((p) => p.split('=')).map(([a, b]) => [a, +b]));
      segs.push([pin(E, v.exitX, v.exitY), pin(R, v.entryX, v.entryY)]);
    }));
    hiers.forEach((H) => [H.h.super, ...H.h.subs].forEach((s) => { if (ents[s]) segs.push([ents[s], H]); }));
    const onLine = (b) => segs.some(([p, q]) => crosses(p, q, b, 2));

    /* Attributes on rings around their owner, away from its lines and from each other. */
    const ring = (owner, attrs, ownerId, radii) => {
      const used = [];                     // angles already taken: an outer attribute must not sit behind an inner one
      attrs.forEach((a) => {
        const w = textW(a.name);
        const own = centre(a._uid, null);
        let spot = own ? { x: own.x, y: own.y, w, h: 36 } : null;
        // First a spot whose line crosses no shape; failing that, any free spot.
        for (const strict of [true, false]) {
          for (let k = 0; !spot && k < radii.length; k++) {
            const [rx, ry] = radii[k];
            for (const ang of PREFER) {
              if (owner.dirs.some((d) => angDist(d, ang) < 32) || used.some((u) => angDist(u, ang) < 18)) continue;
              const rad = (ang * Math.PI) / 180;
              const b = { x: owner.x + Math.cos(rad) * (rx + w / 3), y: owner.y + Math.sin(rad) * ry, w, h: 36 };
              if (strict && onLine(b)) continue;
              if (!boxes.some((o) => overlaps(o, b) || (strict && o !== owner && crosses(owner, b, o)))) { spot = b; used.push(ang); break; }
            }
          }
          if (spot) break;
        }
        // Every ring full: keep widening the last ring until a free spot turns up.
        for (let k = 1; !spot && k <= 8; k++) {
          const [rx, ry] = radii[radii.length - 1];
          for (const ang of PREFER) {
            const rad = (ang * Math.PI) / 180;
            const b = { x: owner.x + Math.cos(rad) * (rx + 70 * k + w / 3), y: owner.y + Math.sin(rad) * (ry + 45 * k), w, h: 36 };
            if (!onLine(b) && !boxes.some((o) => overlaps(o, b) || (o !== owner && crosses(owner, b, o)))) { spot = b; break; }
          }
        }
        if (!spot) spot = { x: owner.x + ((boxes.length % 5) - 2) * 60, y: owner.y - radii[radii.length - 1][1] - 50, w, h: 36 };
        const aid = vertex({ kind: 'attribute', 'attr-kind': a.kind || '' }, attrLabel(a), attrStyle(a), spot);
        edge({ kind: 'link' }, aid, ownerId, STYLE.line);
        segs.push([spot, owner]);
        // The parts of a composite fan out on the far side of it, each moved further out until it is clear.
        (a.parts || []).forEach((p, i, all) => {
          const pw = textW(p, 70, 6.6);
          const off = (i - (all.length - 1) / 2) * 34;
          const away = Math.sign(spot.y - owner.y) || -1;
          const at = (k, s) => ({ x: spot.x + off * 2.6 + s * 70, y: spot.y + away * (60 + Math.abs(off) * 0.4 + 40 * k), w: pw, h: 28 });
          // First a spot clear of every shape and line; failing that, one whose own link may cross a shape.
          let pb = null;
          for (const strict of [true, false]) {
            for (let k = 0; !pb && k < 10; k++) {
              for (const s of [0, 1, -1, 2, -2, 3, -3]) {
                const b = at(k, s);
                if (!onLine(b) && !boxes.some((o) => overlaps(o, b, 4) || (strict && o !== spot && crosses(spot, b, o)))) { pb = b; break; }
              }
            }
            if (pb) break;
          }
          if (!pb) pb = at(0, 0);
          const pid = vertex({ kind: 'part' }, he(p), STYLE.part, pb);
          edge({ kind: 'link' }, pid, aid, STYLE.line);
          segs.push([pb, spot]);
        });
      });
    };
    Object.values(ents).forEach((E) => ring(E, E.e.attrs, ids[E.e.id], [[110, 80], [190, 125], [270, 170]]));
    rels.forEach((R) => ring(R, R.r.attrs || [], R.cid, [[95, 70], [170, 110], [245, 150]]));

    /* Lines: (min,max) next to the entity; a double line at E when the other end has min ≥ 1 (contract). */
    rels.forEach((R) => {
      const cards = R.r.ends.map((x) => (x.card ? x.card.match(CARD_RE) : null));
      R.r.ends.forEach((x, k) => {
        if (!ids[x.entity]) return;
        const others = cards.filter((c, j) => j !== k);
        const total = R.r.ends.length === 2 && others[0] && +others[0][1] >= 1;
        let style = total ? STYLE.double : STYLE.line;
        // The lines of an entity that appears at several ends leave its lower-right corner side by side.
        const same = R.r.ends.filter((y) => y.entity === x.entity).length;
        const idx = R.r.ends.slice(0, k).filter((y) => y.entity === x.entity).length;
        if (same > 1) style += UNARY_LEGS[idx % UNARY_LEGS.length];
        const label = `${x.role ? `${x.role} ` : ''}${x.card || ''}`.trim();
        edge({ kind: 'end', card: x.card || '', role: x.role || '' }, ids[x.entity], R.cid, style, label);
      });
    });
    hiers.forEach((H) => {
      if (ids[H.h.super]) edge({ kind: 'super' }, ids[H.h.super], H.cid, H.h.total ? STYLE.double : STYLE.line, '', H.h.discriminator || '');
      H.h.subs.forEach((s) => { if (ids[s]) edge({ kind: 'sub' }, H.cid, ids[s], STYLE.line); });
    });

    // The statement beside the diagram.
    const maxX = Math.max(...boxes.map((b) => b.x + b.w / 2));
    const minY = Math.min(...boxes.map((b) => b.y - b.h / 2));
    if (opts.statement) {
      const text = opts.statement.map((l) => (l.startsWith('- ') ? `• ${he(l.slice(2))}` : he(l))).join('<br><br>');
      const body = `<b>${he(opts.title || model.title || '')}</b>${opts.source ? `<br><i>${he(opts.source)}</i>` : ''}<br><br>${text}`;
      const h = 60 + opts.statement.join(' ').length * 0.5;
      cells.push(`<object id="${id()}" label="${xa(body)}" er-kind="statement"><mxCell style="${STYLE.text}" vertex="1" parent="1"><mxGeometry x="${Math.round(maxX + 80)}" y="${Math.round(minY)}" width="460" height="${Math.round(h)}" as="geometry"/></mxCell></object>`);
    }
    // Shift everything into the positive quadrant (below the title strip when there is a legend layer).
    const minX = Math.min(...boxes.map((b) => b.x - b.w / 2));
    const top = opts.legend ? 40 + TITLE_H : 40;
    const dx = Math.round(40 - minX);
    const dy = Math.round(top - minY);
    const body = cells.join('').replace(/<mxGeometry x="(-?\d+)" y="(-?\d+)"/g, (m, x, y) => `<mxGeometry x="${+x + dx}" y="${+y + dy}"`);
    const right = Math.max(...boxes.map((b) => b.x + b.w / 2)) + dx;
    const bottom = Math.max(...boxes.map((b) => b.y + b.h / 2)) + dy;
    if (!opts.legend) return wrap(body, { w: right + 40, h: bottom + 40 });
    const lines = [
      `${tr('Rectangle')}: ${tr('entity')} · ${tr('double rectangle')}: ${tr('weak entity')}`,
      `${tr('Diamond')}: ${tr('relationship')} · ${tr('double diamond')}: ${tr('identifying relationship')}`,
      `${tr('Ellipse')}: ${tr('attribute')} · <u>${he(tr('key'))}</u> · <span style="text-decoration: underline dashed">${he(tr('partial key'))}</span> · ${tr('double ellipse')}: ${tr('multivalued')} · ${tr('dashed ellipse')}: ${tr('derived')} · ${tr('smaller ellipses linked to an attribute')}: ${tr('its parts (composite)')}`,
      tr('(min,max) next to an entity E, read across: how many E go with one occurrence of the other end.'),
      tr('Double line at E: E participates totally (the min at the other end is at least 1).'),
    ];
    if (model.relationships.some((r) => r.ends.length > 2)) lines.push(tr('M:N:P above a diamond: the ratio of an n-ary relationship, one part per end in order (1 or a letter for many).'));
    if ((model.hierarchies || []).length) lines.push(tr('Triangle: specialization, d disjoint / o overlapping; a double line from the supertype marks a total one.'));
    const legendH = 40 + lines.length * 34;
    const legend = layer([
      layerCell('title', he(opts.title || model.title || tr('ER model')), STYLE.title, 40, 20, Math.max(400, right - 40), 40),
      layerCell('legend', `<b>${he(tr('Legend'))}</b><br>${lines.join('<br>')}`, STYLE.legend, right + 60, top, LEGEND_W, legendH),
    ]);
    return wrap(body + legend, { w: right + 60 + LEGEND_W + 40, h: Math.max(bottom, top + legendH) + 40 });
  }

  /* The page furniture (title, legend) goes on its own draw.io layer, so it can be hidden or locked on its own. */
  const layer = (body) => `<mxCell id="legend-layer" value="${xa(tr('Legend'))}" parent="0"/>${body.join('')}`;
  const layerCell = (kind, label, style, x, y, w, h) => `<object id="${kind}" label="${xa(label)}" er-kind="${kind}"><mxCell style="${style}" vertex="1" parent="legend-layer"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/></mxCell></object>`;

  const wrap = (body, { page = 'ERD', w = 1654, h = 1169 } = {}) => `<mxfile host="cunef-databases-practice" type="device"><diagram name="${page}" id="${page.toLowerCase()}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${Math.max(1654, Math.ceil(w / 10) * 10)}" pageHeight="${Math.max(1169, Math.ceil(h / 10) * 10)}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel></diagram></mxfile>\n`;

  /* ---- Logical schema ----------------------------------------------------------------- */

  /* tables: [{ name, cols: [{ name, pk, fk: { table, col } | null, nn, optional }] }] — a LogicalEngine variant's
     tables. One row per column: "PK name", "FK name NOT NULL → Table.col", "PK,FK name → Table.col";
     a primary key is NOT NULL by definition, so it is not written. Columns marked optional are left out.
     opts: { title, legend } as for toXml. */
  function logicalXml(tables, opts = {}) {
    let n = 1;
    const cells = [];
    const rowOf = (c) => {
      const mark = c.pk && c.fk ? 'PK,FK' : c.pk ? 'PK' : c.fk ? 'FK' : '';
      const nn = c.nn && !c.pk ? ' NOT NULL' : '';
      const ref = c.fk ? ` → ${c.fk.table}.${c.fk.col}` : '';
      return `${mark ? `${mark} ` : ''}${c.name}${nn}${ref}`;
    };
    const boxes = tables.map((t) => {
      const rows = t.cols.filter((c) => !c.optional).map(rowOf);
      const w = Math.max(160, ...[t.name, ...rows].map((s) => Math.round(s.length * 7 + 30)));
      return { t, rows, w: Math.ceil(w / 10) * 10, h: 40 + 20 * rows.length };
    });
    // Layers: a table sits one row below the deepest table it refers to, so the arrows point up.
    // Within a row, tables are ordered by where the tables they refer to sit.
    const byName = Object.fromEntries(boxes.map((b) => [b.t.name, b]));
    const refs = (b) => [...new Set(b.t.cols.filter((c) => c.fk && !c.optional && c.fk.table !== b.t.name && byName[c.fk.table]).map((c) => c.fk.table))];
    const depth = {};
    const depthOf = (b, seen = new Set()) => {
      if (depth[b.t.name] !== undefined) return depth[b.t.name];
      if (seen.has(b.t.name)) return 0;
      seen.add(b.t.name);
      return (depth[b.t.name] = Math.max(0, ...refs(b).map((r) => depthOf(byName[r], seen) + 1)));
    };
    boxes.forEach((b) => depthOf(b));
    const rows = [];
    boxes.forEach((b) => (rows[depth[b.t.name]] = rows[depth[b.t.name]] || []).push(b));
    const top = opts.legend ? 40 + TITLE_H : 40;
    const place = () => {
      let y = top;
      rows.forEach((row) => {
        let x = 40;
        row.forEach((b) => { b.x = x; b.y = y; x += b.w + 80; });
        y += Math.max(...row.map((b) => b.h)) + 110;
      });
    };
    // First order: each row by where the tables its tables refer to sit (placing row by row).
    let y0 = top;
    rows.forEach((row, r) => {
      if (r > 0) {
        const mid = (b) => { const rs = refs(b).map((t) => byName[t].x + byName[t].w / 2); return rs.length ? rs.reduce((s, v) => s + v, 0) / rs.length : 0; };
        row.sort((a, b) => mid(a) - mid(b));
      }
      let x = 40;
      row.forEach((b) => { b.x = x; b.y = y0; x += b.w + 80; });
      y0 += Math.max(...row.map((b) => b.h)) + 110;
    });

    // One arrow per referencing table and target, from the referencing table to the referenced one:
    // straight when that crosses no other table, else an elbow through the gap below the target's row,
    // leaving the source by its top, left or right side, or round the outside of the layout.
    const rowBottom = (b) => Math.max(...boxes.filter((o) => o.y === b.y).map((o) => o.y + o.h));
    const C = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h });
    const clear = (pts, s, t) => pts.slice(1).every((q, i) => boxes.every((o) => o === s || o === t || !crosses(pts[i], q, C(o), 6)));
    const pins = (ex, ey, nx, ny) => `exitX=${ex};exitY=${ey};exitDx=0;exitDy=0;entryX=${nx};entryY=${ny};entryDx=0;entryDy=0;`;
    const routeAll = () => {
      const out = [];
      const into = {};
      const seen = new Set();
      boxes.forEach((b) => b.t.cols.forEach((c) => {
        if (!c.fk || !byName[c.fk.table] || c.optional) return;
        const key = `${b.t.name}→${c.fk.table}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(routeOne(b, byName[c.fk.table], into));
      }));
      return out;
    };
    const routeOne = (b, t, into) => {
      let style = STYLE.fk;
      let points = [];
      let ok = true;
      if (t === b) style += pins(1, 0.3, 1, 0.7);
      else if (!clear([C(b), C(t)], b, t)) {
        const k = (into[t.t.name] = (into[t.t.name] || 0) + 1);
        const nx = [0.5, 0.3, 0.7, 0.2, 0.8][(k - 1) % 5];
        const tx = t.x + nx * t.w;
        const lane = rowBottom(t) + 30 + ((k - 1) % 3) * 20;
        const exits = [
          { ex: 0.5, ey: 0, p: { x: b.x + b.w / 2, y: b.y }, via: [] },
          { ex: 0, ey: 0.5, p: { x: b.x, y: b.y + b.h / 2 }, via: [{ x: b.x - 40, y: b.y + b.h / 2 }] },
          { ex: 1, ey: 0.5, p: { x: b.x + b.w, y: b.y + b.h / 2 }, via: [{ x: b.x + b.w + 40, y: b.y + b.h / 2 }] },
          // Last resort: round the outside of the layout.
          { ex: 0, ey: 0.5, p: { x: b.x, y: b.y + b.h / 2 }, via: [{ x: 20, y: b.y + b.h / 2 }] },
          { ex: 1, ey: 0.5, p: { x: b.x + b.w, y: b.y + b.h / 2 }, via: [{ x: Math.max(...boxes.map((o) => o.x + o.w)) + 30 + k * 12, y: b.y + b.h / 2 }] },
        ];
        const route = exits.map((e) => {
          const x0 = e.via.length ? e.via[0].x : e.p.x;
          return { e, way: [...e.via, { x: x0, y: lane }, { x: tx, y: lane }] };
        }).find(({ e, way }) => clear([e.p, ...way, { x: tx, y: t.y + t.h }], b, t));
        if (route) {
          style += `edgeStyle=orthogonalEdgeStyle;${pins(route.e.ex, route.e.ey, nx, 1)}`;
          points = route.way;
        } else ok = false;
      }
      return { b, t, style, points, ok };
    };

    // If an arrow found no clear route, try other orders within the rows (a fixed pseudo-random
    // sequence, so a model always gives the same file) and keep the order with the fewest blocked arrows.
    let routes = routeAll();
    let bad = routes.filter((r) => !r.ok).length;
    if (bad) {
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      let best = rows.map((row) => [...row]);
      for (let k = 0; k < 300 && bad; k++) {
        rows.forEach((row) => row.sort(() => rnd() - 0.5));
        place();
        const r = routeAll();
        const nb = r.filter((x) => !x.ok).length;
        if (nb < bad) { bad = nb; best = rows.map((row) => [...row]); }
      }
      best.forEach((row, i) => { rows[i] = row; });
      place();
      routes = routeAll();
    }

    const ids = {};
    boxes.forEach((b) => {
      const cid = `t${++n}`;
      ids[b.t.name] = cid;
      const label = `<b>${he(b.t.name)}</b><br>${b.rows.map(he).join('<br>')}`;
      cells.push(`<object id="${cid}" label="${xa(label)}" er-kind="table"><mxCell style="${STYLE.table}" vertex="1" parent="1"><mxGeometry x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" as="geometry"/></mxCell></object>`);
    });
    routes.forEach(({ b, t, style, points }) => {
      const geo = points.length
        ? `<mxGeometry relative="1" as="geometry"><Array as="points">${points.map((p) => `<mxPoint x="${Math.round(p.x)}" y="${Math.round(p.y)}"/>`).join('')}</Array></mxGeometry>`
        : '<mxGeometry relative="1" as="geometry"/>';
      cells.push(`<object id="f${++n}" label="" er-kind="fk"><mxCell style="${style}" edge="1" parent="1" source="${ids[b.t.name]}" target="${ids[t.t.name]}">${geo}</mxCell></object>`);
    });
    const right = Math.max(...boxes.map((b) => b.x + b.w));
    const bottom = Math.max(...boxes.map((b) => b.y + b.h));
    if (!opts.legend) return wrap(cells.join(''), { page: 'LOGICAL', w: right + 40, h: bottom + 40 });
    const lines = [
      tr('Box: a table; its name on the first line, then one line per column.'),
      tr('PK: primary key (never NULL) · FK: foreign key · PK,FK: both.'),
      tr('NOT NULL: the column is mandatory.'),
      tr('→ Table.column: the primary key a foreign key refers to.'),
      tr('Arrow: from the table holding foreign keys to the table they refer to.'),
    ];
    const legendH = 40 + lines.length * 22;
    const legend = layer([
      layerCell('title', he(opts.title || tr('Logical model')), STYLE.title, 40, 20, Math.max(400, right - 40), 40),
      layerCell('legend', `<b>${he(tr('Legend'))}</b><br>${lines.join('<br>')}`, STYLE.legend, right + 60, top, LEGEND_W, legendH),
    ]);
    return wrap(cells.join('') + legend, { page: 'LOGICAL', w: right + 60 + LEGEND_W + 40, h: Math.max(bottom, top + legendH) + 40 });
  }

  /* The statement and a palette of the course's Chen shapes (copy them), for drawing from scratch. */
  function starter(ex) {
    let n = 1;
    const cells = [];
    const cell = (label, style, x, y, w, h, kind = 'palette') => cells.push(`<object id="c${++n}" label="${xa(label)}" er-kind="${kind}"><mxCell style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell></object>`);
    const text = ex.statement.map((l) => (l.startsWith('- ') ? `• ${he(l.slice(2))}` : he(l))).join('<br><br>');
    cell(`<b>${he(ex.title)}</b><br><i>${he(ex.source)}</i><br><br>${text}`, STYLE.text, 20, 20, 620, Math.round(60 + ex.statement.join(' ').length * 0.42), 'statement');
    const shapes = [
      [tr('Entity'), STYLE.entity, 120, 50],
      [tr('Weak entity'), STYLE.weak, 120, 50],
      [tr('Relationship'), STYLE.relationship, 120, 64],
      [tr('Identifying'), STYLE.identifying, 120, 64],
      [`<u>${he(tr('key'))}</u>`, STYLE.attribute, 100, 36],
      [`<span style="text-decoration: underline dashed">${he(tr('partial key'))}</span>`, STYLE.attribute, 110, 36],
      [tr('attribute'), STYLE.attribute, 100, 36],
      [tr('multivalued'), STYLE.multivalued, 110, 40],
      [tr('derived'), STYLE.derived, 100, 36],
      ['d', STYLE.hierarchy, 50, 44],
      ['(0,N)', 'text;html=1;align=center;verticalAlign=middle;fontFamily=Arial;fontSize=11;fontStyle=1;', 50, 20],
    ];
    cell(`<b>${he(tr('Shapes (copy them)'))}</b>`, 'text;html=1;align=left;verticalAlign=middle;fontFamily=Arial;', 680, 20, 200, 24);
    let y = 54;
    shapes.forEach(([label, style, w, h]) => { cell(label, style, 680, y, w, h); y += h + 14; });
    cell(he(tr('Cardinalities are read across: the (min,max) next to an entity says how many of it go with one occurrence of the other end. A double line marks total participation.')), 'text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;fontFamily=Arial;fontSize=11;fontColor=#555555;', 680, y + 6, 200, 90);
    return wrap(cells.join(''));
  }

  /* ---- Import (browser) -------------------------------------------------------- */

  /* A compressed <diagram>: base64 → raw deflate → URI-encoded XML. */
  async function inflate(b64) {
    const bytes = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const text = await new Response(stream).text();
    return decodeURIComponent(text);
  }

  const plain = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(`<body>${String(html).replace(/<br\s*\/?>/gi, ' ').replace(/<\/(div|p)>/gi, ' ')}</body>`, 'text/html');
    return doc.body.textContent.replace(/\s+/g, ' ').trim();
  };
  const has = (style, word) => new RegExp(`(^|;)${word}(;|=|$)`).test(style || '');
  const styleVal = (style, key) => { const m = (style || '').match(new RegExp(`(?:^|;)${key}=([^;]*)`)); return m ? m[1] : null; };

  /* What a hand-drawn shape is, from its style and text. */
  function kindOf(c) {
    const s = c.style || '';
    if (c.tag.kind) return c.tag.kind;
    if (has(s, 'text') || has(s, 'edgeLabel')) return 'text';
    if (has(s, 'rhombus') || styleVal(s, 'shape') === 'rhombus') return 'relationship';
    if (has(s, 'triangle') || styleVal(s, 'shape') === 'triangle') return 'hierarchy';
    if (has(s, 'ellipse') || styleVal(s, 'shape') === 'doubleEllipse') return 'attribute';
    if (has(s, 'swimlane') || has(s, 'group') || styleVal(s, 'shape') === 'image') return 'other';
    return 'entity';
  }
  function attrKindOf(c) {
    if (c.tag['attr-kind'] !== undefined) return c.tag['attr-kind'];
    const s = c.style || '';
    const v = c.value || '';
    if (/dashed/.test(v) && /underline|<u>/i.test(v)) return 'partial';
    if (/<u>|text-decoration:\s*underline/i.test(v) || (+styleVal(s, 'fontStyle') & 4)) return 'key';
    if (styleVal(s, 'shape') === 'doubleEllipse') return 'multivalued';
    if (styleVal(s, 'dashed') === '1') return 'derived';
    return '';
  }

  /* Reads a .drawio file. Returns { work, unread: [{ label, reason }] } in the builder's shape. */
  async function fromXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error(tr('The file is not a draw.io diagram.'));
    const diagrams = [...doc.getElementsByTagName('diagram')];
    let model = doc.getElementsByTagName('mxGraphModel')[0] || null;
    if (diagrams.length) {
      const d = diagrams.find((x) => /^erd$/i.test(x.getAttribute('name') || '')) || diagrams[0];
      model = d.getElementsByTagName('mxGraphModel')[0] || null;
      if (!model && d.textContent.trim()) model = new DOMParser().parseFromString(await inflate(d.textContent), 'application/xml').documentElement;
    }
    if (!model) throw new Error(tr('The file is not a draw.io diagram.'));

    // Every cell: plain mxCell, or object / UserObject wrapping one.
    const cells = {};
    const root = model.getElementsByTagName('root')[0];
    [...(root ? root.children : [])].forEach((el) => {
      const isObj = el.tagName !== 'mxCell';
      const mx = isObj ? el.getElementsByTagName('mxCell')[0] : el;
      if (!mx) return;
      const tag = {};
      if (isObj) [...el.attributes].forEach((a) => { if (a.name.startsWith('er-')) tag[a.name.slice(3)] = a.value; });
      const g = mx.getElementsByTagName('mxGeometry')[0];
      const num = (k) => (g && g.getAttribute(k) !== null ? +g.getAttribute(k) : 0);
      cells[el.getAttribute('id')] = {
        id: el.getAttribute('id'), tag, style: mx.getAttribute('style') || '',
        value: isObj ? el.getAttribute('label') || '' : mx.getAttribute('value') || '',
        vertex: mx.getAttribute('vertex') === '1', edge: mx.getAttribute('edge') === '1',
        source: mx.getAttribute('source'), target: mx.getAttribute('target'), parent: mx.getAttribute('parent'),
        x: num('x') + num('width') / 2, y: num('y') + num('height') / 2, w: num('width'), h: num('height'),
      };
    });
    const all = Object.values(cells);
    const unread = [];
    const skip = new Set(['statement', 'palette']);
    const vertices = all.filter((c) => c.vertex && !skip.has(c.tag.kind) && cells[c.parent] && !cells[c.parent].edge);
    vertices.forEach((c) => { c.kind = kindOf(c); c.name = plain(c.value); });
    // Edge labels (children of an edge) belong to their edge.
    const labelsOf = {};
    all.filter((c) => c.vertex && cells[c.parent] && cells[c.parent].edge).forEach((c) => { (labelsOf[c.parent] = labelsOf[c.parent] || []).push(plain(c.value)); });

    let n = 0;
    const uid = (p) => `${p}${++n}`;
    const work = { entities: [], relationships: [], hierarchies: [], layout: {} };
    const byCell = {};
    vertices.filter((c) => c.kind === 'entity' || c.kind === 'weak').forEach((c) => {
      if (!c.name) { unread.push({ label: tr('a box with no name'), reason: tr('it has no text') }); return; }
      const e = { uid: uid('e'), name: c.name.slice(0, 60), weak: c.tag.weak !== undefined ? c.tag.weak === '1' : styleVal(c.style, 'double') === '1', attrs: [] };
      work.entities.push(e);
      work.layout[e.uid] = [Math.round(c.x), Math.round(c.y)];
      byCell[c.id] = { type: 'entity', el: e, c };
    });
    vertices.filter((c) => c.kind === 'relationship').forEach((c) => {
      const r = { uid: uid('r'), name: c.name.slice(0, 60), identifying: c.tag.identifying !== undefined ? c.tag.identifying === '1' : styleVal(c.style, 'double') === '1', ends: [], attrs: [] };
      work.relationships.push(r);
      work.layout[r.uid] = [Math.round(c.x), Math.round(c.y)];
      byCell[c.id] = { type: 'relationship', el: r, c };
    });
    vertices.filter((c) => c.kind === 'hierarchy').forEach((c) => {
      const h = { uid: uid('h'), super: '', subs: [], disjoint: c.tag.disjoint !== undefined ? c.tag.disjoint === '1' : !/^o$/i.test(c.name), total: c.tag.total !== undefined ? c.tag.total === '1' : null, discriminator: '' };
      work.hierarchies.push(h);
      work.layout[h.uid] = [Math.round(c.x), Math.round(c.y)];
      byCell[c.id] = { type: 'hierarchy', el: h, c };
    });
    vertices.filter((c) => c.kind === 'attribute' || c.kind === 'part').forEach((c) => {
      byCell[c.id] = { type: 'attribute', c, name: c.name, kind: attrKindOf(c), owner: null, parts: [] };
    });
    vertices.filter((c) => c.kind === 'other').forEach((c) => unread.push({ label: c.name || tr('a shape'), reason: tr('this kind of shape is not part of the notation') }));

    const texts = vertices.filter((c) => c.kind === 'text').map((c) => ({ c, text: c.name, used: false }));
    const cardNear = (E) => {
      const near = texts.filter((x) => !x.used && CARD_RE.test(x.text)).map((x) => ({ x, d: Math.hypot(x.c.x - E.x, x.c.y - E.y) - Math.max(E.w, E.h) / 2 }))
        .filter((o) => o.d < 60).sort((a, b) => a.d - b.d)[0];
      if (!near) return '';
      near.x.used = true;
      return near.x.text;
    };

    all.filter((c) => c.edge).forEach((c) => {
      const a = byCell[c.source];
      const b = byCell[c.target];
      if (!a || !b) {
        if (a || b) unread.push({ label: plain(c.value) || tr('a line'), reason: tr('it is not connected at both ends') });
        return;
      }
      const pair = [a.type, b.type].sort().join('-');
      if (pair === 'attribute-entity' || pair === 'attribute-relationship') {
        const at = a.type === 'attribute' ? a : b;
        const ow = a.type === 'attribute' ? b : a;
        if (!at.owner) at.owner = ow;
      } else if (pair === 'attribute-attribute') {
        // A part linked to its composite: the part is the one with no other owner, decided once all lines are read.
        a.links = (a.links || []).concat(b);
        b.links = (b.links || []).concat(a);
      } else if (pair === 'entity-relationship') {
        const E = a.type === 'entity' ? a : b;
        const R = a.type === 'entity' ? b : a;
        let label = c.tag.card !== undefined ? `${c.tag.role || ''} ${c.tag.card}` : [...(labelsOf[c.id] || []), plain(c.value)].find((s) => CARD_RE.test(s)) || '';
        if (!label) label = cardNear(E.c);
        const m = label.match(CARD_RE);
        const role = (c.tag.role !== undefined ? c.tag.role : label.replace(CARD_RE, '')).trim().slice(0, 40);
        const min = m ? String(Math.min(3, +m[1])) : '';
        const max = m ? (/^\d+$/.test(m[2]) && +m[2] <= 1 ? String(+m[2] || 1) : 'N') : '';
        R.el.ends.push({ entity: E.el.uid, min, max, role });
        if (!m) unread.push({ label: `${R.el.name || tr('a relationship')} — ${E.el.name}`, reason: tr('the line has no (min,max)') });
      } else if (pair === 'entity-hierarchy') {
        const E = a.type === 'entity' ? a : b;
        const H = a.type === 'entity' ? b : a;
        const isSuper = c.tag.kind ? c.tag.kind === 'super' : E.c.y < H.c.y;
        if (isSuper) {
          H.el.super = E.el.uid;
          if (H.el.total === null) H.el.total = styleVal(c.style, 'shape') === 'link';
          if (plain(c.value)) H.el.discriminator = plain(c.value).slice(0, 60);
        } else H.el.subs.push(E.el.uid);
      } else unread.push({ label: plain(c.value) || tr('a line'), reason: tr('it joins two shapes that cannot be linked') });
    });

    // Attributes: composites take the ellipses linked only to them as parts.
    const attrs = Object.values(byCell).filter((x) => x.type === 'attribute');
    attrs.filter((x) => !x.owner && x.links && x.links.some((y) => y.owner)).forEach((p) => {
      const comp = p.links.find((y) => y.owner);
      comp.parts.push(p.name);
      p.isPart = true;
    });
    attrs.forEach((x) => {
      if (x.isPart) return;
      if (!x.owner) { unread.push({ label: x.name || tr('an ellipse'), reason: tr('the attribute is not linked to an entity or a relationship') }); return; }
      const a = { uid: uid('a'), name: x.name.slice(0, 60), kind: x.parts.length ? 'composite' : x.kind, parts: x.parts.join(', ') };
      if (x.owner.type === 'relationship' && !['', 'multivalued', 'derived'].includes(a.kind)) a.kind = '';
      x.owner.el.attrs.push(a);
      work.layout[a.uid] = [Math.round(x.c.x), Math.round(x.c.y)];
    });
    work.hierarchies.forEach((h) => { if (h.total === null) h.total = false; });
    texts.filter((x) => !x.used && CARD_RE.test(x.text) && x.text.length < 40).forEach((x) => unread.push({ label: x.text, reason: tr('the cardinality is not next to a line') }));
    work.entities.forEach((e) => { if (!e.attrs.length) e.attrs.push({ uid: uid('a'), name: '', kind: '', parts: '' }); });
    work.next = n + 1;
    return { work, unread };
  }

  return { toXml, logicalXml, starter, fromXml, inflate, CARD_RE };
})();

if (typeof module !== 'undefined') module.exports = ErDrawio;
