"use client";

import { useEffect, useRef } from "react";

/** Warns before leaving a dirty form, including browser back/forward gestures handled by the SPA router. */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  const isDirtyRef = useRef(isDirty);
  const guardActiveRef = useRef(false);
  const bypassPopRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;

    if (isDirty && !guardActiveRef.current) {
      window.history.pushState({ ...window.history.state, __ihpUnsavedFormGuard: true }, "", window.location.href);
      guardActiveRef.current = true;
    } else if (!isDirty && guardActiveRef.current) {
      guardActiveRef.current = false;
      bypassPopRef.current = true;
      window.history.back();
    }
  }, [isDirty]);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const confirmHistoryNavigation = () => {
      if (bypassPopRef.current) {
        bypassPopRef.current = false;
        return;
      }
      if (!isDirtyRef.current) return;

      if (window.confirm("You have unsaved changes. Leave this form and discard them?")) {
        isDirtyRef.current = false;
        guardActiveRef.current = false;
        bypassPopRef.current = true;
        window.history.back();
      } else {
        window.history.pushState({ ...window.history.state, __ihpUnsavedFormGuard: true }, "", window.location.href);
        guardActiveRef.current = true;
      }
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    window.addEventListener("popstate", confirmHistoryNavigation);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      window.removeEventListener("popstate", confirmHistoryNavigation);
    };
  }, []);
}
