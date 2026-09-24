import os
import subprocess

def prepare_android():
    manifest_path = "android/app/src/main/AndroidManifest.xml"
    
    # 1. Tạo platform android nếu chưa có
    if not os.path.exists("android/build.gradle") and not os.path.exists("android/build.gradle.kts"):
        print("Creating Android platform structure...")
        subprocess.run(["flutter", "create", ".", "--platforms=android", "--org=com.atmocar"], check=True)
    
    # 2. Inject permissions vào AndroidManifest.xml
    if os.path.exists(manifest_path):
        print(f"Injecting permissions into {manifest_path}...")
        with open(manifest_path, "r", encoding="utf-8") as f:
            content = f.read()

        permissions = """
    <!-- Permissions for AtmoCar (Wi-Fi, Bluetooth BLE, WakeLock) -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
"""
        if "android.permission.BLUETOOTH_SCAN" not in content:
            content = content.replace("<application", permissions + "\n    <application")
            with open(manifest_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("Permissions injected successfully.")

    # 3. Đảm bảo minSdkVersion 21 cho flutter_blue_plus
    gradle_path = "android/app/build.gradle"
    if os.path.exists(gradle_path):
        with open(gradle_path, "r", encoding="utf-8") as f:
            g_content = f.read()
        g_content = g_content.replace("minSdkVersion flutter.minSdkVersion", "minSdkVersion 21")
        with open(gradle_path, "w", encoding="utf-8") as f:
            f.write(g_content)
        print("Updated minSdkVersion to 21.")

if __name__ == "__main__":
    prepare_android()
