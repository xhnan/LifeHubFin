package com.lifehubfin

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ApkDownloadManagerModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ApkDownloadManager"

    @ReactMethod
    fun enqueue(url: String, fileName: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val downloadManager =
                context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

            val downloadsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                ?: throw IllegalStateException("Downloads directory unavailable")
            val targetFile = File(downloadsDir, fileName)

            if (targetFile.exists()) {
                targetFile.delete()
            }

            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle("LifeHubFin Update")
                setDescription("Downloading update in background")
                setMimeType("application/vnd.android.package-archive")
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
                setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                )
                setDestinationUri(Uri.fromFile(targetFile))
            }

            val downloadId = downloadManager.enqueue(request)
            val result = Arguments.createMap().apply {
                putDouble("downloadId", downloadId.toDouble())
                putString("filePath", targetFile.absolutePath)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_ENQUEUE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun query(downloadId: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val downloadManager =
                context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

            val query = DownloadManager.Query().setFilterById(downloadId.toLong())
            downloadManager.query(query).use { cursor ->
                if (!cursor.moveToFirst()) {
                    promise.resolve(null)
                    return
                }

                val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                val reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                val bytesDownloaded =
                    cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                val totalBytes =
                    cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                val localUriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)
                val localUri = if (localUriIndex >= 0) cursor.getString(localUriIndex) else null

                val result = Arguments.createMap().apply {
                    putInt("status", status)
                    putInt("reason", reason)
                    putDouble("bytesDownloaded", bytesDownloaded.toDouble())
                    putDouble("totalBytes", totalBytes.toDouble())
                    putString("localUri", localUri)
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_QUERY_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun remove(downloadId: Double, promise: Promise) {
        try {
            val context = reactApplicationContext
            val downloadManager =
                context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager

            val removed = downloadManager.remove(downloadId.toLong())
            promise.resolve(removed > 0)
        } catch (e: Exception) {
            promise.reject("DOWNLOAD_REMOVE_ERROR", e.message, e)
        }
    }
}
