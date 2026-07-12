import { useCallback, useRef, useState } from "react";

export function useAsyncAction() {
  const inFlight = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) {
      return false;
    }

    inFlight.current = true;
    setIsPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("The action could not be completed."));
      return false;
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  }, []);

  return { error, isPending, run };
}
