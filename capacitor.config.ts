import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.vnit.girlsafety',
    appName: 'vnit-girls-safety',
    webDir: 'dist',
    server: {
        url: 'http://192.168.249.95:5173',
        cleartext: true
    }
};

export default config;
