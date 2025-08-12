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