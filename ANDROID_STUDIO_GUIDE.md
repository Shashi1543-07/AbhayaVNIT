# Running SafetyVNIT in Android Studio

This guide will help you run the application as a native Android app using Android Studio and Capacitor.

## Prerequisites
1.  **Android Studio:** Installed and updated.
2.  **Android SDK:** Installed via Android Studio SDK Manager.
3.  **Real Device or Emulator:** A physical Android phone with USB Debugging enabled, or a configured Virtual Device (AVD).

---

## Step 1: Build the Web Project
Before updating the Android app, you must create a fresh web build.
```powershell
npm run build
```
*This creates the `dist` folder which contains the optimized web code.*

---

## Step 2: Sync with Capacitor
Copy the fresh build into the Android project.
```powershell
npx cap sync android
```
*This updates the native `android` folder with your latest code changes and plugins.*

---

## Step 3: Open in Android Studio
You can open the project directly from the command line:
```powershell
npx cap open android
```
*Alternatively, you can manually open Android Studio and choose **"Open"**, then select the `android` folder in your project directory.*

---

## Step 4: Run on Device/Emulator
1.  Wait for Android Studio to finish indexing and Gradle sync (watch the progress bar at the bottom).
2.  Select your device or emulator in the dropdown menu at the top.
3.  Click the **Run** button (Green Arrow) or press `Shift + F10`.

---

## Common Issues & Fixes

### 1. JAVA_HOME Error
If Gradle fails with a "JAVA_HOME" error:
- Go to **File > Settings > Build, Execution, Deployment > Build Tools > Gradle**.
- Change **Gradle JDK** to use the one provided by Android Studio (usually `jbr-17` or similar).

### 2. Live Reload (Development Mode)
If you want to see changes instantly on your phone without re-building:
1.  **Start your dev server**: `npm run dev`
2.  **Establish the USB Bridge**:
    Run this exact command in your terminal:
    ```powershell
    & "C:\Users\lenovo\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:5173 tcp:5173
    ```
3.  **Bypass SSL (First time only)**:
    - Open **Chrome** on your phone.
    - Visit `https://localhost:5173`.
    - Tap **Advanced > Proceed** to authorize the secure connection.
4.  **Launch the App**: Run the app from Android Studio. Changes you make in code will now appear on your phone instantly!

---

> [!IMPORTANT]
> Always run `npm run build` followed by `npx cap sync android` whenever you make significant changes you want to see in the native app.
