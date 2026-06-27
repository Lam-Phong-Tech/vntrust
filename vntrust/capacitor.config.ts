import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://anticounterfeit.test9.io.vn";

const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || "com.vntrust.verigoods",
  appName: process.env.CAPACITOR_APP_NAME || "AI VeriGoods",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"],
    },
    Geolocation: {
      permissions: ["location"],
    },
  },
};

export default config;
