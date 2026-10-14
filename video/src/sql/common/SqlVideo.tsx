import type React from 'react';
import {Series, useVideoConfig} from 'remotion';
import {Music} from '../../components/Music';
import type {SceneTiming} from './timeline';

/** One scene of a SQL video: its timeline key, its composition id and its component. */
export type SqlScene<K extends string> = {
  readonly key: K;
  readonly id: string;
  readonly Component: React.ComponentType;
};

/** Everything Root.tsx needs to register a SQL video and its scenes. */
export type SqlVideoDef = {
  /** Composition id, e.g. 'SqlJoins'. */
  readonly id: string;
  readonly Component: React.ComponentType;
  readonly totalFrames: number;
  readonly scenes: readonly {readonly id: string; readonly Component: React.ComponentType; readonly durationInFrames: number}[];
};

/** Music under the whole video plus the scenes in a Series (as src/ternary/Ternary.tsx). */
export const SqlVideo = <K extends string>({
  scenes,
  timeline,
  speech,
}: {
  readonly scenes: readonly SqlScene<K>[];
  readonly timeline: Readonly<Record<K, SceneTiming>>;
  readonly speech: readonly (readonly [number, number])[];
}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      <Music speech={speech} />
      <Series>
        {scenes.map(({key, Component}) => (
          <Series.Sequence key={key} name={timeline[key].name} durationInFrames={timeline[key].durationInFrames} premountFor={fps}>
            <Component />
          </Series.Sequence>
        ))}
      </Series>
    </>
  );
};

/** Builds the SqlVideoDef of a video from its scenes, timeline and speech intervals. */
export const defineSqlVideo = <K extends string>(
  id: string,
  scenes: readonly SqlScene<K>[],
  timeline: Readonly<Record<K, SceneTiming>>,
  totalFrames: number,
  speech: readonly (readonly [number, number])[],
): SqlVideoDef => {
  const Component: React.FC = () => <SqlVideo scenes={scenes} timeline={timeline} speech={speech} />;
  return {
    id,
    Component,
    totalFrames,
    scenes: scenes.map((sc) => ({id: sc.id, Component: sc.Component, durationInFrames: timeline[sc.key].durationInFrames})),
  };
};
