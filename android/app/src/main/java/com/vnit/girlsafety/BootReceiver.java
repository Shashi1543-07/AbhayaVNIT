package com.vnit.girlsafety;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            
            Log.d(TAG, "Device rebooted. Checking SOS state...");

            SharedPreferences prefs = context.getSharedPreferences("SOS_PREFS", Context.MODE_PRIVATE);
            String sosId = prefs.getString("sosId", null);
            String sosToken = prefs.getString("sosToken", null);

            if (sosId != null && sosToken != null) {
                Log.d(TAG, "Active SOS found. Restarting foreground service...");
                Intent serviceIntent = new Intent(context, SOSForegroundService.class);
                serviceIntent.putExtra("sosId", sosId);
                serviceIntent.putExtra("sosToken", sosToken);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
}
