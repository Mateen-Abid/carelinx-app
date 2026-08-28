export const trimToNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const requireTrimmed = (value: unknown): string | null => {
  return trimToNull(value);
};
