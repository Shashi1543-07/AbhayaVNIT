import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export interface SavedCredentials {
    email: string;
    role: string;
}

const getServerForRole = (role: string) => `com.vnit.girlssafety.auth.${role}`;

export const biometricService = {
    /**
     * Checks if biometric hardware is available and enrolled on the device.
     */
    async isAvailable(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const result = await NativeBiometric.isAvailable();
            return result.isAvailable;
        } catch (error) {
            console.error('Biometric isAvailable error:', error);
            return false;
        }
    },

    /**
     * Securely saves credentials using the device's native keychain/keystore scoped to a specific role.
     */
    async saveCredentials(username: string, password: string, role: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await NativeBiometric.setCredentials({
                username,
                password,
                server: getServerForRole(role),
            });
            console.log(`Saved biometric credentials for role: ${role}`);
        } catch (error) {
            console.error('Failed to save biometric credentials:', error);
        }
    },

    /**
     * Prompts the user for biometric authentication and retrieves saved credentials scoped to a role if successful.
     */
    async getCredentials(role: string, reason: string = 'Authenticate to login'): Promise<{ username: string; password: string } | null> {
        if (!Capacitor.isNativePlatform()) return null;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: getServerForRole(role),
            });
            // If we got credentials, we need to verify biometric
            await NativeBiometric.verifyIdentity({
                reason,
                title: 'Sign In',
                subtitle: `Use your biometric to sign in as ${role.toUpperCase()}`,
                description: 'We need your biometric to keep your account safe'
            });

            return credentials;
        } catch (error) {
            console.error(`Failed to retrieve biometric credentials for role ${role} or auth cancelled:`, error);
            return null;
        }
    },

    /**
     * Removes saved credentials from the native keychain/keystore for a specific role.
     */
    async deleteCredentials(role: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await NativeBiometric.deleteCredentials({
                server: getServerForRole(role),
            });
        } catch (error) {
            // Ignore error if it doesn't exist
            console.log(`No credentials to delete or failed to delete for role: ${role}`);
        }
    },

    /**
     * Checks if credentials exist for a specific role without prompting the user.
     */
    async hasCredentials(role: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: getServerForRole(role),
            });
            return !!(credentials && credentials.username);
        } catch (error) {
            return false;
        }
    }
};
