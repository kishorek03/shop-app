const isQa = process.env.APP_ENV === 'qa';
const isDev = process.env.APP_ENV === 'development';

export default {
  expo: {
    name: isQa ? "இயற்கை வனம் (QA)" : isDev ? "இயற்கை வனம் (Dev)" : "இயற்கை வனம்",
    displayName: isQa ? "இயற்கை வனம் (QA)" : isDev ? "இயற்கை வனம் (Dev)" : "இயற்கை வனம்",
    slug: "shop-app",
    version: "1.1.1",
    orientation: "portrait",
    icon: "./assets/images/appicon.png",
    scheme: isQa ? "shopapp-qa" : "shopapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: isQa ? "com.yourcompany.shopapp.qa" : "com.yourcompany.shopapp"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/appicon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: isQa ? "com.iyarkaivanam.shopapp.qa" : "com.iyarkaivanam.shopapp",
      usesCleartextTraffic: true,
      permissions: [
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.VIBRATE"
      ]
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
      environment: process.env.APP_ENV || 'production',
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