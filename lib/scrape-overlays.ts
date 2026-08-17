import type { Page } from "playwright";

type DismissAction =
  | { type: "click"; x: number; y: number; reason: string }
  | { type: "escape"; reason: string };

async function findDismissAction(page: Page): Promise<DismissAction | null> {
  return page.evaluate(() => {
    const LOGIN_PATTERN =
      /\b(iniciar sesi[oó]n|log\s*in|sign\s*in|registrarme|sign\s*up|create account|crear cuenta)\b/i;
    const CONSENT_BUTTON_PATTERN =
      /^(aceptar( todo(s)?| cookies)?|accept( all| cookies)?|rechazar( todo(s)?)?|reject( all)?|no[, ]?gracias|not now|maybe later|continuar sin|continue without|entendido|got it|ok|cerrar)$/i;
    const CLOSE_HINT_PATTERN =
      /\b(close|cerrar|dismiss|skip|saltar|ocultar)\b/i;

    function isVisible(element: Element) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.pointerEvents !== "none" &&
        style.opacity !== "0"
      );
    }

    function isClickable(element: Element) {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute("role")?.toLowerCase();

      return (
        tag === "button" ||
        tag === "a" ||
        role === "button" ||
        element.onclick !== null ||
        element.hasAttribute("tabindex")
      );
    }

    function elementLabel(element: Element) {
      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      const aria = element.getAttribute("aria-label") || "";
      const title = element.getAttribute("title") || "";
      return `${text} ${aria} ${title}`.trim();
    }

    function isUnsafeDismissTarget(element: Element) {
      const label = elementLabel(element);

      if (LOGIN_PATTERN.test(label)) {
        return true;
      }

      if (element instanceof HTMLAnchorElement) {
        const href = element.getAttribute("href") || "";
        if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
          return true;
        }
      }

      const captchaRoot = element.closest(
        '[class*="captcha" i], [id*="captcha" i], iframe[src*="captcha" i], iframe[src*="recaptcha" i]',
      );

      return Boolean(captchaRoot);
    }

    function overlayScore(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const area = rect.width * rect.height;
      const zIndex = Number.parseInt(style.zIndex || "0", 10) || 0;
      let score = 0;

      if (
        element.getAttribute("role") === "dialog" ||
        element.getAttribute("aria-modal") === "true"
      ) {
        score += 8;
      }

      if (style.position === "fixed" || style.position === "absolute") {
        score += 3;
      }

      const viewport = window.innerWidth * window.innerHeight;
      if (area >= viewport * 0.35) {
        score += 5;
      } else if (area >= viewport * 0.15) {
        score += 2;
      }

      if (zIndex >= 100) {
        score += 2;
      }

      const className = String(element.className || "").toLowerCase();
      const id = (element.id || "").toLowerCase();

      if (
        /modal|overlay|interstitial|popup|lightbox|consent|cookie|banner|dialog/.test(
          `${className} ${id}`,
        )
      ) {
        score += 3;
      }

      return score;
    }

    function findBlockingRoots() {
      const roots: Element[] = [];
      const seen = new Set<Element>();

      for (const element of document.querySelectorAll("body *")) {
        if (!isVisible(element)) {
          continue;
        }

        const score = overlayScore(element);
        if (score < 5) {
          continue;
        }

        let contained = false;
        for (const existing of roots) {
          if (existing.contains(element)) {
            contained = true;
            break;
          }
        }

        if (contained || seen.has(element)) {
          continue;
        }

        roots.push(element);
        seen.add(element);
      }

      return roots
        .filter((root) => !roots.some((other) => other !== root && other.contains(root)))
        .sort((a, b) => overlayScore(b) - overlayScore(a));
    }

    function closeButtonScore(element: Element, root?: Element) {
      const rect = element.getBoundingClientRect();
      const label = elementLabel(element).toLowerCase();
      let score = 0;

      if (!isClickable(element) || isUnsafeDismissTarget(element)) {
        return -1;
      }

      if (root && !root.contains(element)) {
        return -1;
      }

      if (rect.width > 0 && rect.width <= 120 && rect.height > 0 && rect.height <= 120) {
        score += 2;
      }

      if (rect.y <= 180) {
        score += 2;
      }

      if (rect.x >= window.innerWidth - 220) {
        score += 4;
      }

      if (CLOSE_HINT_PATTERN.test(label)) {
        score += 5;
      }

      if (/^[×✕xX]$/.test((element.textContent || "").trim())) {
        score += 6;
      }

      const className = String(element.className || "").toLowerCase();
      const id = (element.id || "").toLowerCase();

      if (className.includes("close") || id.includes("close")) {
        score += 4;
      }

      return score;
    }

    function consentButtonScore(element: Element) {
      const label = (element.textContent || "").replace(/\s+/g, " ").trim();

      if (!isClickable(element) || isUnsafeDismissTarget(element)) {
        return -1;
      }

      if (!CONSENT_BUTTON_PATTERN.test(label)) {
        return -1;
      }

      let score = 6;
      const rect = element.getBoundingClientRect();

      if (rect.y <= 220 || rect.y >= window.innerHeight - 220) {
        score += 2;
      }

      if (/rechazar|reject|no[, ]?gracias|not now|maybe later/i.test(label)) {
        score += 1;
      }

      return score;
    }

    function toClickAction(element: Element, reason: string): DismissAction {
      const rect = element.getBoundingClientRect();
      return {
        type: "click",
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        reason,
      };
    }

    const blockingRoots = findBlockingRoots();
    const clickables = Array.from(
      document.querySelectorAll(
        'button, a, [role="button"], input[type="button"], input[type="submit"]',
      ),
    );

    let best: { action: DismissAction; score: number } | null = null;

    function consider(element: Element, score: number, reason: string) {
      if (score < 0 || !isVisible(element)) {
        return;
      }

      const action = toClickAction(element, reason);
      if (!best || score > best.score) {
        best = { action, score };
      }
    }

    for (const root of blockingRoots) {
      for (const element of root.querySelectorAll(
        "button, a, [role='button'], span, div, svg",
      )) {
        const clickable =
          (isClickable(element) ? element : element.closest('button, a, [role="button"]')) ??
          element;

        if (!(clickable instanceof HTMLElement)) {
          continue;
        }

        consider(clickable, closeButtonScore(clickable, root), "close overlay control");
      }
    }

    for (const element of clickables) {
      consider(element, consentButtonScore(element), "consent or continue button");
    }

    if (!best && blockingRoots.length > 0) {
      for (const element of clickables) {
        consider(element, closeButtonScore(element), "global close control");
      }
    }

    const chosenBest = best as { action: DismissAction; score: number } | null;
    if (chosenBest) {
      return chosenBest.action;
    }

    if (blockingRoots.length > 0) {
      return { type: "escape", reason: "blocking overlay still visible" };
    }

    return null;
  });
}

async function runDismissPass(page: Page) {
  const action = await findDismissAction(page);

  if (!action) {
    return false;
  }

  if (action.type === "escape") {
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(400);
    return true;
  }

  await page.mouse.click(action.x, action.y);
  await page.waitForTimeout(600);
  return true;
}

export async function dismissBlockingOverlays(page: Page) {
  for (let pass = 0; pass < 5; pass += 1) {
    const dismissed = await runDismissPass(page);
    if (!dismissed) {
      break;
    }
  }
}
