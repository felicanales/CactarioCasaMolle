'use client';

import { useEffect } from 'react';

const LOGS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOGS === 'true';

export default function ConsoleSilencer() {
  useEffect(() => {
    if (LOGS_ENABLED || typeof window === 'undefined') {
      return undefined;
    }

    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;

    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, []);

  return null;
}
