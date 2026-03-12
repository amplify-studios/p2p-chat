import React from 'react';

if (process.env.NODE_ENV === 'development') {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional dev dependency
    const whyDidYouRender = require('@welldone-software/why-did-you-render');

    whyDidYouRender(React, {
      trackAllPureComponents: true,
      //   trackHooks: true,
      //   logOnDifferentValues: true,
      //   hotReload: true,
    });
  }
}
