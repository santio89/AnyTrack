import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Dashboard",
  description: "Monitor websites on a schedule with AI-powered extraction.",
  path: "/dashboard",
});

export default function DashboardPage() {
  return <Dashboard />;
}
