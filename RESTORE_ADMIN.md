# How to Restore Admin Access

Since you deleted the admin account, you need to create a new one using a script. This requires a **Service Account Key** from Firebase.

## Step 1: Get Service Account Key
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Open your project.
3.  Click the **Gear Icon** (Settings) -> **Project Settings**.
4.  Go to the **Service accounts** tab.
5.  Click **Generate new private key**.
6.  Save the downloaded file as `service-account.json` in the root folder of this project:
    `c:\Users\lenovo\VNIT_GIRL'S_SAFETY\service-account.json`

## Step 2: Run the Creation Script
Open your terminal and run the following command (replace with your desired email and password):

```bash
node scripts/createAdmin.js admin@vnit.ac.in Admin@123
```

## Step 3: Login
Go back to the app (`http://localhost:5173/login`) and login with these credentials.
