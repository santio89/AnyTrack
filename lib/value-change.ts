function extractPrimaryNumber(value: string): number | null {
  const normalized = value.replace(/\s/g, "");
  const match = normalized.match(/-?\d[\d.,]*/);

  if (!match) {
    return null;
  }

  const raw = match[0];
  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");

  let numeric = raw;

  if (lastComma > lastDot) {
    numeric = raw.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    numeric = raw.replace(/,/g, "");
  } else {
    numeric = raw.replace(/,/g, "");
  }

  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNumericChange(
  previousValue: string,
  currentValue: string,
): string | null {
  const previous = extractPrimaryNumber(previousValue);
  const current = extractPrimaryNumber(currentValue);

  if (previous == null || current == null || previous === current) {
    return null;
  }

  const delta = current - previous;
  const direction = delta > 0 ? "increased" : "decreased";
  const absDelta = Math.abs(delta);
  const percent =
    previous !== 0 ? Math.abs((delta / previous) * 100) : null;

  const deltaLabel = Number.isInteger(absDelta)
    ? String(absDelta)
    : absDelta.toFixed(2);

  if (percent != null && Number.isFinite(percent)) {
    return `Value ${direction} by ${deltaLabel} (${percent.toFixed(1)}%), from ${previousValue} to ${currentValue}`;
  }

  return `Value ${direction} by ${deltaLabel}, from ${previousValue} to ${currentValue}`;
}

export function buildChangeSummary(
  previousValue: string,
  currentValue: string,
  trackerDescription: string,
): string {
  const numericSummary = formatNumericChange(previousValue, currentValue);

  if (numericSummary) {
    return numericSummary;
  }

  if (previousValue === currentValue) {
    return `No meaningful change detected for "${trackerDescription}".`;
  }

  return `"${trackerDescription}" changed from "${previousValue}" to "${currentValue}".`;
}
