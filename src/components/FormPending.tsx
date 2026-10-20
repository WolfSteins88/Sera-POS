"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { SeraLoader } from "@/components/SeraLoader";

type FormAction = string | ((formData: FormData) => void | Promise<void>);
type LoaderSize = "xs" | "sm";

// Actions owned by a button's own `formAction` (e.g. "Hapus" inside an edit form). The form's
// default submit button skips them, so only the button that was pressed shows the loader.
const buttonActions = new WeakSet<object>();

// Forms whose submit button sits outside them (`<button form="id">`) publish their state here.
const pendingForms = new Set<string>();
const listeners = new Set<() => void>();

function setFormPending(formId: string, pending: boolean) {
  if (pending === pendingForms.has(formId)) return;
  if (pending) pendingForms.add(formId);
  else pendingForms.delete(formId);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The tile loader, centred over a button whose label it hides (see `.sera-pending` in globals.css). */
export function ButtonLoader({ show, size = "sm" }: { show: boolean; size?: LoaderSize }) {
  if (!show) return null;
  return (
    <span className="sera-pending">
      <SeraLoader size={size} label="Memproses" />
    </span>
  );
}

/**
 * Put inside a submit button: shows the tile loader while its form's server action runs.
 * Pass `action` when the button has its own `formAction`, or `formId` when the button is outside its form.
 */
export function FormPending({ action, formId, size }: { action?: FormAction; formId?: string; size?: LoaderSize }) {
  const status = useFormStatus();
  const external = useSyncExternalStore(
    subscribe,
    () => (formId ? pendingForms.has(formId) : false),
    () => false,
  );

  useEffect(() => {
    if (typeof action !== "function") return;
    buttonActions.add(action);
    return () => {
      buttonActions.delete(action);
    };
  }, [action]);

  let pending = status.pending;
  if (action) pending = pending && status.action === action;
  else if (pending && typeof status.action === "function") pending = !buttonActions.has(status.action);
  return <ButtonLoader show={pending || external} size={size} />;
}

/** Put inside a form whose submit button lives outside it, next to a `<FormPending formId>` on that button. */
export function FormPendingSignal({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    setFormPending(formId, pending);
    return () => setFormPending(formId, false);
  }, [formId, pending]);
  return null;
}
