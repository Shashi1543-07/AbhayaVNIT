# How to Run SafetyVNIT as an App

The application is now configured as a **Progressive Web App (PWA)**. This means you can install it on your phone and use it like a native app without needing an APK.

## Option 1: Run Locally on Mobile (Same Network)

1.  **Start the Server:**
    Open your terminal in VS Code and run:
    ```bash
    npm run dev -- --host
    ```
    *The `--host` flag is crucial as it exposes the app to your local network.*

2.  **Find Your IP Address:**
    The terminal will show something like:
    ```
    > Network:  http://192.168.1.X:5173/
    ```
    Note down this IP address.

3.  **Open on Mobile:**
    *   Connect your phone to the **same Wi-Fi network** as your PC.
    *   Open Chrome (Android) or Safari (iOS) on your phone.
    *   Type the address: `http://192.168.1.X:5173` (replace X with your actual number).

4.  **Install as App:**
    *   **Android (Chrome):** Tap the three dots menu (⋮) -> **"Add to Home Screen"** or **"Install App"**.
    *   **iOS (Safari):** Tap the Share button -> **"Add to Home Screen"**.

## Option 2: Local Hosting (Production Build)

To simulate a real production environment locally:

1.  **Build the App:**
    ```bash
    npm run build
    ```

2.  **Preview the Build:**
    ```bash
    npm run preview -- --host
    ```

3.  Follow the same steps as Option 1 to view on mobile.

## Troubleshooting
- **Firewall:** If you can't connect from your phone, ensure your Windows Firewall allows Node.js to accept public connections.
- **Network:** Make sure both devices are on the same Wi-Fi. 5GHz and 2.4GHz bands on the same router are fine.
