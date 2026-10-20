const TILE = { xs: 4, sm: 6, md: 10, lg: 16, xl: 36 } as const;

// Tile loader traced from the reference video (styles in globals.css, `.sera-loader`).
// `size` sets the tile edge; the loader box is six tiles wide so the tiles never leave it.
export function SeraLoader({ size = "md", label = "Memuat" }: { size?: keyof typeof TILE; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="sera-loader"
      style={{ "--sera-tile": `${TILE[size]}px` } as React.CSSProperties}
    >
      <span className="sera-loader__base" aria-hidden>
        <span className="sera-loader__glow" />
      </span>
      <span className="sera-loader__tile sera-loader__tile--yellow" aria-hidden />
      <span className="sera-loader__tile sera-loader__tile--red" aria-hidden />
      <span className="sera-loader__tile sera-loader__tile--blue" aria-hidden />
      <span className="sera-loader__tile sera-loader__tile--green" aria-hidden />
    </span>
  );
}
