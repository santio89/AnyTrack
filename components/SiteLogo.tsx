import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  "aria-hidden"?: boolean;
};

export function SiteLogo({ className, "aria-hidden": ariaHidden }: SiteLogoProps) {
  return (
    <Radar
      className={cn("shrink-0 text-primary", className)}
      aria-hidden={ariaHidden}
    />
  );
}
