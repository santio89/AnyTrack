import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { createPageMetadata, HOME_TITLE } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: HOME_TITLE,
    description:
      "Track prices, headlines, and live data from any website with AI vision extraction, on your schedule.",
    path: "/",
  }),
  title: {
    absolute: HOME_TITLE,
  },
};

export default function Home() {
  return <LandingPage />;
}
