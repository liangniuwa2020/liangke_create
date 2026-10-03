package com.pure.mojiweather

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class LocationModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LocationModule"
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        val fineGranted = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        promise.resolve(fineGranted || coarseGranted)
    }

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        val fineGranted = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted = ActivityCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted && !coarseGranted) {
            val map = Arguments.createMap().apply {
                putBoolean("hasPermission", false)
            }
            promise.resolve(map)
            return
        }

        val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (locationManager == null) {
            promise.reject("LOCATION_ERROR", "LocationManager service not available")
            return
        }

        // 1. 尝试获取最近的已知位置
        var bestLocation: Location? = null
        try {
            val providers = listOf(
                LocationManager.GPS_PROVIDER,
                LocationManager.NETWORK_PROVIDER,
                LocationManager.PASSIVE_PROVIDER
            )
            for (provider in providers) {
                if (locationManager.isProviderEnabled(provider)) {
                    val loc = locationManager.getLastKnownLocation(provider)
                    if (loc != null) {
                        if (bestLocation == null || loc.accuracy < bestLocation.accuracy || loc.time > bestLocation.time) {
                            bestLocation = loc
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("LocationModule", "Error querying last known location", e)
        }

        if (bestLocation != null) {
            resolveLocation(bestLocation, promise)
            return
        }

        // 2. 如果没有已知位置，发起单次定位更新 (带 6 秒超时保护)
        val mainHandler = Handler(Looper.getMainLooper())
        var isResolved = false

        val locationListener = object : LocationListener {
            override fun onLocationChanged(loc: Location) {
                if (!isResolved) {
                    isResolved = true
                    try {
                        locationManager.removeUpdates(this)
                    } catch (e: Exception) {
                        // ignore
                    }
                    resolveLocation(loc, promise)
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        val timeoutRunnable = Runnable {
            if (!isResolved) {
                isResolved = true
                try {
                    locationManager.removeUpdates(locationListener)
                } catch (e: Exception) {
                    // ignore
                }
                val map = Arguments.createMap().apply {
                    putBoolean("hasPermission", true)
                    putBoolean("timedOut", true)
                }
                promise.resolve(map)
            }
        }

        mainHandler.postDelayed(timeoutRunnable, 6000)

        mainHandler.post {
            try {
                if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    locationManager.requestSingleUpdate(LocationManager.NETWORK_PROVIDER, locationListener, Looper.getMainLooper())
                } else if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, locationListener, Looper.getMainLooper())
                } else {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    val map = Arguments.createMap().apply {
                        putBoolean("hasPermission", true)
                        putBoolean("providerDisabled", true)
                    }
                    promise.resolve(map)
                }
            } catch (e: Exception) {
                mainHandler.removeCallbacks(timeoutRunnable)
                promise.reject("REQUEST_LOCATION_FAILED", e.message)
            }
        }
    }

    private fun resolveLocation(location: Location, promise: Promise) {
        Thread {
            val map = Arguments.createMap()
            map.putBoolean("hasPermission", true)
            map.putDouble("latitude", location.latitude)
            map.putDouble("longitude", location.longitude)
            map.putDouble("accuracy", location.accuracy.toDouble())
            map.putBoolean("isGps", true)

            var cityName = ""
            var districtName = ""
            var streetName = ""
            var provinceName = ""
            var detailedName = ""

            try {
                val geocoder = Geocoder(reactContext, Locale.CHINA)
                @Suppress("DEPRECATION")
                val addresses = geocoder.getFromLocation(location.latitude, location.longitude, 1)
                if (!addresses.isNullOrEmpty()) {
                    val addr = addresses[0]
                    provinceName = addr.adminArea ?: provinceName
                    val loc = addr.locality ?: addr.subAdminArea ?: ""
                    if (loc.isNotEmpty()) {
                        cityName = loc.replace("市", "")
                    }
                    districtName = addr.subLocality ?: ""
                    streetName = addr.thoroughfare ?: addr.featureName ?: ""

                    // 构造高精度街道/区县级别名称
                    detailedName = when {
                        districtName.isNotEmpty() && streetName.isNotEmpty() -> {
                            if (streetName.contains(districtName)) streetName else "$districtName·$streetName"
                        }
                        districtName.isNotEmpty() -> "$cityName·$districtName"
                        streetName.isNotEmpty() -> "$cityName·$streetName"
                        else -> cityName
                    }
                }
            } catch (e: Exception) {
                Log.e("LocationModule", "Geocoder lookup failed", e)
            }

            map.putString("city", cityName)
            map.putString("district", districtName)
            map.putString("street", streetName)
            map.putString("province", provinceName)
            map.putString("name", detailedName)
            map.putString("displayName", detailedName)

            Handler(Looper.getMainLooper()).post {
                promise.resolve(map)
            }
        }.start()
    }
}
