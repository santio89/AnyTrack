import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";
import { HOME_TITLE, SITE_NAME, SITE_TAGLINE } from "@/lib/site-metadata";

export const alt = HOME_TITLE;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at top right, rgba(139, 92, 246, 0.35), transparent 42%), linear-gradient(135deg, #0b0b12 0%, #151525 55%, #0d1117 100%)",
          color: "#f8fafc",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <BrandMark size={56} withBackground={false} />
          <div
            style={{
              display: "flex",
              fontSize: "34px",
              fontWeight: 700,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            Track any value on the live web
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              lineHeight: 1.35,
              color: "rgba(226, 232, 240, 0.82)",
              maxWidth: "820px",
            }}
          >
            {SITE_TAGLINE}. Monitor prices, headlines, and live data with AI
            vision extraction.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "22px",
            color: "rgba(196, 181, 253, 0.95)",
          }}
        >
          Vision extraction - Scheduled checks - Change alerts
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
