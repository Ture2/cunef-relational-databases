import type React from 'react';
import {Composition, Folder} from 'remotion';
import {Normalization} from './Normalization';
import {TitleScene} from './scenes/S01Title';
import {ProblemScene} from './scenes/S02Problem';
import {WhatIsScene} from './scenes/S03WhatIs';
import {FDScene} from './scenes/S04FD';
import {PartialScene} from './scenes/S05Partial';
import {TransitiveScene} from './scenes/S06Transitive';
import {FirstNFScene} from './scenes/S07FirstNF';
import {SecondNFScene} from './scenes/S08SecondNF';
import {ThirdNFScene} from './scenes/S09ThirdNF';
import {BCNFScene} from './scenes/S10BCNF';
import {LosslessScene} from './scenes/S11Lossless';
import {OutroScene} from './scenes/S12Outro';
import {TIMELINE, TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Normalization"
        component={Normalization}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Title"
          component={TitleScene}
          durationInFrames={TIMELINE.title.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Problem"
          component={ProblemScene}
          durationInFrames={TIMELINE.problem.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="WhatIs"
          component={WhatIsScene}
          durationInFrames={TIMELINE.whatIs.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="FunctionalDependency"
          component={FDScene}
          durationInFrames={TIMELINE.fd.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="PartialDependency"
          component={PartialScene}
          durationInFrames={TIMELINE.partial.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="TransitiveDependency"
          component={TransitiveScene}
          durationInFrames={TIMELINE.transitive.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="FirstNF"
          component={FirstNFScene}
          durationInFrames={TIMELINE.nf1.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SecondNF"
          component={SecondNFScene}
          durationInFrames={TIMELINE.nf2.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ThirdNF"
          component={ThirdNFScene}
          durationInFrames={TIMELINE.nf3.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="BCNF"
          component={BCNFScene}
          durationInFrames={TIMELINE.bcnf.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="LosslessJoin"
          component={LosslessScene}
          durationInFrames={TIMELINE.lossless.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Outro"
          component={OutroScene}
          durationInFrames={TIMELINE.outro.durationInFrames}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
