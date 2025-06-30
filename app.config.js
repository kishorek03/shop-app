export default {
  expo: {
    name: "இயற்கை வனம்",
    displayName: "இயற்கை வனம்",
    slug: "iyarkaivanam-app",
    version: "1.1.1",
    orientation: "portrait",
    icon: "./assets/images/appicon.png",
    scheme: "shopapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourcompany.shopapp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/appicon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.iyarkaivanam.shopapp"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/appicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/appicon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      environment: 'production',
      eas: {
        projectId: "656cb6dd-c26b-4d00-9aeb-b860a914a13f"
      }
    },
    updates: {
      url: "https://u.expo.dev/656cb6dd-c26b-4d00-9aeb-b860a914a13f"
    },
    runtimeVersion: "1.1.0"
  }
};