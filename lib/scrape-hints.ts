const VISIBLE_BROWSER_HINT =
  "Try running with the visible browser (monitor icon) to sign in or complete any on-page steps.";

const BLOCKED_HINT =
  "The site may be blocking automated access. Try the visible browser or check again later.";

const LOADING_HINT =
  "The page may still be loading. Consider increasing check frequency or using a reference screenshot.";

export function suggestsVisibleBrowser(error: string | null | undefined): boolean {
  if (!error) return false;

  return /signing in is required|requires signing in|sign in to view/i.test(error);
}

export function suggestsBlockedAccess(error: string | null | undefined): boolean {
  if (!error) return false;

  return /blocked|captcha|bot-check|access denied/i.test(error);
}

export function suggestsLoadingIssue(error: string | null | undefined): boolean {
  if (!error) return false;

  return /had not finished loading|loading state/i.test(error);
}

export function formatScrapeErrorMessage(error: string | null | undefined): string {
  if (!error) return "";

  const hints: string[] = [];

  if (suggestsVisibleBrowser(error)) {
    hints.push(VISIBLE_BROWSER_HINT);
  }

  if (suggestsBlockedAccess(error)) {
    hints.push(BLOCKED_HINT);
  }

  if (suggestsLoadingIssue(error)) {
    hints.push(LOADING_HINT);
  }

  if (hints.length === 0) {
    return error;
  }

  return `${error}\n\n${hints.join("\n\n")}`;
}

export { VISIBLE_BROWSER_HINT };
