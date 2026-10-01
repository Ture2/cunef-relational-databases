import type React from 'react';

/** Renders `code` spans (between backticks) as bold identifier chips. */
export const RichText: React.FC<{readonly text: string}> = ({text}) => {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            style={{
              fontWeight: 700,
              backgroundColor: '#ece6dc',
              borderRadius: 8,
              padding: '0 8px',
              whiteSpace: 'nowrap',
            }}
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
};
