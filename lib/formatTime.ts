import { format } from "date-fns";

export function formatMessageTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();

  const isSameDay =
    date.toDateString() === now.toDateString();

  const isSameYear =
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return format(date, "hh:mm a");
  }

  if (isSameYear) {
    return format(date, "MMM d, hh:mm a");
  }

  return format(date, "MMM d yyyy, hh:mm a");
}