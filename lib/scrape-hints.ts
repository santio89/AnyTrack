const BLOCKED_HINT =
  "The site may be blocking automated access. Try again later.";

const LOADING_HINT =
  "The page may still be loading. Consider increasing check frequency or using a reference screenshot.";

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
