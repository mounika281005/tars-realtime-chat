export function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.toDateString() === now.toDateString();

  const isSameYear =
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isSameYear) {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}