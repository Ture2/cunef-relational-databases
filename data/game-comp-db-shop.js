'use strict';
/* Query for a Million, competitive side: the databases an attempt can draw (docs/game-quiz.md §16).
   Each file data/game-comp-db-<key>.js adds one entry to the global GAME_COMP_DBS (browser) and exports it (Node):
     { key, name: { en, es }, setup (Oracle CREATE + INSERT, public: Run works on it locally), schema: { table: [cols] },
       types: { table: [Oracle types] }, join: a two-table join for the console's "Join two tables" snippet }
   The questions of each database stay private (tools/comp/private/, on the server). The hidden dataset the server also
   grades with is derived from `setup` by tools/comp-hidden.mjs.
   This one is the study mode's video-game shop (data/game-bank.js), the first competitive database. */
// eslint-disable-next-line no-var, no-use-before-define
var GAME_COMP_DBS = typeof GAME_COMP_DBS !== 'undefined' ? GAME_COMP_DBS : {};
(() => {
  // eslint-disable-next-line no-undef
  const bank = typeof GAME_BANK !== 'undefined' ? GAME_BANK : require('./game-bank.js');
  GAME_COMP_DBS.shop = {
    key: 'shop',
    name: { en: 'Video-game shop', es: 'Tienda de videojuegos' },
    setup: bank.setup,
    schema: bank.schema,
    types: bank.types,
    join: 'SELECT <columns>\nFROM sales s\nJOIN games g ON g.game_id = s.game_id;',
  };
})();
if (typeof module !== 'undefined') module.exports = GAME_COMP_DBS.shop;
