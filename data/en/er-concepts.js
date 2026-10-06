'use strict';
/* ER concept cards shown in the "ER concepts" section.
   Grounded in content/translations/tema2-mcd/translated.md (Topic 2, CDM) and
   .opencode/er-model-contract.md §4–7. `topic` keys match ER_QUIZ_TOPICS. */

DATA.en.ER_CONCEPTS = [
  { id: 'entity', title: 'Entity', topic: 'basics',
    summary: 'A real or abstract object of interest to the organization, about which we can — and want to — obtain information.',
    body: [
      'People, things, places, concepts or events can all be entities. A set of entities with the same characteristics forms an **entity type** (the two terms are often used interchangeably), and a concrete realization of it is an **entity occurrence**: for the entity type BOOK, "Don Quixote" is one occurrence.',
      'An entity is drawn as a rectangle containing its name. The E/R model is built from just three elements — **entities**, **attributes** and **relationships** — which together are the **static properties** of an application (operations are the dynamic properties; integrity rules the third category).',
    ],
    points: [
      'Rule i: it must have its **own existence**.',
      'Rule ii: each occurrence must be **distinguishable** from the others.',
      'Rule iii: all occurrences must have the **same types of attributes**.',
      'Name entity types with a singular noun (BOOK, not BOOKS).',
    ],
    example: 'In a library, BOOK is an entity type, "Don Quixote" is one of its occurrences, and Title is one of its attributes.',
    mistake: 'Promoting a single property (a phone number, a colour) to an entity. If it has no existence of its own and nothing to describe beyond its value, it is an attribute.',
    diagram: {
      w: 400, h: 160,
      nodes: [
        { id: 'B', cx: 0.2, cy: 0.5, type: 'entity', label: 'BOOK' },
        { id: 'isbn', cx: 0.7, cy: 0.25, type: 'attribute', label: 'ISBN', kind: 'key' },
        { id: 'title', cx: 0.7, cy: 0.75, type: 'attribute', label: 'Title' },
      ],
      edges: [
        { from: 'B', to: 'isbn' },
        { from: 'B', to: 'title' },
      ],
    },
    caption: 'The entity type BOOK (rectangle) with a key attribute ISBN (underlined) and a descriptor attribute Title.' },

  { id: 'attributes', title: 'Attributes and their kinds', topic: 'attributes',
    summary: 'A property or characteristic of an entity, common to all its occurrences: a basic unit of information that serves to identify or describe it.',
    body: [
      'Each attribute takes its values from a **domain**: a named set of homogeneous values, e.g. PRINTER_TECHNOLOGIES = {Inkjet, Dot-matrix, Laser, Sublimation}. By role, an attribute is either an **identifier** (part of a key) or a **descriptor**, which characterizes an occurrence without distinguishing it from the others.',
      'Restrictions classify attributes further. Each kind has its own symbol: a plain ellipse for simple, child ellipses hanging off a parent for composite, a **double ellipse** for multivalued and a **dashed ellipse** with a dashed connector for derived.',
    ],
    points: [
      '**Simple** (indivisible) vs **composite** (Address = street, number, city, province, postal code).',
      '**Single-valued** (one value per occurrence) vs **multivalued** (several phone numbers).',
      '**Mandatory**: must take at least one value for every occurrence.',
      '**Derived**: calculable from other attributes (Age from Birth_Date) — redundant, so remove it; keep it only for efficiency.',
    ],
    example: 'PERSON(ID, Name, Birth_Date, Phone, Age): ID identifies, Name is composite (first name + surnames), Phone is multivalued and Age is derived.',
    mistake: 'Storing a derived attribute as if it were required. The course says derived attributes must be removed from the schema and may be kept only as an optional efficiency measure.',
    diagram: {
      w: 600, h: 300,
      nodes: [
        { id: 'P', cx: 0.14, cy: 0.5, type: 'entity', label: 'PERSON' },
        { id: 'id', cx: 0.5, cy: 0.1, type: 'attribute', label: 'ID', kind: 'key' },
        { id: 'name', cx: 0.5, cy: 0.3, type: 'attribute', label: 'Name' },
        { id: 'fn', cx: 0.83, cy: 0.12, type: 'attribute', label: 'First_name' },
        { id: 'sn', cx: 0.83, cy: 0.38, type: 'attribute', label: 'Surname' },
        { id: 'bd', cx: 0.5, cy: 0.5, type: 'attribute', label: 'Birth_Date' },
        { id: 'ph', cx: 0.5, cy: 0.7, type: 'attribute', label: 'Phone', kind: 'multivalued' },
        { id: 'age', cx: 0.5, cy: 0.9, type: 'attribute', label: 'Age', kind: 'derived' },
      ],
      edges: [
        { from: 'P', to: 'id' },
        { from: 'P', to: 'name' },
        { from: 'name', to: 'fn' },
        { from: 'name', to: 'sn' },
        { from: 'P', to: 'bd' },
        { from: 'P', to: 'ph' },
        { from: 'P', to: 'age', dashed: true },
      ],
    },
    caption: 'Key ID (underlined), composite Name with its components, simple Birth_Date, multivalued Phone (double ellipse) and derived Age (dashed).' },

  { id: 'keys', title: 'Keys: candidate, primary, composite', topic: 'attributes',
    summary: 'A primary key is an attribute, or a minimal set of attributes, that gives unique access to each occurrence of an entity.',
    body: [
      'At first you may find several attributes (or sets) that could identify an occurrence: together they are the **candidate** or **alternate keys**. You choose one of them as the **primary key**, drawn underlined (or as a filled circle).',
      'A key must be **minimal**: removing any of its attributes would destroy its identifying power. A key of one attribute is a **simple key**; one made of several attributes is a **composite** (concatenated) key.',
    ],
    points: [
      'Candidate keys: every attribute set that can identify an occurrence.',
      'Primary key: the candidate you choose.',
      'Composite key: several attributes that identify together, and only together.',
      'Descriptor: characterizes but does not identify.',
    ],
    example: 'EMPLOYEE(SSN, Email, Name, BirthDate): SSN and Email are both candidate keys; choosing SSN makes it the primary key and leaves Email as an alternate key.',
    mistake: 'Adding extra attributes to a key "to be safe". SSN + Name is not a key, because it is not minimal: SSN alone already identifies the employee.',
    diagram: {
      w: 460, h: 240,
      nodes: [
        { id: 'E', cx: 0.18, cy: 0.5, type: 'entity', label: 'EMPLOYEE' },
        { id: 'ssn', cx: 0.72, cy: 0.13, type: 'attribute', label: 'SSN', kind: 'key' },
        { id: 'email', cx: 0.72, cy: 0.38, type: 'attribute', label: 'Email' },
        { id: 'name', cx: 0.72, cy: 0.63, type: 'attribute', label: 'Name' },
        { id: 'bd', cx: 0.72, cy: 0.88, type: 'attribute', label: 'BirthDate' },
      ],
      edges: [
        { from: 'E', to: 'ssn' },
        { from: 'E', to: 'email' },
        { from: 'E', to: 'name' },
        { from: 'E', to: 'bd' },
      ],
    },
    caption: 'SSN was chosen as the primary key (underlined); Email is an alternate key; Name and BirthDate are descriptors.' },

  { id: 'relationships', title: 'Relationships and degree', topic: 'relationships',
    summary: 'An association between entities, governed by restrictions that determine which entities may participate in it.',
    body: [
      'A relationship is drawn as a diamond with a verb-like name (EMPLOYEE **works in** DEPARTMENT, MOVEMENT **belongs to** ACCOUNT). A **relationship occurrence** is one concrete association: "Pepe Pérez" works in the "Accounting Department". A relationship may carry descriptor attributes of its own, which hang off the diamond.',
      'Every relationship has three properties: a unique **name**, a **degree** (how many entity types it connects) and a **type of correspondence** (1:1, 1:N or M:N).',
    ],
    points: [
      '**Unary** (recursive): an entity relates to itself — an employee manages other employees.',
      '**Binary**: entities related two by two — EMPLOYEE works in DEPARTMENT.',
      '**Ternary**: three entity types — SUPPLIER supplies PART to PROJECT.',
      'Relationship attributes (a `since` date) belong to the diamond, not to either entity.',
    ],
    mistake: 'Counting occurrences instead of entity types when giving the degree. "Manages" links many employees, but only one entity type, so it is unary.',
    diagram: {
      w: 560, h: 200,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.66, type: 'entity', label: 'EMPLOYEE' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'works in' },
        { id: 'D', cx: 0.87, cy: 0.66, type: 'entity', label: 'DEPARTMENT' },
        { id: 's', cx: 0.5, cy: 0.17, type: 'attribute', label: 'since' },
      ],
      edges: [
        { from: 'E', to: 'R', card: '(0,N)', total: true },
        { from: 'D', to: 'R', card: '(1,1)' },
        { from: 'R', to: 's' },
      ],
    },
    caption: 'A binary relationship "works in" with its own attribute "since". Each employee works in exactly one department; a department has zero or more employees.' },

  { id: 'correspondence', title: 'Type of correspondence: 1:1, 1:N, M:N', topic: 'cardinality',
    summary: 'The maximum number of occurrences of one entity that can be associated with one occurrence of the other entity through a relationship.',
    body: [
      'For a relationship between A and B there are three possibilities. **1:1**: an A is associated with at most one B, and vice versa. **1:N**: an A can be associated with any number of B, but a B with at most one A. **M:N**: any number in both directions.',
      'In the course the correspondence is not drawn on a binary diagram: it is **derived** from the two look-across tuples and stated in the prose. It depends only on the **max** values: the side whose tuple has max = 1 is the "one" side; max = N is the "many" side.',
    ],
    points: [
      '(1,1) with (0,N) ⇒ 1:N.',
      '(0,N) with (0,N) ⇒ M:N.',
      '(0,1) or (1,1) at both ends ⇒ 1:1.',
      'The mins do not change the ratio; they give participation.',
    ],
    example: 'STUDENT (0,N) — enrols in — COURSE (0,N): both maxima are N, so the correspondence is M:N.',
    mistake: 'Writing "1:N" or "M:N" next to the diamond of a binary relationship. The course diagrams carry only the (min,max) tuples; the ratio is derived from them.',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'S', cx: 0.13, cy: 0.5, type: 'entity', label: 'STUDENT' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'enrols in' },
        { id: 'C', cx: 0.87, cy: 0.5, type: 'entity', label: 'COURSE' },
      ],
      edges: [
        { from: 'S', to: 'R', card: '(0,N)' },
        { from: 'C', to: 'R', card: '(0,N)' },
      ],
    },
    caption: 'Both tuples have max = N, so this relationship is many-to-many (M:N). Both mins are 0, so both participations are partial.' },

  { id: 'cardinality', title: 'Look-across cardinality and participation', topic: 'cardinality',
    summary: 'The (min,max) at entity E states how many occurrences of E can be related to ONE occurrence of the other entity.',
    body: [
      'The cardinality of an entity type is the pair of minimum and maximum occurrences of it that can be related to one occurrence of the other entity type(s). It is written (0,1), (1,1), (0,N) or (1,N) at each connector end, and read **across** the diamond: "given one <other>, how many E?".',
      '**Participation** (membership class) says whether every occurrence must take part. Because each tuple counts the entity at its own end for one opposite occurrence, participation is read from the **opposite** tuple: min = 1 there means E participates **totally** (mandatory, double line at E); min = 0 means **partially** (optional, single line).',
    ],
    points: [
      'max = 1 at E ⇒ E is the "one" side; max = N ⇒ the "many" side.',
      'min = 1 at E ⇒ every opposite occurrence relates to at least one E.',
      'The min = 1 and the double line sit at **opposite ends**.',
      'Ratio from the two maxima: (1,1)/(0,N) ⇒ 1:N.',
    ],
    example: 'TruckDriver (1,1) — Delivers — Package (0,N): each Package is delivered by exactly one TruckDriver; each TruckDriver delivers zero or more Packages. Package participates totally (double line), TruckDriver partially.',
    mistake: 'Reading the tuple "look-here": taking (1,1) at TruckDriver to mean "each driver delivers exactly one package". It means the opposite: each package has exactly one driver.',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'T', cx: 0.13, cy: 0.5, type: 'entity', label: 'TruckDriver' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'Delivers' },
        { id: 'P', cx: 0.87, cy: 0.5, type: 'entity', label: 'Package' },
      ],
      edges: [
        { from: 'T', to: 'R', card: '(1,1)' },
        { from: 'P', to: 'R', card: '(0,N)', total: true },
      ],
    },
    caption: 'The (1,1) at TruckDriver makes Package total (double line); the (0,N) at Package leaves TruckDriver partial. Maxima 1 and N ⇒ 1:N.' },

  { id: 'ternary', title: 'Ternary and higher-degree relationships', topic: 'relationships', video: true,
    summary: 'One diamond, three (or more) entities: each occurrence is a single fact that needs all of them at once.',
    body: [
      'Use a ternary relationship when a fact only makes sense with **three** entities together. "Mike takes Physics **with Jones**" links a STUDENT, a COURSE and an INSTRUCTOR in one occurrence; knowing only two of them does not tell you the third.',
      'The look-across rule still works: **fix the other two, then count**. The (min,max) at INSTRUCTOR answers "for one student **and** one course, how many instructors?". With four entities (quaternary) you fix the other three.',
    ],
    points: [
      'The maxima give the ratio: **1:1:1**, **1:1:N**, **1:M:N** or **M:N:P**.',
      'A max of **1** at an end means the other entities determine it: in M:N:1, the pair (student, course) is the key of the relationship.',
      'Taken two by two, the entities are **M:N**. A rule about a pair ("each course has one instructor") is a different, explicit constraint.',
      'In the logical model it becomes **one table** with a FK to each entity (see ER → Logical, "Ternary relationship").',
    ],
    example: 'STUDENT (1,N) — takes — COURSE (1,N) — INSTRUCTOR (1,1): for one student and one course there is exactly one instructor, so the ratio is M:N:1.',
    mistake: 'Replacing the ternary with three binary relationships. Joining the pairs back invents facts: in the table above, Mike–Physics, Physics–Song and Mike–Song all exist as pairs, so the join adds "Mike takes Physics with Song", which never happened.',
    table: {
      caption: 'Takes, three real facts. Split into pairs and joined again, it gains a fourth, **spurious** row: Mike · Physics · Song.',
      head: ['student', 'course', 'instructor'],
      rows: [
        ['Mike', 'Physics', 'Jones'],
        ['Mike', 'Chemistry', 'Song'],
        ['Anne', 'Physics', 'Song'],
      ],
    },
    diagram: {
      w: 560, h: 280,
      nodes: [
        { id: 'S', cx: 0.14, cy: 0.14, type: 'entity', label: 'STUDENT' },
        { id: 'C', cx: 0.14, cy: 0.86, type: 'entity', label: 'COURSE' },
        { id: 'I', cx: 0.86, cy: 0.5, type: 'entity', label: 'INSTRUCTOR' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'takes' },
      ],
      edges: [
        { from: 'S', to: 'R', card: '(1,N)' },
        { from: 'C', to: 'R', card: '(1,N)' },
        { from: 'I', to: 'R', card: '(1,1)' },
      ],
    },
    caption: 'A ternary relationship. Read each end with the other two fixed: for one student and course, exactly one instructor (1,1); for one course and instructor, one or more students (1,N).' },

  { id: 'weak-entity', title: 'Weak entities', topic: 'weak',
    summary: 'An entity that depends on another (its owner) for its existence; drawn as a double rectangle.',
    body: [
      'Entity B has an **existence dependency** on A when, without A, B would be meaningless. The course test is the **deletion** question: "Should any occurrence of entity A be deleted if an occurrence of entity B is deleted?" If yes, the dependency exists. An entity without it is **strong** (regular).',
      'With **identification dependency**, the entity also lacks enough attributes for its own key: it is identified through its relationship with the owner, which supplies the missing part. Its PK = owner PK + its **partial key** (dashed underline). The link to the owner is the **identifying relationship**, drawn as a double-outline diamond.',
    ],
    points: [
      'Existence dependency: depends on the owner but has its own sufficient key.',
      'Identification dependency always implies existence dependency — not the other way round.',
      'The course contract models a double rectangle only when **both** dependencies hold.',
      'Weak entities in M:N relationships are highly unusual; they sit on the "many" side of a 1:N.',
    ],
    example: 'A bank MOVEMENT has no key of its own; it is identified by its ACCOUNT number plus its date, so PK = AccountNumber + Date.',
    mistake: 'Marking an entity weak just because it "belongs to" another. If it has its own natural key (an invoice with a unique invoice number), it is strong.',
    diagram: {
      w: 600, h: 200,
      nodes: [
        { id: 'A', cx: 0.13, cy: 0.66, type: 'entity', label: 'ACCOUNT' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'belongs to', identifying: true },
        { id: 'M', cx: 0.87, cy: 0.66, type: 'entity', label: 'MOVEMENT', weak: true },
        { id: 'an', cx: 0.13, cy: 0.17, type: 'attribute', label: 'AccountNumber', kind: 'key' },
        { id: 'amt', cx: 0.66, cy: 0.17, type: 'attribute', label: 'Amount' },
        { id: 'dt', cx: 0.87, cy: 0.17, type: 'attribute', label: 'Date', kind: 'partial' },
      ],
      edges: [
        { from: 'A', to: 'R', card: '(1,1)' },
        { from: 'M', to: 'R', card: '(0,N)', total: true },
        { from: 'A', to: 'an' },
        { from: 'M', to: 'amt' },
        { from: 'M', to: 'dt' },
      ],
    },
    caption: 'MOVEMENT (double rectangle) is identified through the identifying relationship "belongs to" (double diamond): PK = AccountNumber + Date (partial key).' },

  { id: 'relationship-constraints', title: 'Exclusive, inclusive and inclusion relationships', topic: 'relationships',
    summary: 'Constraints between two relationship types R1 and R2 with respect to the same entity E1.',
    body: [
      'Sometimes the participation of an entity in one relationship depends on its participation in another. The course distinguishes three cases, all stated between two relationship types R1 and R2 with respect to an entity E1.',
    ],
    points: [
      '**Exclusive**: E1 relates either with E2 (through R1) or with E3 (through R2), never both at the same time.',
      '**Inclusive**: to take part in R2, E1 must previously have taken part in R1 a **certain number of times** (at least two courses before working as a product designer).',
      '**Inclusion**: to take part in R2, E1 must previously have taken part in R1 **once** (a marriage before a divorce).',
    ],
    example: 'An employee is either a permanent member of staff who belongs to a department, or an intern assigned to an internship group who belongs to no department — an exclusive relationship.',
    mistake: 'Confusing inclusive with inclusion: the difference is whether the previous participation is required a certain number of times (inclusive) or once (inclusion).',
    diagram: {
      w: 600, h: 240,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.5, type: 'entity', label: 'EMPLOYEE' },
        { id: 'R1', cx: 0.5, cy: 0.2, type: 'relationship', label: 'belongs to' },
        { id: 'R2', cx: 0.5, cy: 0.8, type: 'relationship', label: 'assigned to' },
        { id: 'D', cx: 0.87, cy: 0.2, type: 'entity', label: 'DEPARTMENT' },
        { id: 'G', cx: 0.87, cy: 0.8, type: 'entity', label: 'INTERN GROUP' },
      ],
      edges: [
        { from: 'E', to: 'R1', card: '(1,N)' },
        { from: 'D', to: 'R1', card: '(0,1)', total: true },
        { from: 'E', to: 'R2', card: '(1,N)' },
        { from: 'G', to: 'R2', card: '(0,1)', total: true },
      ],
    },
    caption: 'EMPLOYEE takes part either in "belongs to" or in "assigned to", not both (exclusive). The exclusivity itself is a constraint between the two relationships, noted beside the diagram.' },

  { id: 'hierarchy', title: 'Generalization and specialization', topic: 'eer',
    summary: 'A hierarchy connects a supertype to its subtypes through an inverted triangle; the subtypes inherit the supertype\'s attributes and relationships.',
    body: [
      '**Generalization** is bottom-up: abstract a supertype from several entity types, moving their common attributes and relationships up (TEACHER + STUDENT ⇒ PERSON). **Specialization** is the inverse, top-down: decompose a supertype into subtypes that inherit everything and add their own (EMPLOYEE ⇒ SECRETARY, TECHNICIAN, ENGINEER).',
      'The letter in the triangle gives the constraint: **d** = disjoint (an occurrence is at most one subtype), **o** = overlapping (it may be several). If the split is determined by the values of a **discriminating attribute**, it is shown as a circle joined to the triangle by a dotted edge. The Elmasri & Navathe study text also asks whether the specialization is **total** (every occurrence is in some subtype) or **partial**.',
    ],
    points: [
      'Supertype on top, triangle base parallel to it, subtypes below.',
      '`d` disjoint · `o` overlapping · `U` union (category).',
      'Discriminant: a circle with a dotted edge to the triangle.',
      'Total vs partial: must every supertype occurrence belong to a subtype?',
    ],
    example: 'EMPLOYEE specialised into SECRETARY, TECHNICIAN and ENGINEER, disjoint, discriminated by Job_type.',
    mistake: 'Creating subtypes that add nothing. A subtype is justified by its own attributes or relationships; otherwise a descriptor attribute is enough.',
    diagram: {
      w: 560, h: 300,
      nodes: [
        { id: 'E', cx: 0.5, cy: 0.15, type: 'entity', label: 'EMPLOYEE' },
        { id: 'h', cx: 0.5, cy: 0.48, type: 'isa', label: 'd' },
        { id: 'jt', cx: 0.8, cy: 0.48, type: 'attribute', label: 'Job_type' },
        { id: 'S', cx: 0.17, cy: 0.85, type: 'entity', label: 'SECRETARY' },
        { id: 'T', cx: 0.5, cy: 0.85, type: 'entity', label: 'TECHNICIAN' },
        { id: 'N', cx: 0.83, cy: 0.85, type: 'entity', label: 'ENGINEER' },
      ],
      edges: [
        { from: 'E', to: 'h' },
        { from: 'h', to: 'S' },
        { from: 'h', to: 'T' },
        { from: 'h', to: 'N' },
        { from: 'h', to: 'jt', dashed: true },
      ],
    },
    caption: 'A disjoint (d) specialization of EMPLOYEE; the discriminating attribute Job_type is joined to the triangle by a dotted edge.' },

  { id: 'category', title: 'Categories (union types)', topic: 'eer',
    summary: 'A category is a subtype that results from the union of several entity types: several supertypes, one subtype.',
    body: [
      'A category is the reverse shape of an ordinary hierarchy. Instead of one supertype splitting into several subtypes, several supertypes are gathered into a single subtype, marked with **U** in the triangle.',
      'It is used when a relationship must reach "any of" several different entity types. Each occurrence of the category comes from exactly one of the supertypes.',
    ],
    example: 'Given PERSON and COMPANY, if a relationship with VEHICLE is needed, OWNER is created as a union subtype of the two: a vehicle is owned by an OWNER, who is either a person or a company.',
    mistake: 'Drawing OWNER as a supertype of PERSON and COMPANY. That would mean every person and company is an owner; the category says every owner is a person or a company.',
    diagram: {
      w: 600, h: 300,
      nodes: [
        { id: 'P', cx: 0.2, cy: 0.15, type: 'entity', label: 'PERSON' },
        { id: 'C', cx: 0.55, cy: 0.15, type: 'entity', label: 'COMPANY' },
        { id: 'u', cx: 0.375, cy: 0.48, type: 'isa', label: 'U' },
        { id: 'O', cx: 0.375, cy: 0.85, type: 'entity', label: 'OWNER' },
        { id: 'R', cx: 0.68, cy: 0.85, type: 'relationship', label: 'owns' },
        { id: 'V', cx: 0.9, cy: 0.85, type: 'entity', label: 'VEHICLE' },
      ],
      edges: [
        { from: 'P', to: 'u' },
        { from: 'C', to: 'u' },
        { from: 'u', to: 'O' },
        { from: 'O', to: 'R', card: '(1,1)' },
        { from: 'V', to: 'R', card: '(0,N)', total: true },
      ],
    },
    caption: 'OWNER is the union (U) of PERSON and COMPANY, so a single relationship "owns" can link it to VEHICLE.' },

  { id: 'aggregation', title: 'Aggregation', topic: 'eer',
    summary: 'Builds a new entity type from other entity types together with their relationship, so it can be handled at a higher level of abstraction.',
    body: [
      'The E/R model does not allow **relationships between relationship types**. When a relationship itself needs to take part in another relationship, you aggregate it: the participating entities plus their relationship are treated as one higher-level entity, which can then be related like any other entity.',
      'The inverse process is called **disaggregation**. When the model is transformed to tables, the aggregate becomes its own relation and the outer relationship references it as a normal entity.',
    ],
    example: 'COMPANY and JOB APPLICANT are related through INTERVIEW, but each interview must correspond to a particular JOB OFFER. Aggregate COMPANY + INTERVIEW + APPLICANT into one entity type and relate that to JOB OFFER.',
    mistake: 'Drawing a line straight from one diamond to another. A relationship cannot connect to a relationship; aggregation is the construct that makes it legal.' },

  { id: 'time', title: 'The temporal dimension', topic: 'steps',
    summary: 'Decide whether the data must be seen over time, and capture the time milestones with date attributes.',
    body: [
      'Review the semantics to determine whether the data must be viewed with an eye to both the present and the future (and the history). If so, consider adding **date-type attributes** that establish the temporal milestones under study.',
      'Take care with dates on **many-to-many** relationships: verify that the result does not violate the **unique-access** principle for the occurrences of that relationship once the conceptual model is transformed into the logical model.',
    ],
    example: 'An employee can work on the same project in several periods. A Start_Date on "works on" records each period — but the pair (employee, project) alone no longer identifies an occurrence.',
    diagram: {
      w: 560, h: 200,
      nodes: [
        { id: 'E', cx: 0.13, cy: 0.66, type: 'entity', label: 'EMPLOYEE' },
        { id: 'R', cx: 0.5, cy: 0.66, type: 'relationship', label: 'works on' },
        { id: 'P', cx: 0.87, cy: 0.66, type: 'entity', label: 'PROJECT' },
        { id: 'sd', cx: 0.5, cy: 0.17, type: 'attribute', label: 'Start_Date' },
      ],
      edges: [
        { from: 'E', to: 'R', card: '(0,N)' },
        { from: 'P', to: 'R', card: '(0,N)' },
        { from: 'R', to: 'sd' },
      ],
    },
    caption: 'A date attribute on an M:N relationship records when each occurrence happened; check that each occurrence stays uniquely accessible.' },

  { id: 'steps', title: 'Steps for building the model', topic: 'steps',
    summary: 'The course\'s five steps for creating the extended E/R model, from a brief to a documented diagram.',
    body: [
      'Conceptual modelling answers the **What**, never the **How**: it describes only the problem, with no bias towards a DBMS, tables or storage. The data engineer refines the (ambiguous, natural-language) problem semantics gathered from the experts until it is precise.',
      'The work is iterative: after drawing the model, revisit the brief and check each entity, key, relationship and cardinality against it.',
    ],
    points: [
      '1. Identify the **entities** within the system.',
      '2. Determine the **keys** (identifiers) of the entities.',
      '3. Establish the **relationships** between the entities, describing their degree.',
      '4. **Draw** the conceptual data model.',
      '5. Identify each entity\'s **attributes** and describe them in the data dictionary.',
    ],
    mistake: 'Starting from tables and foreign keys. That is the logical model (the How); the conceptual model comes first and is independent of it.' },
];
