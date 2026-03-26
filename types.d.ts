/// <reference types="nativewind/types" />

declare module '@env' {
  export const AUTH_API_BASE: string;
}

import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface SafeAreaViewProps {
    className?: string;
  }
}
