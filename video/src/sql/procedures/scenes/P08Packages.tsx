import type React from 'react';
import {Interactive, useCurrentFrame, useVideoConfig, type InteractivitySchema} from 'remotion';
import {prog} from '../../../anim';
import {Chip, Heading, SceneShell} from '../../../components/Shell';
import {C} from '../../../theme';
import {SqlCode} from '../../common/SqlCode';
import {Narration} from '../shared';

const SPEC = `CREATE OR REPLACE PACKAGE grades_pkg IS
  c_max_grade CONSTANT NUMBER := 10;
  FUNCTION  letter (p_grade IN NUMBER) RETURN VARCHAR2;
  PROCEDURE curve_course (p_course IN VARCHAR2, p_points IN NUMBER);
END grades_pkg;
/`;
/* The start of the body of the packages card: shown blurred, the callers never see it. */
const BODY = `CREATE OR REPLACE PACKAGE BODY grades_pkg IS
  FUNCTION safe_points (p_points IN NUMBER) RETURN NUMBER IS
  BEGIN
    RETURN LEAST(GREATEST(p_points, 0), 2);
  END safe_points;

  FUNCTION letter (p_grade IN NUMBER) RETURN VARCHAR2 IS
  BEGIN
    RETURN CASE WHEN p_grade >= 9 THEN 'A' WHEN p_grade >= 7 THEN 'B'
                WHEN p_grade >= 5 THEN 'C' ELSE 'F' END;
  END letter;`;

const SIZE = 24;
const SY = 250;
const BY = 590;
const RX = 1210;

// 0.8 group related procedures and functions in a package · 6.4 the specification is the menu callers see
// · 9.5 the body is the kitchen, where the code lives · 13.6 callers write package.subprogram
const PackagesInner: React.FC<{readonly style?: React.CSSProperties}> = ({style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const spec = prog(f, 6.6, 7.2);
  const body = prog(f, 9.7, 10.3);
  return (
    <SceneShell style={style}>
      <Narration scene="packages" />
      <Heading name="Heading" premountFor={fps}>
        Packages
      </Heading>
      <SqlCode
        name="Specification"
        title="Specification"
        code={SPEC}
        x={100}
        y={SY}
        width={1060}
        size={SIZE}
        opacity={prog(f, 1.6, 2.3)}
        style={{boxShadow: spec > 0 ? `0 0 0 ${5 * spec * (1 - prog(f, 9.4, 9.9))}px ${C.accent}` : undefined}}
        line={(i) => ({highlight: i === 2 || i === 3 ? prog(f, 3.2, 3.7) * (1 - prog(f, 6, 6.5)) : 0, tone: i === 2 ? 'teal' : 'orange'})}
      />
      <Interactive.Div name="Body" style={{position: 'absolute', left: 100, top: BY, width: 1060, height: 340, opacity: prog(f, 2.4, 3.1)}}>
        <SqlCode
          name="Body code"
          code={BODY}
          x={0}
          y={0}
          width={1060}
          size={SIZE}
          style={{
            height: 340,
            overflow: 'hidden',
            maskImage: 'linear-gradient(to bottom, black 65%, transparent)',
            filter: `blur(${4 * (1 - body) + 2}px)`,
            boxShadow: body > 0 ? `0 0 0 ${5 * body * (1 - prog(f, 13, 13.5))}px ${C.accent}` : undefined,
          }}
        />
        <div style={{position: 'absolute', left: 0, top: -50, fontSize: 32, fontWeight: 700, color: C.ink}}>Body</div>
      </Interactive.Div>
      <Chip tone="blue" size={32} style={{left: RX, top: SY + 30, opacity: spec}}>
        The menu: what callers see
      </Chip>
      <Chip tone="maroon" size={32} style={{left: RX, top: BY + 30, opacity: body}}>
        The kitchen: hidden code
      </Chip>
      <SqlCode
        name="Call"
        title="Callers write"
        code="grades_pkg.letter(8.5)"
        x={RX}
        y={760}
        width={620}
        size={34}
        opacity={prog(f, 14, 14.6)}
        line={() => ({highlight: prog(f, 15.2, 15.7)})}
      />
      <Interactive.Div
        name="Package dot subprogram"
        style={{position: 'absolute', left: RX, top: 880, width: 620, fontSize: 28, color: C.muted, opacity: prog(f, 15.4, 16)}}
      >
        package <b style={{color: C.ink}}>.</b> subprogram
      </Interactive.Div>
    </SceneShell>
  );
};

export const PackagesScene = Interactive.withSchema({
  Component: PackagesInner,
  componentName: '<PackagesScene>',
  schema: {} as const satisfies InteractivitySchema,
  wrapInSequence: true,
});
