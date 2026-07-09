export const fmt = (n: number) =>
  "$" +
  Number(n).toLocaleString("en-US", {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });

export const timeAgo = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : d + " days ago";
};

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const AVATARS = ["🦖", "🦄", "🐸", "🐼", "🦊", "🐙", "🦁", "🐨", "🐵", "🐯", "🦉", "🐳"];

export const CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍕" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "school", label: "School", emoji: "📚" },
  { id: "clothes", label: "Clothes", emoji: "👟" },
  { id: "fun", label: "Fun", emoji: "🎢" },
  { id: "other", label: "Other", emoji: "✨" },
];

export const QUICK_AMOUNTS = [5, 10, 20];

export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
