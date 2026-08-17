import { NextResponse } from "next/server";
import {
  getPrimaryAiProvider,
  isAiConfigured,
  isFreeFallbackEnabled,
  isFreeModelsPrimary,
  isGatewayConfigured,
  isOpenRouterConfigured,
  resolveFreeModel,
  VISION_MODEL,
} from "@/lib/ai";
import { isEmailNotificationsConfigured } from "@/lib/notifications";

export async function GET() {
  return NextResponse.json({
    aiConfigured: isAiConfigured(),
    aiPrimaryProvider: getPrimaryAiProvider(),
    aiGatewayConfigured: isGatewayConfigured(),
    openRouterConfigured: isOpenRouterConfigured(),
    aiFreeFallbackEnabled: isFreeFallbackEnabled(),
    aiFreeModelsPrimary: isFreeModelsPrimary(),
    aiFreeVisionModel: resolveFreeModel(VISION_MODEL),
    emailConfigured: isEmailNotificationsConfigured(),
  });
}
