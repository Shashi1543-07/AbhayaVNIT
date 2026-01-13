package com.vnit.girlsafety;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class SOSForegroundService extends Service {
    private static final String TAG = "SOSForegroundService";
    private static final String CHANNEL_ID = "SOS_LOCATION_CHANNEL";
    private static final int NOTIFICATION_ID = 911;

    private LocationManager locationManager;
    private LocationListener locationListener;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String sosId = intent.getStringExtra("sosId");
        String sosToken = intent.getStringExtra("sosToken");
        String idToken = intent.getStringExtra("idToken");
        String userId = intent.getStringExtra("userId");

        if (sosId == null || sosToken == null || idToken == null || userId == null) {
            // Try to recover from SharedPreferences
            SharedPreferences prefs = getSharedPreferences("SOS_PREFS", MODE_PRIVATE);
            sosId = prefs.getString("sosId", null);
            sosToken = prefs.getString("sosToken", null);
            idToken = prefs.getString("idToken", null);
            userId = prefs.getString("userId", null);
        }

        if (sosId != null && sosToken != null && idToken != null && userId != null) {
            startForeground(NOTIFICATION_ID, getNotification());
            startLocationUpdates(sosId, sosToken, idToken, userId);
        } else {
            Log.w(TAG, "Missing tracking info, stopping service.");
            stopSelf();
        }

        return START_STICKY;
    }

    private void startLocationUpdates(final String sosId, final String sosToken, final String idToken,
            final String userId) {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                Log.d(TAG, "Location changed: " + location.getLatitude() + ", " + location.getLongitude());
                sendLocationToRTDB(userId, idToken, sosId, location.getLatitude(), location.getLongitude());
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
            }

            @Override
            public void onProviderEnabled(String provider) {
            }

            @Override
            public void onProviderDisabled(String provider) {
            }
        };

        try {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000, // 5 seconds
                    5, // 5 meters
                    locationListener);
            locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    5000,
                    5,
                    locationListener);
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission missing", e);
        }
    }

    private void sendLocationToRTDB(final String userId, final String idToken, final String sosId, final double lat,
            final double lng) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Update the RTDB directly via REST API
                    // Note: region is asia-southeast1 as seen in user's screenshot
                    String baseUrl = "https://vnit-girls-safety-default-rtdb.asia-southeast1.firebasedatabase.app/live_locations/";
                    URL url = new URL(baseUrl + userId + ".json?auth=" + idToken);

                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST"); // Use PATCH (via X-HTTP-Method-Override for older systems) or just
                                                   // POST/PUT
                    // Many REST clients prefer POST with method override for PATCH if not supported
                    // directly
                    conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);

                    JSONObject jsonParam = new JSONObject();
                    jsonParam.put("latitude", lat);
                    jsonParam.put("longitude", lng);

                    JSONObject timestamp = new JSONObject();
                    timestamp.put(".sv", "timestamp");
                    jsonParam.put("lastUpdated", timestamp);

                    jsonParam.put("sosId", sosId);

                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonParam.toString().getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }

                    int code = conn.getResponseCode();
                    Log.d(TAG, "RTDB update status: " + code);
                    conn.disconnect();
                } catch (Exception e) {
                    Log.e(TAG, "Error matching REST update", e);
                }
            }
        }).start();
    }

    private Notification getNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🚨 SOS Active")
                .setContentText("Emergency tracking is active. Your location is being shared.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "SOS Emergency Tracking",
                    NotificationManager.IMPORTANCE_HIGH);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (locationManager != null && locationListener != null) {
            locationManager.removeUpdates(locationListener);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
