import {useWindowDimensions} from 'react-native';

// ===============================
// Breakpoints (iOS + Android)
// ===============================
export const BREAKPOINTS = {
  // Android devices
  androidSmall: 360,    // Galaxy S5 mini, Android small
  androidMedium: 380,   // Galaxy A51, most Android phones
  androidLarge: 412,    // Pixel 6, large Android phones
  androidXLarge: 480,   // Large Android phones/phablets

  // iOS devices
  smallPhone: 360,      // iPhone SE (2nd/3rd gen)
  phone: 375,          // iPhone 12/13 mini
  largePhone: 414,      // iPhone 12/13 Pro Max

  // Tablets
  tablet: 768,         // iPad mini, Android small tablets
  largeTablet: 1024,   // iPad, Android large tablets

  // Universal
  desktop: 1200,       // Large tablets, desktop
};

export const useResponsive = () => {
  const {width, height} = useWindowDimensions();

  // ===============================
  // Device detection (iOS + Android)
  // ===============================
  const isAndroidSmall = width >= BREAKPOINTS.androidSmall && width < BREAKPOINTS.androidMedium;
  const isAndroidMedium = width >= BREAKPOINTS.androidMedium && width < BREAKPOINTS.androidLarge;
  const isAndroidLarge = width >= BREAKPOINTS.androidLarge && width < BREAKPOINTS.androidXLarge;
  const isAndroidXLarge = width >= BREAKPOINTS.androidXLarge && width < BREAKPOINTS.tablet;

  const isSmallPhone = width >= BREAKPOINTS.smallPhone && width < BREAKPOINTS.phone;
  const isPhone = width >= BREAKPOINTS.phone && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;

  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.largeTablet;
  const isLargeTablet = width >= BREAKPOINTS.largeTablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;

  // Universal flags
  const isMobile = width < BREAKPOINTS.tablet;
  const isTabletDevice = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isLandscape = width > height;

  // ===============================
  // Responsive Value Picker
  // ===============================
  /**
   * Choose value by breakpoint (iOS + Android support)
   */
  const rv = <T>(values: {
    androidSmall?: T;
    androidMedium?: T;
    androidLarge?: T;
    androidXLarge?: T;
    smallPhone?: T;
    phone?: T;
    largePhone?: T;
    tablet?: T;
    largeTablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    // Check Android devices first (more specific)
    if (isAndroidLarge && values.androidLarge !== undefined) {return values.androidLarge;}
    if (isAndroidMedium && values.androidMedium !== undefined) {return values.androidMedium;}
    if (isAndroidSmall && values.androidSmall !== undefined) {return values.androidSmall;}
    if (isAndroidXLarge && values.androidXLarge !== undefined) {return values.androidXLarge;}

    // Check iOS devices
    if (isLargePhone && values.largePhone !== undefined) {return values.largePhone;}
    if (isPhone && values.phone !== undefined) {return values.phone;}
    if (isSmallPhone && values.smallPhone !== undefined) {return values.smallPhone;}

    // Check tablets
    if (isDesktop && values.desktop !== undefined) {return values.desktop;}
    if (isLargeTablet && values.largeTablet !== undefined) {return values.largeTablet;}
    if (isTablet && values.tablet !== undefined) {return values.tablet;}

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

    // device flags (iOS + Android)
    isAndroidSmall,
    isAndroidMedium,
    isAndroidLarge,
    isAndroidXLarge,
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isLargeTablet,
    isDesktop,

    // universal flags
    isMobile,
    isTabletDevice,
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
