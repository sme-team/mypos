import {useWindowDimensions} from 'react-native';

// ===============================
// Breakpoints
// ===============================
export const BREAKPOINTS = {
  smallPhone: 360,
  phone: 375,
  largePhone: 414,
  tablet: 768,
  largeTablet: 1024,
};

export const useResponsive = () => {
  const {width, height} = useWindowDimensions();

  // ===============================
  // Device detection
  // ===============================
  const isSmallPhone = width < BREAKPOINTS.smallPhone;

  const isPhone = width >= BREAKPOINTS.phone && width < BREAKPOINTS.largePhone;

  const isLargePhone =
    width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;

  const isTablet =
    width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;

  const isLargeTablet = width >= BREAKPOINTS.largeTablet;

  const isLandscape = width > height;

  // ===============================
  // Responsive Value Picker
  // ===============================
  /**
   * Choose value by breakpoint
   */
  const rv = <T>(values: {
    smallPhone?: T;
    phone?: T;
    largePhone?: T;
    tablet?: T;
    largeTablet?: T;
    default: T;
  }): T => {
    if (isLargeTablet && values.largeTablet !== undefined)
      {return values.largeTablet;}

    if (isTablet && values.tablet !== undefined) {return values.tablet;}

    if (isLargePhone && values.largePhone !== undefined)
      {return values.largePhone;}

    if (isPhone && values.phone !== undefined) {return values.phone;}

    if (isSmallPhone && values.smallPhone !== undefined)
      {return values.smallPhone;}

    return values.default;
  };

  // ===============================
  // Layout Helpers
  // ===============================

  /**
   * Container horizontal padding
   * (UI rộng dần theo màn hình)
   */
  const containerPadding = rv({
    smallPhone: 12,
    phone: 16,
    largePhone: 20,
    tablet: 32,
    largeTablet: 64,
    default: 16,
  });

  /**
   * Standard spacing system
   */
  const space = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  };

  /**
   * Grid column suggestion
   */
  const gridColumns = isLargeTablet ? 4 : isTablet ? 3 : 2;

  /**
   * Calculate card width dynamically
   */
  const cardWidth = (
    columns: number,
    horizontalPadding = containerPadding * 2,
    gap = 12,
  ) => (width - horizontalPadding - gap * (columns - 1)) / columns;

  // ===============================
  // Fixed UI Sizes (NO SCALING)
  // ===============================

  const font = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
  };

  const button = {
    height: 48, // touch standard
    radius: 12,
  };

  const icon = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return {
    // dimensions
    width,
    height,

    // device flags
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isLargeTablet,
    isLandscape,

    // responsive helpers
    rv,

    // layout
    containerPadding,
    gridColumns,
    cardWidth,
    space,

    // fixed system
    font,
    button,
    icon,
  };
};
