module.exports = {
  assets: ['./assets'],
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-vector-icons/android',
          packageImportPath: 'import io.github.react-native-vector-icons.VectorIconsPackage;',
          packageInstance: 'new VectorIconsPackage()',
        },
      },
    },
  },
}; 