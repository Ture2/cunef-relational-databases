'use strict';
/* ER → logical transformation rules: one card per rule, with a small worked example.
   `model` has the shape of an exercise (data/<lang>/logical.js): js/logical-section.js draws it with
   ErDiagram.modelSvg and derives the resulting tables with LogicalEngine.variants, so the example
   always agrees with the checker. When a model has several accepted results (side of a 1:1 FK,
   hierarchy strategy) the card lets the reader switch between them.
   `exercise` names the Level 1 exercise that practises the rule. The examples use other domains
   than the exercises, so reading a card never gives an exercise away.
   Cardinalities are look-across: the card at entity E = how many E per one occurrence of the other side. */
DATA.en.LOGICAL_RULES = [
  /* ───────────── Entities and attributes ───────────── */
  {
    id: 'entity',
    hub: 'basics',
    title: 'Entity → table, identifier → primary key',
    summary: 'Every entity type becomes a **table** with the same name, and its identifier becomes the table\'s **primary key**.',
    body: [
      'Each occurrence of the entity becomes one row of the table. Each simple attribute becomes one column (rule 2).',
      'The key attribute of the entity (underlined in the diagram) becomes the primary key (rule 3). It must be unique and never NULL. If the identifier has several attributes, the primary key is all of them together.',
    ],
    points: [
      'Rule 1: **entity → table**, named after the entity.',
      'Rule 2: **attribute → column** of that table.',
      'Rule 3: **identifier → primary key**.',
    ],
    example: 'The entity `Book` with ISBN, title and year becomes `Book(ISBN, title, year)`. One row per book, and the ISBN identifies it.',
    mistake: 'Adding an artificial id column when the entity already has an identifier. If the model says the ISBN identifies a book, the ISBN is the primary key.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Book', at: [0, 0], attrs: [{ name: 'ISBN', kind: 'key' }, { name: 'title' }, { name: 'year' }] },
      ],
      relationships: [],
    },
  },
  {
    id: 'attributes',
    hub: 'basics',
    title: 'Composite and derived attributes',
    summary: 'A **composite** attribute is split into one column per part. A **derived** attribute is left out, because it can be computed.',
    body: [
      'A relational column holds a single atomic value, so a composite attribute such as an address cannot be stored as one column. Its parts (street, city, postal code) become separate columns of the same table.',
      'A derived attribute (shown with a slash, such as /age) is computed from other data, for example the age from the birth date. Storing it would duplicate information that can go out of date, so it gets no column. A query or a view computes it when needed.',
    ],
    points: [
      '**Composite** → its parts become columns; the composite name itself disappears.',
      '**Derived** → no column; compute it in queries.',
    ],
    example: '`Customer(customer id, name, birth date, address(street, city, postal code), /age)` becomes `Customer(customer id, name, birth date, street, city, postal code)`.',
    mistake: 'Keeping an `age` column next to `birth date`. After a year the stored age is wrong, while the birth date is still right.',
    exercise: 'person-attributes',
    model: {
      entities: [
        { id: 'Customer', at: [0, 0], attrs: [
          { name: 'customer id', kind: 'key' }, { name: 'name' }, { name: 'birth date' },
          { name: 'address', kind: 'composite', parts: ['street', 'city', 'postal code'] },
          { name: 'age', kind: 'derived' },
        ] },
      ],
      relationships: [],
    },
  },
  {
    id: 'multivalued',
    hub: 'basics',
    title: 'Multivalued attribute → its own table',
    summary: 'A **multivalued** attribute becomes a new table. Its primary key is the owner\'s key plus the value.',
    body: [
      'A cell holds one value only, so a list of values (several e-mails, several phones) cannot go in the owner\'s table. Each value becomes one row of a new table, which repeats the owner\'s key as a foreign key.',
      'The pair (owner key, value) identifies each row. The same e-mail appears only once per customer, but two customers can share one.',
    ],
    points: [
      'New table, usually named owner + attribute (`CustomerEmail`).',
      'Columns: the owner\'s key (**PK and FK**) + the value (**PK**).',
      'The owner\'s table keeps its other attributes and loses the multivalued one.',
    ],
    example: '`Customer(customer id, name, {email})` becomes `Customer(customer id, name)` and `CustomerEmail(customer id → Customer, email)`.',
    mistake: 'Adding the columns email1, email2, email3. That sets an arbitrary limit, leaves NULLs and makes searching for an e-mail look in three places.',
    exercise: 'person-attributes',
    model: {
      entities: [
        { id: 'Customer', at: [0, 0], attrs: [{ name: 'customer id', kind: 'key' }, { name: 'name' }, { name: 'email', kind: 'multivalued' }] },
      ],
      relationships: [],
    },
  },

  /* ───────────── Binary relationships ───────────── */
  {
    id: 'one-to-many',
    hub: 'binary',
    title: '1:N relationship → foreign key on the N side',
    summary: 'A one-to-many relationship gets **no table of its own**. The key of the "one" side travels to the "many" side as a **foreign key**.',
    body: [
      'Every row on the N side relates to at most one row on the 1 side, so a single column on the N side can store that link. Each employee works in one department, so `Employee` gets a `department id` column that references `Department`.',
      'The other direction would not work: a department has many employees, and one column in `Department` cannot hold a list.',
      'Attributes of a 1:N relationship also go to the N side, next to the foreign key.',
    ],
    points: [
      'Rule 5: **1:N → FK on the N side**, referencing the 1 side.',
      'The FK is **NOT NULL** when the minimum at the 1 side is 1 (see "Participation").',
    ],
    example: 'Department (1,1) — WorksIn — (0,N) Employee becomes `Employee(employee id, name, department id → Department)`.',
    mistake: 'Putting the foreign key on the "one" side, such as an employee id in `Department`. It can only hold one employee per department.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Department', at: [0, 0], attrs: [{ name: 'department id', kind: 'key' }, { name: 'name' }] },
        { id: 'Employee', at: [2, 0], attrs: [{ name: 'employee id', kind: 'key' }, { name: 'name' }] },
      ],
      relationships: [
        { id: 'WorksIn', ends: [{ entity: 'Department', card: '(1,1)' }, { entity: 'Employee', card: '(0,N)' }] },
      ],
    },
  },
  {
    id: 'many-to-many',
    hub: 'binary',
    title: 'M:N relationship → its own table',
    summary: 'A many-to-many relationship becomes a **new table**. Its primary key combines the keys of both entities, and each of them is also a foreign key.',
    body: [
      'Neither side can hold the link in one column: a student takes many courses and a course has many students. The new table, often called a junction or bridge table, has one row for each related pair.',
      'Attributes of the relationship, such as the grade a student gets in a course, describe the pair. They go in this new table.',
    ],
    points: [
      'Rule 4: **M:N → table** named after the relationship.',
      'PK = **both foreign keys together**.',
      'The relationship\'s attributes become columns of this table.',
    ],
    example: 'Student (0,N) — Enrols(grade) — (1,N) Course becomes `Enrols(student id → Student, course id → Course, grade)`.',
    mistake: 'Making only one of the two foreign keys the primary key. Then a student could appear in a single course only.',
    exercise: 'toys-parts',
    model: {
      entities: [
        { id: 'Student', at: [0, 0], attrs: [{ name: 'student id', kind: 'key' }, { name: 'name' }] },
        { id: 'Course', at: [2, 0], attrs: [{ name: 'course id', kind: 'key' }, { name: 'title' }] },
      ],
      relationships: [
        { id: 'Enrols', ends: [{ entity: 'Student', card: '(0,N)' }, { entity: 'Course', card: '(1,N)' }], attrs: [{ name: 'grade' }] },
      ],
    },
  },
  {
    id: 'one-to-one',
    hub: 'binary',
    title: '1:1 relationship → the key passes to one side',
    summary: 'In a one-to-one relationship the key of **either** side can pass to the other. With (0,1)/(1,1), the course rule passes it to the **optional** side.',
    body: [
      'Both directions are possible, because each row relates to at most one row on the other side.',
      'The **optional side** is the entity whose participation is partial: the minimum at the opposite end is 0. Here a person may have no passport (the card at Passport is (0,1)), so `Person` is the optional side and receives `passport no` as a foreign key. That FK is NULL for people without a passport.',
      'The other direction, a NOT NULL `person id` in `Passport`, is also a correct design, and the checker accepts it. Whichever side holds it, mark the foreign key as unique: that is what keeps the relationship 1:1 instead of 1:N.',
    ],
    points: [
      'Rule 6: **1:1 → the key of either side passes to the other**.',
      'Rule 7: with (0,1)/(1,1), **the key passes to the optional side** (the one with min 0 at the opposite end).',
      'Use the switch below to see both accepted designs.',
    ],
    example: 'Person (1,1) — Holds — (0,1) Passport becomes `Person(person id, name, passport no → Passport)`, with the FK allowed to be NULL.',
    mistake: 'Merging both entities into one table. It is sometimes acceptable, but it is not the course rule, and it leaves empty columns for every person without a passport.',
    exercise: 'warehouse-location',
    model: {
      entities: [
        { id: 'Person', at: [0, 0], attrs: [{ name: 'person id', kind: 'key' }, { name: 'name' }] },
        { id: 'Passport', at: [2, 0], attrs: [{ name: 'passport no', kind: 'key' }, { name: 'expiry' }] },
      ],
      relationships: [
        { id: 'Holds', ends: [{ entity: 'Person', card: '(1,1)' }, { entity: 'Passport', card: '(0,1)' }] },
      ],
    },
  },
  {
    id: 'participation',
    hub: 'binary',
    title: 'Participation → NOT NULL on the foreign key',
    summary: 'The **minimum** cardinality decides whether a foreign key can be NULL. Read it **across** the relationship, at the end the FK points to.',
    body: [
      'With look-across cardinalities, the card written at entity E says how many E are related to one occurrence of the other entity. The card at `Customer` says how many customers an order has.',
      'If that minimum is **1**, every order must have a customer, so the FK `customer id` in `Order` is **NOT NULL**. If it is **0**, an order can exist without one, and the FK accepts NULL. In this example an order can wait without a courier, so `courier id` can be NULL.',
    ],
    points: [
      'Min **1** at the referenced side → FK **NOT NULL**.',
      'Min **0** at the referenced side → FK **can be NULL** (shown with ? in the notation).',
      'Primary-key columns are always NOT NULL.',
    ],
    example: 'Customer (1,1) — Places — (0,N) Order and Courier (0,1) — Delivers — (0,N) Order become `Order(order id, date, customer id → Customer NOT NULL, courier id → Courier NULL)`.',
    mistake: 'Reading the cardinality on the wrong side. The card next to `Order` says how many orders a customer has. It decides nothing about the FK in `Order`.',
    exercise: 'teams-players',
    model: {
      entities: [
        { id: 'Customer', at: [0, 0], attrs: [{ name: 'customer id', kind: 'key' }, { name: 'name' }] },
        { id: 'Order', at: [2, 0], attrs: [{ name: 'order id', kind: 'key' }, { name: 'date' }] },
        { id: 'Courier', at: [4, 0], attrs: [{ name: 'courier id', kind: 'key' }, { name: 'name' }] },
      ],
      relationships: [
        { id: 'Places', ends: [{ entity: 'Customer', card: '(1,1)' }, { entity: 'Order', card: '(0,N)' }] },
        { id: 'Delivers', ends: [{ entity: 'Courier', card: '(0,1)' }, { entity: 'Order', card: '(0,N)' }] },
      ],
    },
  },

  /* ───────────── Special cases ───────────── */
  {
    id: 'weak',
    hub: 'special',
    title: 'Weak entity → owner\'s key + partial key',
    summary: 'A **weak** entity cannot be identified on its own. Its primary key is the **owner\'s key** (also a foreign key) plus its **partial key**.',
    body: [
      'Room number 101 exists in many buildings, so the number alone is not enough. It identifies a room only together with its building. The partial key is shown with a dashed underline, and the identifying relationship with a double diamond.',
      'The table of the weak entity takes the owner\'s key as a foreign key and makes it part of the primary key. The identifying relationship gets no table of its own.',
    ],
    points: [
      'PK = **owner key (FK)** + **partial key**.',
      'The FK is always NOT NULL, because it is part of the PK.',
      'Deleting the owner usually deletes its weak rows (ON DELETE CASCADE).',
    ],
    example: 'Building (1,1) ═ Contains ═ (1,N) Room(number, floor) becomes `Room(building id → Building, number, floor)`.',
    mistake: 'Using the partial key alone as the primary key. Two buildings with a room 101 would then collide.',
    exercise: 'course-classes',
    model: {
      entities: [
        { id: 'Building', at: [0, 0], attrs: [{ name: 'building id', kind: 'key' }, { name: 'address' }] },
        { id: 'Room', at: [2, 0], weak: true, attrs: [{ name: 'number', kind: 'partial' }, { name: 'floor' }] },
      ],
      relationships: [
        { id: 'Contains', identifying: true, ends: [{ entity: 'Building', card: '(1,1)' }, { entity: 'Room', card: '(1,N)' }] },
      ],
    },
  },
  {
    id: 'unary',
    hub: 'special',
    title: 'Unary (recursive) relationship',
    summary: 'When an entity relates to **itself**, apply the usual 1:N or M:N rule. The foreign keys point to the **same table** and are named after the **roles**.',
    body: [
      '**1:N** (each person has at most one mentor): add a FK column to the same table, named after the role (`mentor`), referencing the table\'s own key. It is usually optional, because someone has no mentor.',
      '**M:N** (a course has many prerequisites and is a prerequisite of many): create a new table with **two** FKs to the entity, one per role. Both of them together form the PK.',
      'The role names are needed because both columns would otherwise have the same name.',
    ],
    points: [
      'Unary 1:N → **a FK to the same table**, named after the role.',
      'Unary M:N → **a table with two FKs** to the entity, one per role.',
    ],
    example: 'Course (0,N) as prerequisite — Requires — (0,N) as course becomes `Requires(prerequisite → Course, course → Course)`.',
    mistake: 'Creating a second table for the same entity, such as `Mentor` next to `Person`. A mentor is a person, so the role is a column, not a table.',
    exercise: 'employee-manager',
    model: {
      entities: [
        { id: 'Course', at: [0, 0], attrs: [{ name: 'code', kind: 'key' }, { name: 'title' }] },
      ],
      relationships: [
        { id: 'Requires', at: [1, 1], ends: [{ entity: 'Course', card: '(0,N)', role: 'prerequisite' }, { entity: 'Course', card: '(0,N)', role: 'course' }] },
      ],
    },
  },
  {
    id: 'ternary',
    hub: 'special',
    title: 'Ternary relationship → a table with three FKs',
    summary: 'A relationship among **three** entities always becomes its own table, with a foreign key to each of them.',
    body: [
      'No entity can absorb a ternary relationship: each fact links a doctor, a patient and a treatment at once. The new table has one row per combination, plus the relationship\'s attributes.',
      'When every end is "many", the PK is the three FKs together. When an end has max 1, that FK can be left out of the PK, because the other two already determine it. The checker accepts both choices.',
    ],
    points: [
      'Ternary → **table** with **one FK per entity**.',
      'PK: the FKs of the "many" ends (all three if every end is N).',
    ],
    example: 'Doctor, Patient, Treatment — Prescribes(date) becomes `Prescribes(doctor id → Doctor, patient id → Patient, treatment id → Treatment, date)`.',
    mistake: 'Splitting the ternary into three binary relationships. You lose which doctor prescribed which treatment to which patient.',
    exercise: 'supplier-part-project',
    model: {
      entities: [
        { id: 'Doctor', at: [0, 0], attrs: [{ name: 'doctor id', kind: 'key' }, { name: 'name' }] },
        { id: 'Treatment', at: [4, 0], attrs: [{ name: 'treatment id', kind: 'key' }, { name: 'name' }] },
        { id: 'Patient', at: [2, 2], attrs: [{ name: 'patient id', kind: 'key' }, { name: 'name' }] },
      ],
      relationships: [
        { id: 'Prescribes', at: [2, 1], ends: [{ entity: 'Doctor', card: '(0,N)' }, { entity: 'Treatment', card: '(0,N)' }, { entity: 'Patient', card: '(0,N)' }], attrs: [{ name: 'date' }] },
      ],
    },
  },

  /* ───────────── Hierarchies ───────────── */
  {
    id: 'hierarchy',
    hub: 'hierarchy',
    title: 'Hierarchy: the three strategies',
    summary: 'A generalization (supertype and subtypes) can be turned into tables in **three** ways. Use the switch below to see the tables each one produces.',
    body: [
      '**Supertype + subtypes** (the course default): one table for the supertype and one per subtype. Each subtype table reuses the supertype\'s PK, which is also a FK to it. It works for any hierarchy.',
      '**Single table**: one table for the whole hierarchy, holding every attribute, plus a **discriminator** column that says which subtype each row is. The subtype columns are NULL in the other rows.',
      '**Subtypes only**: no supertype table. Each subtype table repeats the supertype\'s attributes. It is only possible when the hierarchy is **total** (every occurrence belongs to a subtype) and nothing else references the supertype.',
    ],
    points: [
      'Supertype + subtypes: no NULLs; reading a full row needs a join.',
      'Single table: no joins; NULLs in the subtype columns.',
      'Subtypes only: no joins and no NULLs, but the supertype cannot be referenced as a whole.',
    ],
    example: 'Account(number, opened) is either a Savings(rate) or a Checking(overdraft) account, so the hierarchy is total and disjoint.',
    mistake: 'Choosing "subtypes only" for a partial hierarchy. Accounts that are neither savings nor checking would have nowhere to go.',
    exercise: 'vehicle-hierarchy',
    model: {
      entities: [
        { id: 'Account', at: [2, 0], attrs: [{ name: 'number', kind: 'key' }, { name: 'opened' }] },
        { id: 'Savings', at: [0, 2], attrs: [{ name: 'rate' }] },
        { id: 'Checking', at: [4, 2], attrs: [{ name: 'overdraft' }] },
      ],
      relationships: [],
      hierarchies: [
        { id: 'AccountKinds', super: 'Account', subs: ['Savings', 'Checking'], disjoint: true, total: true, discriminator: 'kind', at: [2, 1] },
      ],
    },
  },
  {
    id: 'hierarchy-choice',
    hub: 'hierarchy',
    title: 'Choosing a hierarchy strategy',
    summary: 'All three strategies are correct. Pick one by how the data is **used**: shared relationships, how many subtype attributes there are, and whether the hierarchy is total.',
    body: [
      'If other entities relate to the **supertype** (every account has an owner), keep a supertype table so the foreign key has something to reference. Use "supertype + subtypes" or "single table".',
      'If the subtypes have **few attributes of their own** and are usually queried together, a single table is simple and fast.',
      'If the subtypes have **many attributes and relationships of their own**, separate tables avoid long rows full of NULLs.',
    ],
    table: {
      caption: 'Trade-offs of the three strategies',
      head: ['Strategy', 'NULLs', 'Joins to read a row', 'Needs a total hierarchy'],
      rows: [
        ['Supertype + subtypes', 'No', 'Yes (supertype ⋈ subtype)', 'No'],
        ['Single table', 'Yes, in the subtype columns', 'No', 'No'],
        ['Subtypes only', 'No', 'No (but a UNION to list them all)', 'Yes'],
      ],
    },
    mistake: 'Leaving out the discriminator in the single-table strategy. Without it a row with every subtype column NULL cannot be classified.',
    exercise: 'vehicle-hierarchy',
  },
];
