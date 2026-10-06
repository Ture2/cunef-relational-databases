'use strict';
/* ER / EER concept quiz (source: Quiz 2, Block II).
   Q1–Q28 transcribed from quizzes/Quiz_2_Block_II_Conceptual_Data_Model_ER_EER.md
   (answers cross-checked with scripts/build_quizzes_qti.js); essays Q29–Q30 skipped.
   Items marked `extra: true` are additional questions grounded in
   content/translations/tema2-mcd/translated.md. */

DATA.en.ER_QUIZ_TOPICS = {
  basics: 'Modelling basics',
  attributes: 'Attributes & keys',
  relationships: 'Relationships',
  cardinality: 'Cardinality',
  weak: 'Weak entities',
  eer: 'Hierarchies & EER',
  steps: 'Building a model',
};

DATA.en.ER_QUIZ = [
  // Q1
  { type: 'mc', topic: 'basics',
    q: 'In conceptual modelling, which of these are the **static properties** of an application?',
    choices: [
      'Entities, their attributes, and the relationships between them',
      'The operations performed on entities and attributes',
      'The integrity rules over entities and operations',
      'The indexes and file organisations used at run time',
    ],
    answer: 0,
    why: 'Static properties are entities, attributes and relationships; dynamic properties are operations; integrity rules are the third category.' },

  // Q2
  { type: 'mc', topic: 'basics',
    q: 'During the first stages of the lifecycle, a data engineer must focus on:',
    choices: [
      'Selecting the DBMS product and the hardware',
      'Defining and specifying the problem semantics — the **What**, not the **How**',
      'Choosing the storage organisation for each table',
      'Writing the DDL for the schema',
    ],
    answer: 1,
    why: 'This is the Analysis / Information-System Planning phase: model the problem itself, without views or biases tied to a particular solution (the How).' },

  // Q3
  { type: 'mc', topic: 'basics',
    q: 'Which of these is **NOT** a documented alternative or evolution of the E/R model?',
    choices: [
      'The extended E/R model (EER)',
      'The UML class diagram',
      'The Bachman diagram (data structure diagram)',
      'Relational calculus',
    ],
    answer: 3,
    why: 'Chen\'s E/R model, its EER extension, UML class diagrams and the Bachman/Martin diagrams are modelling notations; relational calculus is a relational query formalisation, not an E/R alternative.' },

  // Q4
  { type: 'mc', topic: 'attributes',
    q: 'An entity has attributes `SSN`, `Email`, `Name`, `BirthDate`; both `SSN` and `Email` uniquely identify an employee. What are `SSN` and `Email` called?',
    choices: [
      'Descriptor attributes',
      'Candidate (alternate) keys',
      'Sub-schemas',
      'Weak attributes',
    ],
    answer: 1,
    why: 'All the keys that could identify the entity are candidate/alternate keys; the chosen one becomes the primary key.' },

  // Q5
  { type: 'mc', topic: 'attributes',
    q: 'Which attribute only **characterizes** an occurrence without distinguishing it from the others?',
    choices: [
      'A primary key',
      'A descriptor attribute',
      'A composite key',
      'A domain',
    ],
    answer: 1,
    why: 'A descriptor (e.g. professional category) describes an occurrence but does not identify it; a key uniquely identifies it.' },

  // Q6 (figure: fig-attributes)
  { type: 'mc', topic: 'attributes',
    q: 'In the figure, `Phone` is drawn with a **double ellipse**. What does this notation mean?',
    diagram: {
      w: 480, h: 280,
      nodes: [
        { id: 'P', cx: 0.15, cy: 0.5, type: 'entity', label: 'PERSON' },
        { id: 'id', cx: 0.72, cy: 0.13, type: 'attribute', label: 'ID', kind: 'key' },
        { id: 'name', cx: 0.72, cy: 0.38, type: 'attribute', label: 'Name' },
        { id: 'phone', cx: 0.72, cy: 0.63, type: 'attribute', label: 'Phone', kind: 'multivalued' },
        { id: 'age', cx: 0.72, cy: 0.88, type: 'attribute', label: 'Age', kind: 'derived' },
      ],
      edges: [
        { from: 'P', to: 'id' },
        { from: 'P', to: 'name' },
        { from: 'P', to: 'phone' },
        { from: 'P', to: 'age', dashed: true },
      ],
    },
    choices: [
      'It is a simple, single-valued attribute',
      'It is a multivalued attribute — it can take more than one value per occurrence',
      'It is a derived attribute',
      'It is the primary key',
    ],
    answer: 1,
    why: 'A double ellipse marks a multivalued attribute; in the same figure `ID` is the key (underlined) and `Age` is derived (dashed).' },

  // Q7
  { type: 'mc', topic: 'attributes',
    q: 'A `Address` attribute spans street, number, city, province and postal code. This is a:',
    choices: [
      'Single-valued attribute',
      'Composite attribute',
      'Derived attribute',
      'Mandatory attribute',
    ],
    answer: 1,
    why: 'A composite attribute can be subdivided into more elementary attributes (children hang off the parent ellipse).' },

  // Q8
  { type: 'mc', topic: 'attributes',
    q: '`Age` can be calculated from `Birth_Date`. What does the course require you to do with `Age` in the schema?',
    choices: [
      'Keep it as a stored, mandatory attribute',
      'Make it the primary key',
      'Remove it from the schema; keep it only for efficiency',
      'Convert it into a multivalued attribute',
    ],
    answer: 2,
    why: 'Derived attributes are redundant and must be removed from the schema; they may be retained only as a performance convenience (drawn dashed).' },

  // Q9 (figure: fig-cardinality-1n)
  { type: 'mc', topic: 'cardinality',
    q: 'Using the **look-across** convention, what is the type of correspondence of this relationship?',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'D', cx: 0.13, cy: 0.5, type: 'entity', label: 'DEPARTMENT' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'offers' },
        { id: 'C', cx: 0.87, cy: 0.5, type: 'entity', label: 'COURSE' },
      ],
      edges: [
        { from: 'D', to: 'R', card: '(1,1)' },
        { from: 'C', to: 'R', card: '(0,N)', total: true },
      ],
    },
    choices: [
      '1:1',
      '1:N',
      'M:N',
      'It cannot be determined from the tuples',
    ],
    answer: 1,
    why: '`DEPARTMENT` has `max = 1` (the "one" side) and `COURSE` has `max = N` (the "many" side) ⇒ 1:N.' },

  // Q10
  { type: 'mc', topic: 'relationships',
    q: '"An employee manages other employees." What is the **degree** of the relationship `Manages`?',
    choices: [
      'Unary (recursive)',
      'Binary',
      'Ternary',
      'Quaternary',
    ],
    answer: 0,
    why: 'Degree is the number of entity types connected; an entity related to itself is unary.' },

  // Q11 (figure: fig-ternary)
  { type: 'mc', topic: 'relationships',
    q: 'How many entity types participate in the `supplies` relationship shown, and what is its **degree**?',
    diagram: {
      w: 560, h: 280,
      nodes: [
        { id: 'S', cx: 0.14, cy: 0.14, type: 'entity', label: 'SUPPLIER' },
        { id: 'P', cx: 0.14, cy: 0.86, type: 'entity', label: 'PART' },
        { id: 'J', cx: 0.86, cy: 0.5, type: 'entity', label: 'PROJECT' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'supplies' },
      ],
      edges: [
        { from: 'S', to: 'R', card: '(0,N)' },
        { from: 'P', to: 'R', card: '(0,N)' },
        { from: 'J', to: 'R', card: '(1,N)' },
      ],
    },
    choices: [
      'Two entity types — binary',
      'Three entity types — ternary',
      'One entity type — unary',
      'Four entity types — quaternary',
    ],
    answer: 1,
    why: 'Degree counts the entity types the relationship connects; three entity types ⇒ ternary (look-across tuples are shown at each end).' },

  // Ternary cardinality (card: ternary)
  { type: 'mc', topic: 'relationships', extra: true,
    q: 'STUDENT, COURSE and INSTRUCTOR take part in the ternary `takes`. What does the (min,max) written at **STUDENT** count?',
    choices: [
      'How many students go with one course **and** one instructor together',
      'How many courses one student takes',
      'How many students one instructor teaches, whatever the course',
      'How many instructors one student has',
    ],
    answer: 0,
    why: 'Look across with the other ends fixed: in a ternary, the tuple at an entity counts its occurrences for one combination of the other two.' },

  { type: 'mc', topic: 'relationships', extra: true,
    q: 'A ternary STUDENT (1,N) — COURSE (1,N) — INSTRUCTOR (1,1) is M:N:1. Which combination identifies one occurrence of the relationship?',
    choices: [
      'The pair (student, course)',
      'The pair (course, instructor)',
      'The student alone',
      'Only the three together',
    ],
    answer: 0,
    why: 'The max 1 sits at INSTRUCTOR: one student and one course determine the instructor, so (student, course) is the key. All three are needed only when every end is N (M:N:P).' },

  { type: 'tf', topic: 'relationships', extra: true,
    q: 'A ternary relationship can always be replaced by three binary relationships between its entities without losing information.',
    answer: false,
    why: 'Joining the three pair relationships back can produce combinations that never happened (spurious rows). Keep the ternary unless an explicit rule allows the split.' },

  // Q12 (figure: fig-weak-entity)
  { type: 'mc', topic: 'weak',
    q: 'In the figure, `CLASS` is a **double rectangle** reached through the **double-outline diamond** `has`. What does this tell you?',
    diagram: {
      w: 560, h: 140,
      nodes: [
        { id: 'C', cx: 0.13, cy: 0.5, type: 'entity', label: 'COURSE' },
        { id: 'R', cx: 0.5, cy: 0.5, type: 'relationship', label: 'has', identifying: true },
        { id: 'W', cx: 0.87, cy: 0.5, type: 'entity', label: 'CLASS', weak: true },
      ],
      edges: [
        { from: 'C', to: 'R', card: '(1,1)' },
        { from: 'W', to: 'R', card: '(0,N)', total: true },
      ],
    },
    choices: [
      '`CLASS` is a strong entity with its own independent key',
      '`CLASS` is a weak entity: it cannot exist without `COURSE` and is identified through the `has` relationship',
      '`has` is an ordinary relationship with no special meaning',
      '`CLASS` is a multivalued attribute of `COURSE`',
    ],
    answer: 1,
    why: 'The double rectangle is a weak entity and the double diamond is its identifying relationship — together they express existence plus identification dependency.' },

  // Q13
  { type: 'mc', topic: 'weak',
    q: 'A bank\'s `MOVEMENT` has no key of its own; it is identified by its `ACCOUNT` number **plus** a movement date within that account. What is the resulting primary key?',
    choices: [
      '`Date` alone',
      '`AccountNumber` alone',
      '`AccountNumber + Date`',
      'A new surrogate `MovementId` only',
    ],
    answer: 2,
    why: 'This is identification dependency: the weak entity\'s PK = owner\'s PK (identifying FK) + its partial key.' },

  // Q14
  { type: 'mc', topic: 'cardinality',
    q: 'Using the **look-across** convention, in `TruckDriver (1,1) — Delivers — Package (0,N)`, what does the `(1,1)` at `TruckDriver` mean?',
    choices: [
      'Each driver delivers zero or more packages',
      'Each package is delivered by exactly one driver',
      'Each driver delivers exactly one package',
      'Each package is delivered by many drivers',
    ],
    answer: 1,
    why: 'The tuple at `E` says how many `E` can relate to **one occurrence of the opposite entity**; `(1,1)` at TruckDriver ⇒ each Package has exactly one TruckDriver.' },

  // Q15
  { type: 'mc', topic: 'cardinality',
    q: 'In the relationship `TruckDriver (1,1) — Delivers — Package (0,N)`, why does `Package` carry a **double line** (total participation)?',
    choices: [
      'Because its own tuple says `(0,N)`',
      'Because the tuple at the **opposite** end (`TruckDriver`) has `min = 1`',
      'Because `N` means "many"',
      'Because it is a weak entity',
    ],
    answer: 1,
    why: 'Participation is read from the opposite tuple\'s `min`: `min = 1` at TruckDriver means every Package must be delivered ⇒ double line at Package.' },

  // Q16
  { type: 'mc', topic: 'cardinality',
    q: 'Both ends of a relationship carry the tuple `(0,N)`. What is the type of correspondence?',
    choices: [
      '1:1',
      '1:N',
      'M:N',
      'Undefined',
    ],
    answer: 2,
    why: 'Each occurrence of either entity can relate to many of the other ⇒ many-to-many (the correspondence depends only on the `max` values).' },

  // Q17
  { type: 'mc', topic: 'eer',
    q: 'Abstracting the common `TEACHER` and `STUDENT` types upward to obtain a `PERSON` supertype is called:',
    choices: [
      'Specialization',
      'Generalization',
      'Categorization',
      'Aggregation',
    ],
    answer: 1,
    why: 'Generalization is the bottom-up abstraction of a supertype from several subtypes; specialization is the top-down inverse.' },

  // Q18
  { type: 'mc', topic: 'eer',
    q: 'Given the `PERSON` and `COMPANY` types, you need an `OWNER` subtype that is the **union** of the two so it can relate to `VEHICLE`. This construct is a:',
    choices: [
      'Hierarchy with `d`',
      'Category (union)',
      'Weak entity',
      'Reflection',
    ],
    answer: 1,
    why: 'A category is a subtype resulting from the union of several entity types — several supertypes, one subtype (marked `U`).' },

  // Q19 (figure: fig-hierarchy)
  { type: 'mc', topic: 'eer',
    q: 'In the figure, the hierarchy triangle carries the letter **`d`** and a discriminating attribute `type`. What does `d` mean?',
    diagram: {
      w: 420, h: 300,
      nodes: [
        { id: 'P', cx: 0.5, cy: 0.15, type: 'entity', label: 'PERSON' },
        { id: 'h', cx: 0.5, cy: 0.48, type: 'isa', label: 'd' },
        { id: 't', cx: 0.82, cy: 0.48, type: 'attribute', label: 'type' },
        { id: 'S', cx: 0.25, cy: 0.85, type: 'entity', label: 'STUDENT' },
        { id: 'T', cx: 0.75, cy: 0.85, type: 'entity', label: 'TEACHER' },
      ],
      edges: [
        { from: 'P', to: 'h' },
        { from: 'h', to: 'S' },
        { from: 'h', to: 'T' },
        { from: 'h', to: 't', dashed: true },
      ],
    },
    choices: [
      'The subtypes overlap — one occurrence may be both',
      'The subtypes are disjoint — one occurrence is at most one of them',
      'The hierarchy is a union category',
      'The subtypes are derived from the supertype',
    ],
    answer: 1,
    why: '`d` = disjoint (exclusive), `o` = overlapping, `U` = union/category. The `type` circle connected by a dotted edge is the discriminating attribute.' },

  // Q20
  { type: 'mc', topic: 'eer',
    q: 'Why is **aggregation** needed in the EER model?',
    choices: [
      'To allow a relationship between relationship types, which is otherwise not permitted',
      'To collapse an M:N relationship into two 1:N relationships',
      'To remove derived attributes',
      'To give a weak entity its partial key',
    ],
    answer: 0,
    why: 'Relationships between relationship types are not allowed, so `COMPANY` + `INTERVIEW` + `APPLICANT` are aggregated into an entity that can then relate to `JOB OFFER`.' },

  // Q21
  { type: 'tf', topic: 'weak',
    q: 'Existence dependency always implies identification dependency.',
    answer: false,
    why: 'The converse holds: identification dependency always implies existence dependency, but an entity can depend for existence yet still have its own sufficient key (existence without identification).' },

  // Q22
  { type: 'tf', topic: 'weak',
    q: 'In a relationship with M:N cardinality, weak entities are highly unusual.',
    answer: true,
    why: 'The course states weak entities in M:N relationships are highly unusual — a weak entity normally participates on the "many" side of a 1:N identifying relationship.' },

  // Q23
  { type: 'tf', topic: 'attributes',
    q: 'A derived attribute must always be stored so that queries run faster.',
    answer: false,
    why: 'Derived attributes are redundant and must be removed from the schema; keeping one is allowed only as an optional efficiency measure, not a requirement.' },

  // Q24
  { type: 'tf', topic: 'cardinality',
    q: 'Under the look-across convention, the `(min,max)` written at entity `E` states how many occurrences of `E` can be related to **one** occurrence of the other entity participating in the relationship.',
    answer: true,
    why: 'That is the definition of look-across cardinality — read across the diamond to the opposite entity.' },

  // Q25
  { type: 'fib', topic: 'weak',
    q: 'A weak entity is drawn as a ____ rectangle (nested inner outline).',
    accept: ['double', 'double-outline', 'double outline', 'double-outlined', 'double rectangle'],
    why: 'A weak entity is a double rectangle; its identifying relationship is a double-outline diamond.' },

  // Q26
  { type: 'fib', topic: 'eer',
    q: 'The discriminating attribute of a hierarchy is drawn as a ____ connected to the triangle by a dotted edge.',
    accept: ['circle', 'a circle', 'discriminant circle', 'circles'],
    why: 'The discriminant is a circle labelled with the discriminating attribute, joined to the hierarchy triangle by a dotted edge.' },

  // Q27
  { type: 'fib', topic: 'eer',
    q: 'Inside the hierarchy triangle, the letter `o` means the subtypes are ____.',
    accept: ['overlapping', 'overlap', 'overlapped'],
    why: '`o` = overlapping (one occurrence may belong to several subtypes); `d` = disjoint; `U` = union/category.' },

  // Q28
  { type: 'fib', topic: 'weak',
    q: 'The test used to decide whether an entity has an existence dependency on another is the ____ test.',
    accept: ['deletion', 'deletion test', 'delete'],
    why: 'The test question is: "Should any occurrence of entity A be deleted if an occurrence of entity B is deleted?" — if yes, the existence dependency exists.' },

  // ---- Extra questions (grounded in translated.md) ----
  { type: 'mc', topic: 'basics', extra: true,
    q: 'Which of these is **NOT** one of the rules an entity must fulfil in the course?',
    choices: [
      'It must have its own existence',
      'Each occurrence must be distinguishable from the others',
      'All occurrences must have the same types of characteristics (attributes)',
      'It must take part in at least one relationship',
    ],
    answer: 3,
    why: 'The three rules are: own existence, distinguishable occurrences, and the same types of attributes for all occurrences. Taking part in a relationship is not a rule for being an entity.' },

  { type: 'mc', topic: 'relationships', extra: true,
    q: 'An employee is **either** a permanent member of staff who belongs to a department **or** an intern assigned to an internship group — never both at once. Which kind of constraint between the two relationships is this?',
    choices: [
      'An exclusive relationship',
      'An inclusive relationship',
      'An inclusion relationship',
      'An aggregation',
    ],
    answer: 0,
    why: 'In an exclusive relationship, E1 is related either with E2 or with E3 through R1 or R2, but the two relationships cannot occur simultaneously.' },

  { type: 'tf', topic: 'relationships', extra: true,
    q: '"For a divorce to be formalized, a marriage must previously have taken place" is an example of an **inclusion** relationship.',
    answer: true,
    why: 'In an inclusion relationship, for E1 to participate in R2 it must previously have participated once in R1. (If it had to participate a certain number of times — e.g. attend at least two courses before working as a designer — it would be an inclusive relationship.)' },

  { type: 'mc', topic: 'steps', extra: true,
    q: 'According to the course, what is the **first** step when creating the extended E/R model?',
    choices: [
      'Draw the conceptual data model',
      'Identify the entities within the system',
      'Establish the relationships between the entities, describing their degree',
      'Describe every attribute in the data dictionary',
    ],
    answer: 1,
    why: 'The steps are: (1) identify the entities, (2) determine their keys, (3) establish the relationships and their degree, (4) draw the model, (5) identify and document each entity\'s attributes in the data dictionary.' },

  { type: 'mc', topic: 'steps', extra: true,
    q: 'You add a `Start_Date` attribute to an M:N relationship to capture the temporal dimension. What must you verify, according to the course?',
    choices: [
      'That the date is stored as a derived attribute',
      'That the result does not violate the unique-access principle for the occurrences of that relationship once it is transformed into the logical model',
      'That the relationship becomes ternary',
      'That both entities become weak entities',
    ],
    answer: 1,
    why: 'Adding dates to many-to-many relationships may allow the same pair to repeat over time; you must check that each occurrence of the relationship can still be accessed uniquely after the transformation to the logical model.' },
];
