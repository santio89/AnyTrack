"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AuthButtonProps = {
  compact?: boolean;
};

export function AuthButton({ compact = false }: AuthButtonProps) {
  const { t } = useI18n();

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button
            variant={compact ? "ghost" : "outline"}
            size={compact ? "sm" : "default"}
            className={cn(compact ? "h-8 gap-1.5 text-xs" : "gap-2")}
          >
            <LogIn className="h-4 w-4" />
            {t("auth.signIn")}
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: compact ? "h-8 w-8" : "h-9 w-9",
            },
          }}
        />
      </Show>
    </>
  );
}
