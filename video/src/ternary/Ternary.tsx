import type React from 'react';
import {Series, useVideoConfig} from 'remotion';
import {Music} from '../components/Music';
import {SPEECH_INTERVALS} from './narration';
import {TernaryTitleScene} from './scenes/T01Title';
import {FactScene} from './scenes/T02Fact';
import {ReadScene} from './scenes/T03Read';
import {KeysScene} from './scenes/T04Keys';
import {PairsScene} from './scenes/T05Pairs';
import {SplitScene} from './scenes/T06Split';
import {TablesScene} from './scenes/T07Tables';
import {TernaryOutroScene} from './scenes/T08Outro';
import {TIMELINE} from './timeline';

export const TERNARY_SCENES = [
  {key: 'title', id: 'TernaryTitle', Component: TernaryTitleScene},
  {key: 'fact', id: 'TernaryFact', Component: FactScene},
  {key: 'read', id: 'TernaryRead', Component: ReadScene},
  {key: 'keys', id: 'TernaryKeys', Component: KeysScene},
  {key: 'pairs', id: 'TernaryPairs', Component: PairsScene},
  {key: 'split', id: 'TernarySplit', Component: SplitScene},
  {key: 'tables', id: 'TernaryTables', Component: TablesScene},
  {key: 'outro', id: 'TernaryOutro', Component: TernaryOutroScene},
] as const;

// Scene order and durations come from src/ternary/timeline.ts.
export const Ternary: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <>
      <Music speech={SPEECH_INTERVALS} />
      <Series>
        {TERNARY_SCENES.map(({key, Component}) => (
          <Series.Sequence key={key} name={TIMELINE[key].name} durationInFrames={TIMELINE[key].durationInFrames} premountFor={fps}>
            <Component />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};
