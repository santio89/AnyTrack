import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign up",
  description: "Create an AnyTrack account to sync trackers, schedule checks, and get email alerts.",
  path: "/sign-up",
});

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
