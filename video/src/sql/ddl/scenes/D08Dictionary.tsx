import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog, window01} from '../../../anim';
import {DataTable, type Column} from '../../../components/DataTable';
import {Caption, Chip, Heading, SceneShell} from '../../../components/Shell';
import {TONES} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const TABLES_SQL = 'SELECT table_name FROM user_tables;';
const COLUMNS_SQL = `SELECT column_name, data_type
FROM user_tab_columns
WHERE table_name = 'MEMBER'
ORDER BY column_id;`;
const DROP_SQL = 'DROP TABLE member;';

const TABLES_COLS: Column[] = [{key: 'table_name', label: 'TABLE_NAME', width: 300, tone: 'teal'}];
const TABLES = [['TEAM'], ['PLAYER'], ['MEMBER']];
const MEMBER = 2;
const COLUMNS_COLS: Column[] = [
  {key: 'column_name', label: 'COLUMN_NAME', width: 290, tone: 'teal'},
  {key: 'data_type', label: 'DATA_TYPE', width: 230, tone: 'teal'},
];
const COLUMNS = [
  ['MEMBER_ID', 'NUMBER'],
  ['MEMBER_NAME', 'VARCHAR2'],
  ['EMAIL', 'VARCHAR2'],
];
const LEFT = 100;
const RIGHT = 960;

// 0.8 every DDL is recorded in the data dictionary · 4.6 query it like any table · 8.9 USER_TABLES
// · 11.2 USER_TAB_COLUMNS: member_name, no fee (13.9) · 17.6 DROP TABLE removes it · 21.4 another video
const DictionaryInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const dropped = prog(f, 19, 19.8);
  return (
    <SceneShell style={style}>
      <Narration scene="dictionary" />
      <Heading name="Heading" premountFor={fps}>
        The data dictionary
      </Heading>
      <Caption name="Recorded" top={480} opacity={window01(f, 1, 4.8)} size={52}>
        Every <b>DDL</b> statement is recorded in the <b>data dictionary</b>
      </Caption>

      <SqlCode name="Tables query" code={TABLES_SQL} x={LEFT} y={220} width={760} size={28} opacity={prog(f, 4.8, 5.4)} line={() => ({highlight: window01(f, 8.9, 11)})} />
      <DataTable
        name="Tables"
        title="Result"
        x={LEFT}
        y={420}
        columns={TABLES_COLS}
        rows={TABLES}
        style={{opacity: prog(f, 5.4, 6)}}
        rowOpacity={(r) => prog(f, 5.6 + r * 0.3, 6.1 + r * 0.3)}
        cell={(r) => (r === MEMBER && f >= 17.6 * fps ? {bg: TONES.orange.soft, outline: prog(f, 18, 18.6), strike: dropped, opacity: 1 - 0.7 * prog(f, 20, 20.6)} : undefined)}
      />
      <SqlCode name="Drop" code={DROP_SQL} x={LEFT} y={730} width={760} size={28} opacity={prog(f, 17.6, 18.2)} line={() => ({highlight: window01(f, 17.6, 21)})} />
      <Chip tone="neutral" size={30} style={{left: LEFT, top: 870, opacity: prog(f, 21.4, 22)}}>
        DROP vs TRUNCATE vs DELETE: another video
      </Chip>

      <SqlCode name="Columns query" code={COLUMNS_SQL} x={RIGHT} y={220} width={860} size={28} opacity={prog(f, 11.2, 11.8)} line={(i) => ({highlight: i === 1 ? window01(f, 11.2, 13.6) : 0})} />
      <DataTable
        name="Columns"
        title="Result"
        x={RIGHT}
        y={530}
        columns={COLUMNS_COLS}
        rows={COLUMNS}
        style={{opacity: prog(f, 12, 12.6)}}
        rowOpacity={(r) => prog(f, 12.2 + r * 0.3, 12.7 + r * 0.3)}
        cell={(r) => (r === 1 ? {bg: prog(f, 14.2, 14.8) > 0 ? TONES.orange.soft : undefined, outline: window01(f, 14.2, 17.4)} : undefined)}
      />
      <Chip tone="maroon" size={30} style={{left: RIGHT, top: 830, opacity: prog(f, 15.8, 16.4)}}>
        no FEE: it was dropped
      </Chip>
    </SceneShell>
  );
};

export const DictionaryScene = Interactive.withSchema({
  Component: DictionaryInner,
  componentName: '<DictionaryScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
