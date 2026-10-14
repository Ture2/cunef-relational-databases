// Every SQL video, registered in Root.tsx (folder "SQL", plus one scene folder per video).
import {AGGREGATION_VIDEO} from './aggregation';
import type {SqlVideoDef} from './common/SqlVideo';
import {CURSORS_VIDEO} from './cursors';
import {DDL_VIDEO} from './ddl';
import {DELETE_VIDEO} from './delete';
import {INDEXES_VIDEO} from './indexes';
import {JOINS_VIDEO} from './joins';
import {KEYS_VIDEO} from './keys';
import {PROCEDURES_VIDEO} from './procedures';
import {SUBQUERIES_VIDEO} from './subqueries';
import {TRIGGERS_VIDEO} from './triggers';

export const SQL_VIDEOS: readonly SqlVideoDef[] = [JOINS_VIDEO, DELETE_VIDEO, KEYS_VIDEO, AGGREGATION_VIDEO, PROCEDURES_VIDEO, CURSORS_VIDEO, TRIGGERS_VIDEO, SUBQUERIES_VIDEO, DDL_VIDEO, INDEXES_VIDEO];
