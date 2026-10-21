"use client";

import Link from "next/link";
import { useState } from "react";

type Props = React.ComponentProps<typeof Link>;

/**
 * A menu link that loads the whole destination page as soon as the pointer or a finger reaches it,
 * so by the time the click lands the page is usually ready and appears at once. Pages are not
 * fetched while links merely sit on screen, which keeps the database from rendering every menu
 * page on each load.
 */
export function NavLink({ onMouseEnter, onFocus, onTouchStart, ...props }: Props) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
