const TILE = { xs: 4, sm: 6, md: 10, lg: 16, xl: 36 } as const;

// Same tile loader as Sera PMS (styles in globals.css, `.sera-loader`).
// `size` sets the tile edge: xs fits inside a button, xl suits a full-screen loader.
export function SeraLoader({ size = "md", label = "Memuat" }: { size?: keyof typeof TILE; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="sera-loader"
      style={{ "--sera-tile": `${TILE[size]}px` } as React.CSSProperties}
    >
      <span className="sera-loader__grid" aria-hidden>
        <span className="sera-loader__base" />
        <span className="sera-loader__base" />
        <span className="sera-loader__base" />
        <span className="sera-loader__base" />
        <span className="sera-loader__tile sera-loader__tile--yellow" />
        <span className="sera-loader__tile sera-loader__tile--blue" />
        <span className="sera-loader__tile sera-loader__tile--green" />
        <span className="sera-loader__tile sera-loader__tile--red" />
      </span>
    </span>
  );
}
