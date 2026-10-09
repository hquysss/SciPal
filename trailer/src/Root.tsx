import React from 'react';
import { Composition } from 'remotion';
import { Trailer, TrailerProps, trailerDuration } from './Trailer';

const SIZE = { wide: [1920, 1080], tall: [1080, 1920] } as const;

export const Root: React.FC = () => (
  <>
    {(['vi', 'en'] as const).flatMap((lang) =>
      (['wide', 'tall'] as const).map((o) => {
        const props: TrailerProps = { lang, o };
        return (
          <Composition key={`${lang}-${o}`} id={`trailer-${lang}-${o}`} component={Trailer} defaultProps={props}
            fps={30} width={SIZE[o][0]} height={SIZE[o][1]} durationInFrames={trailerDuration(props)} />
        );
      }),
    )}
  </>
);
