'use strict';
/* Query for a Million (#/game): the onboarding tour, js/game-intro.js (contract: docs/game-quiz.md §9).
   Every string the tour shows, button labels included, so it needs no t() keys. The title and tagline come
   from GAME_TEXT, and the lifeline names from GAME_TEXT.lifelines (options.items with a `life` key).
   {low}, {top}, {prize}, {from}, {to}, {n} and {total} are filled in at runtime (prizes in the page's format).
   md fields use only **bold** and `code`. example.sql is the same Oracle statement in data/es/game-tour.js.
   Checked by tools/check-game-tour.mjs (same shape in both languages, word limits, the example runs). */
(() => {
  DATA.en.GAME_TOUR = {
    attract: {
      kicker: 'A quiz game you answer with SQL',
      start: 'Start the briefing',
      skip: 'Skip to the game',
      note: 'The briefing takes about two minutes. The **How to play** button opens it again.',
      ladder: 'A prize ladder of 15 rungs, from {low} to {top}.',
    },
    nav: {
      back: 'Back',
      next: 'Next',
      play: 'Play',
      skip: 'Skip',
      skipLabel: 'Skip the briefing and play',
      step: '{n} of {total}',
      progress: 'Briefing progress',
      replay: 'Replay',
    },
    buttons: {
      run: 'Run',
      lock: 'Lock in',
    },
    game: {
      title: 'The game',
      lead: 'SQL-Bot asks you 15 questions about the database of a video-game shop. Each right answer takes you one rung up the prize ladder.',
      rungs: 'Rungs {from} to {to}',
      bands: {
        easy: '`SELECT`, `WHERE`, `ORDER BY`',
        medium: '`COUNT`, `GROUP BY`, `HAVING`',
        hard: '`JOIN` and subqueries',
      },
      facts: [
        { head: 'The prize', text: 'From {low} on rung 1 to {top} on rung 15.' },
        { head: 'Safe rungs', text: 'Rungs **5** and **10**. Once you pass one, its prize is yours whatever happens.' },
        { head: 'A wrong answer', text: 'The game ends, and you leave with the prize of your last safe rung.' },
        { head: 'Walk away', text: 'From rung 2 on, stop whenever you like and take the prize of your last right answer.' },
      ],
    },
    modes: {
      title: 'Six ways to play',
      lead: 'Choose a mode on the first screen. Each one is its own 15-rung game, with its own best prize.',
      kinds: {
        select: 'Answer with a `SELECT`: show the rows the question asks for.',
        insert: 'Add rows with `INSERT`. **Run** shows the new rows in green.',
        update: 'Change rows with `UPDATE`. Changed cells are marked.',
        delete: 'Remove rows with `DELETE`. **Run** strikes out what goes.',
        ddl: 'Build with `CREATE` and `ALTER`: tables, columns, views and indexes.',
        mixed: 'Every rung asks for a different kind of statement.',
      },
      unlock: '**Mixed** unlocks when you reach rung 5 in all five modes. **Modes** takes you back to the first screen; your run waits for you.',
    },
    comp: {
      title: 'Study or competitive',
      lead: '**Study** is for practice: as many runs as you like, with the solutions at the end. **Competitive** gives a badge per mode, recorded by the server.',
      items: [
        'Sign in with your @cunef.edu email: we send you a 6-digit code. Your name goes on your badges.',
        'Three attempts a day per mode, one hour each, with questions the server draws for you.',
        'Paste is off in the editor, and no solutions are shown at the end.',
        'Reach the million and the server records your badge. Five badges add 0.5 to the lab grade, after a short oral check.',
      ],
    },
    loop: {
      title: 'How you play',
      lead: 'Every question takes three steps, and you answer with a real Oracle `SELECT`.',
      steps: [
        { name: 'Read', text: 'The question says which columns to show and, when it matters, in which order.' },
        { name: 'Query', code: 'SELECT', text: 'Write your query and press **Run**, or Ctrl+Enter. Running is free: try as often as you like.' },
        { name: 'Lock in', text: 'When the result looks right, press **Lock in**. Only this answer counts.' },
      ],
      note: 'SQL-Bot compares your rows with the right ones: the same values, and the same order when the question asks for one. Column names do not matter.',
    },
    screen: {
      title: 'The screen and controls',
      spots: [
        { id: 'ladder', title: 'Prize ladder', text: 'Fifteen rungs, the top prize first. Your rung is yellow; the boxed rungs 5 and 10 are safe.' },
        { id: 'question', title: 'The question', text: 'The rung, its prize and what SQL-Bot wants: which columns to show and, if it matters, the order.' },
        { id: 'lifelines', title: 'Lifelines', text: 'Three helps for when you are stuck, once each per game. Point at one to see what it does.' },
        { id: 'console', title: 'SQL console', text: 'Write your query and press **Run**, or Ctrl+Enter, as often as you like. The chips start a query for you.' },
        { id: 'lock', title: 'Lock in', text: 'Your answer, and it counts. SQL-Bot asks you to confirm, then checks your rows.' },
        { id: 'schema', title: 'The database', text: 'The three tables and their columns. Click a name to type it into your query.' },
      ],
    },
    options: {
      title: 'Lifelines and walking away',
      lead: 'Three lifelines, each one once per game. Save them for the hard questions.',
      items: [
        { life: 'clause', text: 'Names the clause your query needs and the shape of the result.' },
        { life: 'template', text: 'Shows a query with the same structure on other data. Insert it and adapt it.' },
        { life: 'review', text: 'Tells you what is wrong with your last run, without giving the answer away. Still unused after a wrong lock-in? It gives you a second try.' },
        { name: 'Walk away', text: 'From rung 2, stop and keep the prize of your last right answer. Wise before a question you cannot answer.' },
      ],
      note: '**How to play** opens this briefing again. **EN** and **ES** switch the language.',
    },
    example: {
      title: 'A little example',
      lead: 'Rung 1 for {prize}, from the question to the prize.',
      question: 'Which games cost more than 50 euros? Show `title` and `price`.',
      read: '**1 Read.** Two columns, from the `games` table.',
      query: '**2 Query.** Write the `SELECT`, press **Run** and check the rows.',
      lock: '**3 Lock in.** The rows look right, so lock it in.',
      done: 'Right answer: rung 1 is yours. Now it is your turn.',
      fallback: 'Your rows appear here.',
      more: 'and {n} more rows',
      ladder: 'Example prize ladder: rung 1 lights up when the answer is right.',
      sql: 'SELECT title, price FROM games WHERE price > 50;',
    },
  };
})();
