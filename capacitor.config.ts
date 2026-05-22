// Capacitor stub — install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
// when you're ready to publish to the App Store / Play Store.
// Run: bunx cap add ios && bunx cap add android
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.gracenotesdaily",
  appName: "GraceNotes Daily",
  webDir: "dist/client",
  server: {
    // Remove this block for production builds — it enables live reload during dev
    // url: "http://YOUR_LOCAL_IP:5173",
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a2e1a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1a2e1a",
    },
  },
};

export default config;
