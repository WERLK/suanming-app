import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.xuanjisuanming.app',
  appName: '玄机算命',
  webDir: 'www',
  // DO NOT use server.url — Apple rejects apps that load remote content only.
  // All static assets are bundled locally in www/; only API calls go to the remote server.
  server: {
    allowNavigation: ['xuanjisuanming.top', '*.xuanjisuanming.top'],
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f0c29',
      showSpinner: true,
      spinnerColor: '#ffd700',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f0c29',
    },
  },
  android: {
    backgroundColor: '#0f0c29',
  },
  ios: {
    backgroundColor: '#0f0c29',
  },
};

export default config;
