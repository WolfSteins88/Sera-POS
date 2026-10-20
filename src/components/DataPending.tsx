"use client";

import { createContext, useContext, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SeraLoader } from "@/components/SeraLoader";

const PendingContext = createContext(false);

/**
 * Wrap a page whose filters, tabs and pagination reload its data through the URL. Same-page links and
 * GET forms inside it navigate in a transition, so the current page stays visible and usable while the
 * new data loads, and `DataPendingArea` shows the tile loader over the part being reloaded.
 */
export function DataPending({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function go(url: URL) {
    startTransition(() => router.push(`${url.pathname}${url.search}`, { scroll: false }));
  }

  return (
    <PendingContext.Provider value={pending}>
      <div
        className={className}
        onClickCapture={(event) => {
          if (event.defaultPrevented || event.button !== 0) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const anchor = (event.target as Element).closest("a");
          if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
          const url = new URL(anchor.href, window.location.href);
          if (url.origin !== window.location.origin || url.pathname !== pathname) return;
          event.preventDefault();
          go(url);
        }}
        onSubmitCapture={(event) => {
          const form = event.target as HTMLFormElement;
          // Only plain GET filter forms: server-action forms carry an action attribute (or $ACTION inputs).
          // Attributes, not form.method/form.action: a field named "method" shadows those properties.
          if (event.defaultPrevented || form.hasAttribute("action") || (form.getAttribute("method") ?? "get").toLowerCase() !== "get") return;
          if (form.querySelector('input[name^="$ACTION"]')) return;
          const url = new URL(window.location.href);
          event.preventDefault();
          const params = new URLSearchParams();
          new FormData(form).forEach((value, key) => {
            if (typeof value === "string") params.append(key, value);
          });
          url.search = params.toString();
          go(url);
        }}
      >
        {children}
      </div>
    </PendingContext.Provider>
  );
}

/**
 * The part of a `DataPending` page that is dimmed while new data loads. The main area shows the loader;
 * pass `loader={false}` for smaller areas on the same page so only one loader shows.
 */
export function DataPendingArea({
  children,
  className = "",
  loader = true,
}: {
  children: React.ReactNode;
  className?: string;
  loader?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <div className={`relative ${className}`} aria-busy={pending}>
      <div className={pending ? "data-pending-dim" : undefined}>{children}</div>
      {pending ? (
        <div className="data-pending-overlay">
          {loader ? (
            <div className="sticky top-[25vh] flex justify-center pt-8">
              <SeraLoader size="lg" label="Memuat data" />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
