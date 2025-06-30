import Constants from 'expo-constants';

// Define the environment types
type Environment = 'development' | 'qa' | 'production';

// Get the current environment from app.config.js or default to production
const getEnvironment = (): Environment => {
  // Read from app.config.js -> extra.environment
  const env = Constants.expoConfig?.extra?.environment || 'qa';
  return env as Environment;
};

// Environment-specific configurations
const ENV = {
  development: {
    API_BASE_URL: 'http://192.168.55.32:8080/api',
  },
  qa: {
    API_BASE_URL: 'https://transaction-manager.fly.dev/api', // Replace with your QA API URL
  },
  production: {
    API_BASE_URL: 'http://143.244.134.163:8080/api', // Replace with your production API URL
  },
};

// Get the current environment configuration
const getEnvConfig = () => {
  const env = getEnvironment();
  return ENV[env];
};

export default getEnvConfig;

// For development:
    // Just run npm start or expo start as usual
    // It will use the development API URL (localhost)
// For QA build:
    // Run npm run build:qa for Android
    // Run npm run build:qa:ios for iOS
    // This will create an APK/IPA with the QA API URL
// For Production build:
    // Run npm run build:prod for Android
    // Run npm run build:prod:ios for iOS
    // This will create an APK/IPA with the production API URL