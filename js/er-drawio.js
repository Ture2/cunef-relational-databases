'use strict';

/* ==========================================================================
   ER models ↔ diagrams.net (draw.io) files, in the course's Chen notation.

   toXml(model, opts)   an editable .drawio of a model: entities, relationships
                        and hierarchies as shapes, attributes as ellipses around
                        their owner, look-across (min,max) labels on the lines,
                        double lines for total participation.
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
  };
  const CARD_RE = /\(\s*(\d+)\s*[,.;]\s*(\d+|[NnMm*])\s*\)/;

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

  function attrLabel(a) {
    const n = he(a.name);
    if (a.kind === 'key') return `<u>${n}</u>`;
    if (a.kind === 'partial') return `<span style="text-decoration: underline dashed">${n}</span>`;
    return n;
  }
  const attrStyle = (a) => STYLE[a.kind === 'multivalued' ? 'multivalued' : a.kind === 'derived' ? 'derived' : 'attribute'];

  /* model: { entities: [{ id, at, weak, attrs, _uid? }], relationships, hierarchies, title }
     opts: { title, source, statement: [lines], layout: { uid: [x, y] } (centres from an import) } */
  function toXml(model, opts = {}) {
    let n = 1;
    const id = () => `c${++n}`;
    const cells = [];
    const layout = opts.layout || {};
    const X = (c) => c * 180;
    const Y = (r) => r * 175;
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
      return { r, x: c.x, y: c.y, w: Math.max(110, textW(r.id, 110, 7.6) + 30), h: 64, dirs: [] };
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
              if (!boxes.some((o) => overlaps(o, b) || (strict && o !== owner && crosses(owner, b, o)))) { spot = b; used.push(ang); break; }
            }
          }
          if (spot) break;
        }
        if (!spot) spot = { x: owner.x + ((boxes.length % 5) - 2) * 60, y: owner.y - radii[radii.length - 1][1] - 50, w, h: 36 };
        const aid = vertex({ kind: 'attribute', 'attr-kind': a.kind || '' }, attrLabel(a), attrStyle(a), spot);
        edge({ kind: 'link' }, aid, ownerId, STYLE.line);
        (a.parts || []).forEach((p, i, all) => {
          const pw = textW(p, 70, 6.6);
          const off = (i - (all.length - 1) / 2) * 34;
          const away = Math.sign(spot.y - owner.y) || -1;
          const pb = { x: spot.x + off * 2.6, y: spot.y + away * (60 + Math.abs(off) * 0.4), w: pw, h: 28 };
          const pid = vertex({ kind: 'part' }, he(p), STYLE.part, pb);
          edge({ kind: 'link' }, pid, aid, STYLE.line);
        });
      });
    };
    Object.values(ents).forEach((E) => ring(E, E.e.attrs, ids[E.e.id], [[110, 80], [190, 125], [270, 170]]));
    rels.forEach((R) => ring(R, R.r.attrs || [], R.cid, [[95, 70], [170, 110], [245, 150]]));

    const UNARY_LEGS = [
      'exitX=1;exitY=0.8;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;',
      'exitX=0.8;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;',
      'exitX=1;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0;entryDx=0;entryDy=0;',
      'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;',
    ];
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
    // Shift everything into the positive quadrant.
    const minX = Math.min(...boxes.map((b) => b.x - b.w / 2));
    const dx = 40 - minX;
    const dy = 40 - minY;
    const body = cells.join('').replace(/<mxGeometry x="(-?\d+)" y="(-?\d+)"/g, (m, x, y) => `<mxGeometry x="${+x + Math.round(dx)}" y="${+y + Math.round(dy)}"`);
    return wrap(body, opts.title || model.title || 'ER model');
  }

  const wrap = (body, name) => `<mxfile host="cunef-databases-practice" type="device"><diagram name="ERD" id="erd"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${body}</root></mxGraphModel></diagram></mxfile>\n`;

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
    return wrap(cells.join(''), ex.title);
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

  return { toXml, starter, fromXml, inflate, CARD_RE };
})();

if (typeof module !== 'undefined') module.exports = ErDrawio;
