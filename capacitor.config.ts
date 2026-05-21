import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vntrust.app',
  appName: 'VNTRUST',
  webDir: 'out',
  server: {
    url: 'https://anticounterfeit.test9.io.vn',
    cleartext: true
  }
};

export default config;
