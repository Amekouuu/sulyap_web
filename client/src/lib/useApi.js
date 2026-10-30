import { useEffect, useState } from 'react';
import { api } from './api';

// Loads an API path and loads it again whenever the path changes.
// The previous result stays visible while the next one loads, so filters do not flash empty.
// Pass null to skip the request.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    setState((previous) => ({ data: previous.data, error: null, loading: true }));
    api(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path]);

  return state;
}
