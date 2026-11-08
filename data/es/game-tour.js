'use strict';
/* Una consulta por un millón (#/game): la presentación del juego, js/game-intro.js (contrato:
   docs/game-quiz.md §9). Misma forma que data/en/game-tour.js. El título y el lema salen de GAME_TEXT, y los
   nombres de los comodines de GAME_TEXT.lifelines. {low}, {top}, {prize}, {from}, {to}, {n} y {total} se
   rellenan al mostrarlos. Los nombres de tablas y columnas y el SQL quedan en inglés: son el esquema real.
   example.sql es la misma sentencia que en inglés. Lo comprueba tools/check-game-tour.mjs. */
(() => {
  DATA.es.GAME_TOUR = {
    attract: {
      kicker: 'Un concurso que se responde con SQL',
      start: 'Ver las instrucciones',
      skip: 'Ir al juego',
      note: 'Las instrucciones duran unos dos minutos. El botón **Cómo se juega** las vuelve a abrir.',
      ladder: 'Una escalera de premios de 15 peldaños, de {low} a {top}.',
    },
    nav: {
      back: 'Atrás',
      next: 'Siguiente',
      play: 'Jugar',
      skip: 'Saltar',
      skipLabel: 'Saltar las instrucciones y jugar',
      step: '{n} de {total}',
      progress: 'Progreso de las instrucciones',
      replay: 'Repetir',
    },
    buttons: {
      run: 'Ejecutar',
      lock: 'Fijar respuesta',
    },
    game: {
      title: 'El juego',
      lead: 'SQL-Bot te hace 15 preguntas sobre la base de datos de una tienda de videojuegos. Cada acierto te sube un peldaño en la escalera de premios.',
      rungs: 'Peldaños {from} a {to}',
      bands: {
        easy: '`SELECT`, `WHERE`, `ORDER BY`',
        medium: '`COUNT`, `GROUP BY`, `HAVING`',
        hard: '`JOIN` y subconsultas',
      },
      facts: [
        { head: 'El premio', text: 'De {low} en el peldaño 1 a {top} en el 15.' },
        { head: 'Peldaños seguros', text: 'Los peldaños **5** y **10**. Cuando superas uno, su premio es tuyo pase lo que pase.' },
        { head: 'Si fallas', text: 'La partida termina y te llevas el premio de tu último peldaño seguro.' },
        { head: 'Plantarte', text: 'Desde el peldaño 2, para cuando quieras y llévate el premio de tu último acierto.' },
      ],
    },
    modes: {
      title: 'Seis formas de jugar',
      lead: 'Elige un modo en la primera pantalla. Cada uno es su propia partida de 15 peldaños, con su propio récord.',
      kinds: {
        select: 'Responde con un `SELECT`: muestra las filas que pide la pregunta.',
        insert: 'Añade filas con `INSERT`. **Ejecutar** muestra las filas nuevas en verde.',
        update: 'Cambia filas con `UPDATE`. Las celdas cambiadas quedan marcadas.',
        delete: 'Quita filas con `DELETE`. **Ejecutar** tacha lo que se va.',
        ddl: 'Construye con `CREATE` y `ALTER`: tablas, columnas, vistas e índices.',
        mixed: 'Cada peldaño pide un tipo de sentencia distinto.',
      },
      unlock: '**Mixto** se desbloquea al llegar al peldaño 5 en los cinco modos. **Modos** te lleva a la primera pantalla; tu partida te espera.',
    },
    comp: {
      title: 'Estudio o competición',
      lead: '**Estudio** es para practicar: tantas partidas como quieras, con las soluciones al final. **Competición** da una insignia por modo, registrada por el servidor.',
      items: [
        'Entra con tu correo @cunef.edu: te enviamos un código de 6 cifras. Tu nombre aparece en tus insignias.',
        'Tres intentos al día por modo, de una hora cada uno, con preguntas que el servidor sortea para ti.',
        'En el editor no se puede pegar, y al final no se muestran soluciones.',
        'Llega al millón y el servidor registra tu insignia. Cinco insignias suman 0,5 a la nota de prácticas, tras una breve comprobación oral.',
      ],
    },
    loop: {
      title: 'Cómo juegas',
      lead: 'Cada pregunta tiene tres pasos, y respondes con un `SELECT` de Oracle de verdad.',
      steps: [
        { name: 'Leer', text: 'La pregunta dice qué columnas mostrar y, cuando importa, en qué orden.' },
        { name: 'Consultar', code: 'SELECT', text: 'Escribe tu consulta y pulsa **Ejecutar**, o Ctrl+Intro. Ejecutar es gratis: prueba tantas veces como quieras.' },
        { name: 'Fijar respuesta', text: 'Cuando el resultado te parezca bueno, pulsa **Fijar respuesta**. Solo cuenta esta respuesta.' },
      ],
      note: 'SQL-Bot compara tus filas con las correctas: los mismos valores, y el mismo orden si la pregunta lo pide. Los nombres de las columnas no importan.',
    },
    screen: {
      title: 'La pantalla y los controles',
      spots: [
        { id: 'ladder', title: 'Escalera de premios', text: 'Quince peldaños, con el premio mayor arriba. Tu peldaño es el amarillo; los recuadrados, 5 y 10, son seguros.' },
        { id: 'question', title: 'La pregunta', text: 'El peldaño, su premio y lo que pide SQL-Bot: qué columnas mostrar y, si importa, el orden.' },
        { id: 'lifelines', title: 'Comodines', text: 'Tres ayudas para cuando te atascas, una vez cada una por partida. Señala una para ver qué hace.' },
        { id: 'console', title: 'Consola SQL', text: 'Escribe tu consulta y pulsa **Ejecutar**, o Ctrl+Intro, tantas veces como quieras. Los botones te dan una consulta para empezar.' },
        { id: 'lock', title: 'Fijar respuesta', text: 'Tu respuesta, y cuenta. SQL-Bot te pide que confirmes y después comprueba tus filas.' },
        { id: 'schema', title: 'La base de datos', text: 'Las tres tablas y sus columnas. Pulsa un nombre para escribirlo en tu consulta.' },
      ],
    },
    options: {
      title: 'Comodines y plantarte',
      lead: 'Tres comodines, cada uno una vez por partida. Guárdalos para las preguntas difíciles.',
      items: [
        { life: 'clause', text: 'Te dice qué cláusula necesita tu consulta y la forma del resultado.' },
        { life: 'template', text: 'Muestra una consulta con la misma estructura sobre otros datos. Insértala y adáptala.' },
        { life: 'review', text: 'Te dice qué falla en tu última ejecución, sin darte la respuesta. Si aún no la has usado cuando fallas al fijar, te da otra oportunidad.' },
        { name: 'Plantarse', text: 'Desde el peldaño 2, para y quédate con el premio de tu último acierto. Sensato ante una pregunta que no sabes responder.' },
      ],
      note: '**Cómo se juega** abre de nuevo estas instrucciones. **EN** y **ES** cambian el idioma.',
    },
    example: {
      title: 'Un pequeño ejemplo',
      lead: 'El peldaño 1 por {prize}, de la pregunta al premio.',
      question: '¿Qué juegos cuestan más de 50 euros? Muestra `title` y `price`.',
      read: '**1 Leer.** Dos columnas de la tabla `games`.',
      query: '**2 Consultar.** Escribe el `SELECT`, pulsa **Ejecutar** y mira las filas.',
      lock: '**3 Fijar respuesta.** Las filas cuadran: esa es tu respuesta.',
      done: 'Respuesta correcta: el peldaño 1 es tuyo. Ahora te toca a ti.',
      fallback: 'Aquí aparecen tus filas.',
      more: 'y {n} filas más',
      ladder: 'Escalera de premios de ejemplo: el peldaño 1 se ilumina cuando la respuesta es correcta.',
      sql: 'SELECT title, price FROM games WHERE price > 50;',
    },
  };
})();
