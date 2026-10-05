// Writes docs/er-solutions-review.md: the review of the published lab-session ER solutions
// (databases repo: lab-sessions/handson-exercises and lab-sessions/solved-activities).
// Per exercise: the corrections this site applies (the `corrections` field of data/en/er-practice.js),
// then the findings that only concern the published files (diagram notation, LOGICAL page, documents).
// Run: node tools/er-review-report.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { DATA: { en: {}, es: {} } };
vm.createContext(ctx);
['data/en/logical.js', 'data/en/er-practice.js'].forEach((f) => vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx));
const LIST = ctx.DATA.en.ER_PRACTICE;

const FOLDER = { handson: 'lab-sessions/handson-exercises', solved: 'lab-sessions/solved-activities' };
const folderOf = (ex) => `${FOLDER[ex.group]}/exercise${ex.source.match(/(\d+)$/)[1]}`;

/* Findings about the published files only (cell ids from the .drawio files). Severity: error · ambiguity · cosmetic. */
const FILES = {
  'products-suppliers': [
    ['error', 'LOGICAL cells do not follow the pinned grammar (`marker column : TYPE [NOT NULL] [→ Ref.col]`), and the FKs of Purchases have no NOT NULL.'],
    ['cosmetic', 'The dashed `age` (`eerd-a-c-age`) is attached to the `date of birth` ellipse instead of to Customer.'],
    ['cosmetic', 'The ERD title repeats itself: "Company · Products · Suppliers · Customer · Product · Supplier".'],
  ],
  shipping: [
    ['error', 'LOGICAL cells `province code (FK)`, `national ID number (FK)` and `type name (FK)` have no NOT NULL, although the page legend says the three are NOT NULL (contract §8.5).'],
    ['ambiguity', '"A truck driver delivers many packages" could mean min 1 at Package; (0,N) is drawn.'],
  ],
  'social-network': [
    ['cosmetic', 'The `(0,M)` label `eerd-l-mentions-comment` sits mid-edge, about 180 px from Comment.'],
    ['cosmetic', '`postId` / `commentId` are camelCase, unlike the other attribute names; STATEMENT.md lists PhotoPost and VideoPost among the base entities; the header has no "Source:" line.'],
    ['error', 'LOGICAL cells do not follow the pinned grammar.'],
  ],
  electronics: [
    ['error', 'LOGICAL `Supplies` makes `tax ID` part of the PK, which contradicts "device + component → one manufacturer"; the PK is (code, name) with tax ID a NOT NULL FK (the site accepts both).'],
    ['cosmetic', '`drawio-audit.js` reports no legend on the ERD and LOGICAL pages, and `e-inc-child` folding back inside its own endpoint.'],
    ['cosmetic', 'LOGICAL uses the ambiguous column names `name` / `characteristics` in Device and Supplies.'],
  ],
  'bedroom-installer': [
    ['ambiguity', 'The two LOGICAL junction tables treat dates differently (assembly date in the PK, purchase date not), so a repeat purchase of the same model is impossible.'],
    ['error', 'LOGICAL cells do not follow the pinned grammar.'],
  ],
  'car-rental': [
    ['error', 'STATEMENT.md §4 and §6 call participation the wrong way round ("Customer (1,1) total"); by the contract the min 1 at Customer makes Reservation total. The same for Includes.'],
    ['error', 'LOGICAL cells do not follow the pinned grammar; the EERD has no EER construct (composite address and derived rental days only).'],
  ],
  publishing: [
    ['ambiguity', 'STATEMENT.md §5 says "a staff member is either an employee or a journalist" (total) and then "the hierarchy is partial"; a partial hierarchy cannot be stored with the LOGICAL page\'s one-table-per-subtype strategy.'],
    ['error', 'STATEMENT.md §6 misreads participation ("total for the one entity"): Employee and Magazine are the total ones.'],
    ['cosmetic', 'The legend still describes ratio labels ("ratio = 1:N / M:N") that are not drawn.'],
  ],
  'video-rental': [
    ['error', 'LOGICAL `voucher_id : INTEGER → Member.National ID`, but National ID is VARCHAR(20).'],
    ['cosmetic', '`Id_D` / `Id_A` are invented and named in a different style from the other attributes.'],
  ],
  dwellings: [
    ['ambiguity', 'All the attributes are invented ("Wording source: identifier"), although the heading says "exact wording from the source text".'],
    ['ambiguity', 'LOGICAL enforces neither the 1:1 (no UNIQUE on head of dwelling id) nor the inclusion constraint.'],
    ['cosmetic', 'The discriminant `role` is drawn as a 120×60 ellipse instead of the 60×60 circle.'],
  ],
  banking: [
    ['ambiguity', 'STATEMENT.md §1 says "verbatim" but drops the source note on discriminant attributes; it has no "Diagram:" header line.'],
  ],
  'orders-factories': [
    ['ambiguity', 'Places has (1,N) at Order, which forces every customer to have an order; the statement does not say so.'],
    ['cosmetic', '`shipping address` is multivalued but not composite on Customer, yet composite on Order; the table name `Order` is an SQL reserved word.'],
  ],
  sales: [
    ['error', 'No doubled participation connectors anywhere (there never were): Product, Sale and both Includes ends.'],
    ['error', 'LOGICAL rows such as "supplier code (PK)" have no `: TYPE` and no `→ Ref.col`; ids `logical-title` / `logical-legend` differ from the usual `logical-page-*`.'],
    ['cosmetic', 'Labels `erd-l-sup-pro` and `erd-l-make-sale` sit 63–65 px from their edges; composite-address child edges cross sibling ellipses; shapes off the 10 px grid (65 warnings from drawio-audit.js).'],
  ],
  training: [
    ['cosmetic', 'The exclusion constraint is a free text cell (`erd-an-excl`) not tied to the two diamonds; Employee sits below its own subtypes, and `eerd-r-emp-tri` enters the triangle through its apex from below.'],
  ],
  payroll: [
    ['ambiguity', 'Moving the base / percentage edges on the EERD changes ERD content, but contract §10 allows the EERD only to add; their ellipses stay at y≈820 while DeductionLine is at y=1380.'],
    ['ambiguity', '`kind` and `site id` are invented; the totality of the Line hierarchy is not stated; "at least one income line" is not recorded as a constraint.'],
    ['cosmetic', 'The FK columns are named plain `name` in Site and WorksIn.'],
  ],
  'natural-parks': [
    ['error', 'No doubled participation connectors (only the two FeedsOn role lines).'],
    ['ambiguity', 'The FeedsOn restrictions (minerals are not food, plants do not feed) are prose only; Manages has (0,N) at AutonomousRegion, so a park may belong to no region.'],
    ['cosmetic', 'Many edges cross attribute ellipses (e.g. `erd-r-study-sp`, `eerd-r-tri-mineral`, `eerd-r-staff-tri`); 18 cardinality labels sit 27–105 px from their edges; attribute names are PascalCase here but lowercase phrases elsewhere (257 warnings from drawio-audit.js).'],
  ],
};

const CROSS = [
  ['error', 'No doubled (total participation) connectors in solved 1, 2, 3, 8 and 11, although they have min ≥ 1 ends. Solved 4–5 and hands-on 1–3 draw them.'],
  ['error', 'EERD pages that contain no EER construct (only composite or derived attributes, or a plain entity): hands-on 1 and 2, solved 1, 2, 4, 6, 7. Contract §2 allows an EERD page only for a hierarchy, category or aggregation; `drawio-audit.js` (`eerd-justified`) only fires when an EERD adds nothing at all.'],
  ['error', 'Partial keys drawn as plain ellipses instead of with a dashed underline (contract §5): `erd-disc-issue` (solved 3), `erd-c-copy-num` (solved 4), `erd-c-tr-num` (solved 6), `erd-c-ord-num` / `erd-c-line-num` (solved 7, 10), `erd-c-pay-seq` (solved 10). The legends and both .docx files describe a "dark green circle" instead; the fill is the normal `#D9F0EA`.'],
  ['error', 'LOGICAL cells that ignore the pinned grammar `marker column : TYPE [NOT NULL] [→ Ref.col]` (contract §8.6): solved 1, 2, 3, 8, 11 and hands-on 1–4. Only solved 4 and 5 follow it.'],
  ['ambiguity', 'Every LOGICAL legend cites a "2026-09-18 human ruling" that the page shows no cardinality marks; solved 9 says it supersedes contract §8.6 and §10, but the contract text still requires look-across (min,max) on every page.'],
  ['cosmetic', 'Legends still describe ratio labels ("ratio = 1:N / M:N", "ratio at the diamond") that are no longer drawn: solved 2–6, 8–11.'],
  ['error', '`solved-activities/Exercises_Solutions_with_Diagrams_EN.docx` is out of date (16 Sep) and untracked: every 1:N has its tuples the old (look-here) way round, it still says "cardinality ratios are written next to the diamond", it shows an EERD for solved 8 that no longer exists, it has no LOGICAL pages, and its sections jump from 5 to 8.'],
  ['cosmetic', 'Leftover files: the Word lock file `~$ercises_Solutions_with_Diagrams_EN.docx` and the draw.io backups `.$exercise8.drawio.bkp`, `.$exercise10.drawio.bkp`, `handson-exercises/exercise4/.$exercise4.drawio.bkp`.'],
  ['ambiguity', 'Several STATEMENT.md §1 blocks claim to be verbatim but are summaries (solved 2 is a "recorded transcription"; solved 11 leaves out most of question 21), and some include answer-key notes (solved 1).'],
];

const AUDIT_GAPS = [
  'doubled (total participation) connectors, compared with the min of the opposite end;',
  'the side of each (min,max) label (look-here vs look-across), compared with STATEMENT.md §4;',
  'the LOGICAL cell grammar of contract §8.6;',
  'EERD pages that add attributes or plain entities but no EER construct;',
  'partial keys without a dashed underline;',
  'consistency between the ERD, the EERD and the LOGICAL page (elements present in one page only).',
];

const sev = (s) => ({ error: '**error**', ambiguity: 'ambiguity', cosmetic: 'cosmetic' }[s]);
const out = [];
out.push('# Review of the published ER solutions');
out.push('');
out.push('Review of the lab-session ER exercises in the course repository (`databases`): `lab-sessions/handson-exercises/exercise1-4` and `lab-sessions/solved-activities/exercise1-11`, each with a `STATEMENT.md` and an `exerciseN.drawio`. The rules applied are those of `.opencode/er-model-contract.md` (look-across cardinalities, doubled connectors for total participation, dashed underline for partial keys, EERD page only for EER constructs, LOGICAL cell grammar).');
out.push('');
out.push('The ER practice of this site (`#/relational/er/practice`) uses the **corrected** models. Where an exercise shares its model with ER → Logical, the correction also applies there (`data/<lang>/logical.js`). Nothing in the `databases` repository was changed: this document lists what to fix there.');
out.push('');
out.push('_Generated by `node tools/er-review-report.mjs` from `data/en/er-practice.js` (the "Corrected in the site" lists); do not edit by hand._');
out.push('');
out.push('## Issues in every exercise or in shared files');
out.push('');
CROSS.forEach(([s, text]) => out.push(`- ${sev(s)}: ${text}`));
out.push('');
out.push('`scripts/drawio-audit.js` reports few of these. It does not check:');
out.push('');
AUDIT_GAPS.forEach((g) => out.push(`- ${g}`));
out.push('');
out.push('## Per exercise');
LIST.forEach((ex) => {
  out.push('');
  out.push(`### ${ex.source}: ${ex.title}`);
  out.push('');
  out.push(`Folder: \`${folderOf(ex)}\` · Site: \`#/relational/er/practice/${LIST.indexOf(ex) + 1}\`${typeof ex.model === 'string' ? ` · Shares its model with ER → Logical \`${ex.model}\`` : ''}`);
  out.push('');
  out.push('Corrected in the site:');
  out.push('');
  (ex.corrections || []).forEach((c) => out.push(`- ${c}`));
  const files = FILES[ex.id] || [];
  if (files.length) {
    out.push('');
    out.push('Only in the published files:');
    out.push('');
    files.forEach(([s, text]) => out.push(`- ${sev(s)}: ${text}`));
  }
});
out.push('');
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'er-solutions-review.md'), out.join('\n'));
console.log(`docs/er-solutions-review.md: ${LIST.length} exercises`);
