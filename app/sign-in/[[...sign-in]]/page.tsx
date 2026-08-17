import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign in",
  description: "Sign in to AnyTrack to sync trackers, schedule checks, and get email alerts.",
  path: "/sign-in",
});

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
