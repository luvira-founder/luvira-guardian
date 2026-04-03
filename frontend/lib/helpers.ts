export function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  const suffixes = ["th", "st", "nd", "rd"];
  return `${n}${suffixes[n % 10] ?? "th"}`;
}

export function formatDateTime(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const dayNum = getOrdinal(date.getDate());
  const year = date.getFullYear();
  return `${time} (${day}. ${month}. ${dayNum} ${year})`;
}
