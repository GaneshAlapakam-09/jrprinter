module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-define',
      {
        'process.env.EXPO_OS': 'android',
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
