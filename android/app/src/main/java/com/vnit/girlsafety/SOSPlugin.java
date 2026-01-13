package com.vnit.girlsafety;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SOSPlugin")
public class SOSPlugin extends Plugin {

    @PluginMethod
    public void startSOSService(PluginCall call) {
        String sosId = call.getString("sosId");
        String sosToken = call.getString("sosToken");
        String idToken = call.getString("idToken");
        String userId = call.getString("userId");

        if (sosId == null || sosToken == null || idToken == null || userId == null) {
            call.reject("Missing sosId, sosToken, idToken or userId");
            return;
        }

        // Save to SharedPrefs for reboot recovery
        SharedPreferences prefs = getContext().getSharedPreferences("SOS_PREFS", Context.MODE_PRIVATE);
        prefs.edit()
                .putString("sosId", sosId)
                .putString("sosToken", sosToken)
                .putString("idToken", idToken)
                .putString("userId", userId)
                .apply();

        Intent intent = new Intent(getContext(), SOSForegroundService.class);
        intent.putExtra("sosId", sosId);
        intent.putExtra("sosToken", sosToken);
        intent.putExtra("idToken", idToken);
        intent.putExtra("userId", userId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stopSOSService(PluginCall call) {
        // Clear recovery data
        SharedPreferences prefs = getContext().getSharedPreferences("SOS_PREFS", Context.MODE_PRIVATE);
        prefs.edit().clear().apply();

        Intent intent = new Intent(getContext(), SOSForegroundService.class);
        getContext().stopService(intent);

        call.resolve();
    }

    @PluginMethod
    public void isServiceRunning(PluginCall call) {
        // Simplified check: if we have a token in prefs, we assume it should be running
        SharedPreferences prefs = getContext().getSharedPreferences("SOS_PREFS", Context.MODE_PRIVATE);
        boolean running = prefs.contains("sosId");
        call.resolve(new com.getcapacitor.JSObject().put("running", running));
    }
}
