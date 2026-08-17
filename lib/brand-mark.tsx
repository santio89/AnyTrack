type BrandMarkProps = {
  size: number;
  withBackground?: boolean;
};

const PRIMARY = "#a78bfa";
const BACKGROUND = "#0b0a10";
const BOX_BACKGROUND = "rgba(167, 139, 250, 0.12)";
const BOX_BORDER = "rgba(167, 139, 250, 0.35)";

export function BrandMark({
  size,
  withBackground = true,
}: BrandMarkProps) {
  const radius = Math.round(size * 0.3);
  const iconSize = Math.round(size * 0.5);
  const strokeWidth = Math.max(1.5, size / 16);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: withBackground ? BACKGROUND : "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
          background: BOX_BACKGROUND,
          border: `${Math.max(1, size / 32)}px solid ${BOX_BORDER}`,
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={PRIMARY}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
          <path d="M4 6h.01" />
          <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
          <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
          <path d="M12 18h.01" />
          <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
          <circle cx="12" cy="12" r="2" fill={PRIMARY} stroke="none" />
          <path d="m13.41 10.59 5.66-5.66" />
        </svg>
      </div>
    </div>
  );
}
