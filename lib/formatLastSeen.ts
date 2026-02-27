export function formatLastSeen(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return "Last seen just now";
  }

  if (minutes < 60) {
    return `Last seen ${minutes} minute${
      minutes > 1 ? "s" : ""
    } ago`;
  }

  if (hours < 24) {
    return `Last seen ${hours} hour${
      hours > 1 ? "s" : ""
    } ago`;
  }

  const date = new Date(timestamp);

  return `Last seen ${date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}