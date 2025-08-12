import { useTheme } from 'vuetify';

export function useAppTheme() {
  const theme = useTheme();
  const preferredDark = usePreferredDark(); // Detect system preference

  // Check if a preference is already stored
  const hasStoredPreference = localStorage.getItem('isDarkSchema') !== null;

  // Function to get initial value safely
  function getSafeStoredValue() {
    try {
      const stored = localStorage.getItem('isDarkSchema');
      if (stored !== null) {
        // If exists, use stored value
        return JSON.parse(stored);
      }
      // If not exists, use system preference
      return preferredDark.value;
    } catch (error) {
      console.warn('Error reading localStorage for isDarkSchema:', error);
      return preferredDark.value;
    }
  }

  // Reactive storage with safe initial value
  const isDarkSchema = useStorage('isDarkSchema', getSafeStoredValue());

  // Computed to get current theme name
  const currentThemeName = computed(() => {
    return isDarkSchema.value ? 'customDark' : 'customLight';
  });

  // Apply initial theme
  function initializeTheme() {
    try {
      theme.change(currentThemeName.value);
    } catch (error) {
      console.error('Error initializing theme:', error);
    }
  }

  // Function to toggle theme
  function toggleTheme() {
    try {
      isDarkSchema.value = !isDarkSchema.value;
      theme.change(currentThemeName.value);
    } catch (error) {
      console.error('Error changing theme:', error);
    }
  }

  // Function to set specific theme
  function setTheme(dark = true) {
    try {
      isDarkSchema.value = dark;
      theme.change(currentThemeName.value);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }

  // Watcher to sync with system changes
  // ONLY if no explicit preference is stored
  watch(preferredDark, (newPreferred) => {
    const currentlyHasStoredPreference = localStorage.getItem('isDarkSchema') !== null;
    if (!currentlyHasStoredPreference) {
      isDarkSchema.value = newPreferred;
    }
  });

  // Function to reset to system preference
  function resetToSystemTheme() {
    localStorage.removeItem('isDarkSchema');
    isDarkSchema.value = preferredDark.value;
    theme.change(currentThemeName.value);
  }

  // Computed to know if using system preference
  const isUsingSystemPreference = computed(() => {
    return localStorage.getItem('isDarkSchema') === null;
  });

  // Initialize theme when creating composable
  initializeTheme();

  return {
    isDarkSchema,
    preferredDark, // Expose system preference
    currentThemeName,
    isUsingSystemPreference, // Know if using system preference
    hasStoredPreference, // Know if stored preference exists
    toggleTheme,
    setTheme,
    resetToSystemTheme, // Reset to system preference
    initializeTheme,
  };
}
