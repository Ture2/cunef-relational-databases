import type React from "react";
import { Series, useVideoConfig } from "remotion";
import { Music } from "./components/Music";
import { TitleScene } from "./scenes/S01Title";
import { ProblemScene } from "./scenes/S02Problem";
import { WhatIsScene } from "./scenes/S03WhatIs";
import { FDScene } from "./scenes/S04FD";
import { PartialScene } from "./scenes/S05Partial";
import { TransitiveScene } from "./scenes/S06Transitive";
import { FirstNFScene } from "./scenes/S07FirstNF";
import { SecondNFScene } from "./scenes/S08SecondNF";
import { ThirdNFScene } from "./scenes/S09ThirdNF";
import { BCNFScene } from "./scenes/S10BCNF";
import { LosslessScene } from "./scenes/S11Lossless";
import { OutroScene } from "./scenes/S12Outro";
import { TIMELINE } from "./timeline";

// Scene order and durations come from src/timeline.ts (single source of timing).
export const Normalization: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Music />
      <Series>
        <Series.Sequence
          name={TIMELINE.title.name}
          durationInFrames={TIMELINE.title.durationInFrames}
          premountFor={fps}
        >
          <TitleScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.problem.name}
          durationInFrames={TIMELINE.problem.durationInFrames}
          premountFor={fps}
        >
          <ProblemScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.whatIs.name}
          durationInFrames={TIMELINE.whatIs.durationInFrames}
          premountFor={fps}
        >
          <WhatIsScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.fd.name}
          durationInFrames={TIMELINE.fd.durationInFrames}
          premountFor={fps}
        >
          <FDScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.partial.name}
          durationInFrames={TIMELINE.partial.durationInFrames}
          premountFor={fps}
        >
          <PartialScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.transitive.name}
          durationInFrames={TIMELINE.transitive.durationInFrames}
          premountFor={fps}
        >
          <TransitiveScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.nf1.name}
          durationInFrames={TIMELINE.nf1.durationInFrames}
          premountFor={fps}
        >
          <FirstNFScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.nf2.name}
          durationInFrames={TIMELINE.nf2.durationInFrames}
          premountFor={fps}
        >
          <SecondNFScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.nf3.name}
          durationInFrames={TIMELINE.nf3.durationInFrames}
          premountFor={fps}
        >
          <ThirdNFScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.bcnf.name}
          durationInFrames={TIMELINE.bcnf.durationInFrames}
          premountFor={fps}
        >
          <BCNFScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.lossless.name}
          durationInFrames={TIMELINE.lossless.durationInFrames}
          premountFor={fps}
        >
          <LosslessScene />
        </Series.Sequence>
        <Series.Sequence
          name={TIMELINE.outro.name}
          durationInFrames={TIMELINE.outro.durationInFrames}
          premountFor={fps}
        >
          <OutroScene />
        </Series.Sequence>
      </Series>
    </>
  );
};
