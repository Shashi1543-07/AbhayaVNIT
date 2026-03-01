import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface SavedCredentials {
    email: string;
    role: string;
}

const REGISTRY_KEY = 'vnit_biometric_registry';
const getServerForRole = (role: string, identifier: string = 'default') => `com.vnit.girlssafety.auth.${role}.${identifier}`;

export const biometricService = {
    /**
     * Registry Management
     */
    async getRegistry(): Promise<SavedCredentials[]> {
        const { value } = await Preferences.get({ key: REGISTRY_KEY });
        if (!value) return [];
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    },

    async addToRegistry(email: string, role: string): Promise<void> {
        const registry = await this.getRegistry();
        if (!registry.find(acc => acc.email === email && acc.role === role)) {
            registry.push({ email, role });
            await Preferences.set({
                key: REGISTRY_KEY,
                value: JSON.stringify(registry)
            });
        }
    },

    async removeFromRegistry(email: string, role: string): Promise<void> {
        let registry = await this.getRegistry();
        registry = registry.filter(acc => !(acc.email === email && acc.role === role));
        await Preferences.set({
            key: REGISTRY_KEY,
            value: JSON.stringify(registry)
        });
    },

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
     * Securely saves credentials using the device's native keychain/keystore scoped to a specific role and identifier.
     */
    async saveCredentials(username: string, password: string, role: string, identifier: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await NativeBiometric.setCredentials({
                username,
                password,
                server: getServerForRole(role, identifier),
            });
            await this.addToRegistry(identifier, role);
            console.log(`Saved biometric credentials for ${identifier} (${role})`);
        } catch (error) {
            console.error('Failed to save biometric credentials:', error);
        }
    },

    /**
     * Prompts the user for biometric authentication and retrieves saved credentials scoped to a role and identifier if successful.
     */
    async getCredentials(role: string, identifier: string, reason: string = 'Authenticate to login'): Promise<{ username: string; password: string } | null> {
        if (!Capacitor.isNativePlatform()) return null;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: getServerForRole(role, identifier),
            });
            // If we got credentials, we need to verify biometric
            await NativeBiometric.verifyIdentity({
                reason,
                title: 'Sign In',
                subtitle: `Login as ${identifier}`,
                description: `Use your biometric to securely access your ${role} dashboard.`
            });

            return credentials;
        } catch (error) {
            console.error(`Failed to retrieve biometric credentials for ${identifier} (${role}) or auth cancelled:`, error);
            return null;
        }
    },

    /**
     * Removes saved credentials from the native keychain/keystore for a specific role and identifier.
     */
    async deleteCredentials(role: string, identifier: string): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        try {
            await NativeBiometric.deleteCredentials({
                server: getServerForRole(role, identifier),
            });
            await this.removeFromRegistry(identifier, role);
        } catch (error) {
            // Ignore error if it doesn't exist
            console.log(`No credentials to delete or failed to delete for ${identifier} (${role})`);
            // Still try to remove from registry just in case
            await this.removeFromRegistry(identifier, role);
        }
    },

    /**
     * Checks if credentials exist for a specific role and identifier without prompting the user.
     */
    async hasCredentials(role: string, identifier: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;
        try {
            const credentials = await NativeBiometric.getCredentials({
                server: getServerForRole(role, identifier),
            });
            return !!(credentials && credentials.username);
        } catch (error) {
            return false;
        }
    }
};
