package com.lifehubfin

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ApkInstallerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ApkInstaller"

    @ReactMethod
    fun install(filePath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val file = File(filePath)

            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK 文件不存在: $filePath")
                return
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    val uri = FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        file
                    )
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    setDataAndType(uri, "application/vnd.android.package-archive")
                } else {
                    setDataAndType(
                        Uri.fromFile(file),
                        "application/vnd.android.package-archive"
                    )
                }
            }

            context.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", "安装失败: ${e.message}", e)
        }
    }
}
