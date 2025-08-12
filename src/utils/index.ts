/**
 * Returns the initials of a given name.
 * If the name is empty, it returns a question mark.
 * If the name has multiple words, it takes the first character of the first word and the first character of the second word.
 * @param name The name to get the initials from.
 * @returns The initials of the name.
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  const names = name.split(' ');
  let initials = names[0].charAt(0).toUpperCase();
  if (names.length > 1) {
    // Take the first character of the first word and first character of the second word
    initials = names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase();
  }
  return initials;
};

/**
 * Formats a given time in seconds to a string in the format MM:SS.
 * @param seconds The time in seconds to format.
 * @returns The formatted time string.
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
