/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.StyleSheet = {
    ...RN.StyleSheet,
    create: (styles) => styles,
  };
  return RN;
});

jest.mock('nativewind', () => ({
  styled: (Component) => Component,
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
