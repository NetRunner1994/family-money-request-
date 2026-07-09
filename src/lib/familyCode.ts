// Human-friendly, hard-to-guess family code: 12 chars from an unambiguous
// alphabet (no 0/O/1/I/L), grouped as XXXX-XXXX-XXXX for easy reading/typing.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateFamilyCode(): string {
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return `${group()}-${group()}-${group()}`;
}

// Accept what the user types regardless of case/spacing/dashes, then
// re-format to the canonical grouped, uppercase form.
export function normalizeFamilyCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join("-");
}

export function isValidFamilyCode(code: string): boolean {
  return code.replace(/-/g, "").length >= 8;
}
