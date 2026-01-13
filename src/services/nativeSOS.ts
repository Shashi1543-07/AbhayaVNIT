import { registerPlugin } from '@capacitor/core';

export interface SOSPlugin {
    startSOSService(options: { sosId: string; sosToken: string; idToken: string; userId: string }): Promise<void>;
    stopSOSService(): Promise<void>;
    isServiceRunning(): Promise<{ running: boolean }>;
}

const SOSPlugin = registerPlugin<SOSPlugin>('SOSPlugin');

export default SOSPlugin;
