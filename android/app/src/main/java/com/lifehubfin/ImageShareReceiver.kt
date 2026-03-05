package com.lifehubfin

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.core.content.FileProvider
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

class ImageShareReceiver : Activity() {

    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private var job: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle the share intent
        handleShareIntent(intent)

        // Finish immediately to avoid showing UI
        finish()
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleShareIntent(it) }
        finish()
    }

    private fun handleShareIntent(intent: Intent) {
        val action = intent.action ?: return
        val type = intent.type

        if (action == Intent.ACTION_SEND && type != null && type.startsWith("image/")) {
            handleImageShare(intent)
        } else {
            showToast("无法识别的图片格式")
        }
    }

    private fun handleImageShare(intent: Intent) {
        job = scope.launch {
            try {
                val imageUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                if (imageUri == null) {
                    withContext(Dispatchers.Main) {
                        showToast("无法获取图片")
                    }
                    return@launch
                }

                // Take persistable URI permission for API 26+
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    contentResolver.takePersistableUriPermission(
                        imageUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                }

                // Copy image to app cache directory
                val cachedImagePath = copyImageToCache(imageUri)

                if (cachedImagePath != null) {
                    withContext(Dispatchers.Main) {
                        showToast("账单已接收，正在解析中...")
                        // Send event to React Native
                        sendEventToReactNative(cachedImagePath)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        showToast("保存失败，请重试")
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showToast("处理失败，请重试")
                }
            }
        }
    }

    private suspend fun copyImageToCache(uri: Uri): String? = withContext(Dispatchers.IO) {
        try {
            // Open input stream from URI
            val inputStream = contentResolver.openInputStream(uri) ?: return@withContext null

            // Generate unique filename
            val timestamp = System.currentTimeMillis()
            val random = UUID.randomUUID().toString().substring(0, 8)
            val fileName = "receipt_${timestamp}_${random}.jpg"

            // Create cache file
            val cacheDir = cacheDir
            val cacheFile = File(cacheDir, fileName)

            // Check file size limit (50MB)
            val fileSize = inputStream.available().toLong()
            if (fileSize > 50 * 1024 * 1024) {
                inputStream.close()
                return@withContext null
            }

            // Decode and compress image
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }

            // First decode to get dimensions (just metadata, no pixel data)
            contentResolver.openInputStream(uri)?.use { inputStream ->
                BitmapFactory.decodeStream(inputStream, null, options)
            }

            // Calculate sample size for max 1200px
            var sampleSize = 1
            val maxDimension = 1200
            if (options.outWidth > maxDimension || options.outHeight > maxDimension) {
                val scale = maxOf(options.outWidth, options.outHeight).toFloat() / maxDimension
                sampleSize = Math.round(scale).coerceAtLeast(1)
            }

            // Decode with sample size
            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
            }

            // Decode the actual image with compression
            val bitmap = contentResolver.openInputStream(uri)?.use { inputStream ->
                BitmapFactory.decodeStream(inputStream, null, decodeOptions)
            }

            if (bitmap != null) {
                // Compress and save to cache
                FileOutputStream(cacheFile).use { outputStream ->
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
                }
                bitmap.recycle()

                // Return file path as content URI for React Native
                val contentUri = FileProvider.getUriForFile(
                    applicationContext,
                    "${packageName}.fileprovider",
                    cacheFile
                )

                // Grant read permission to our own app
                contentResolver.takePersistableUriPermission(
                    contentUri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )

                return@withContext contentUri.toString()
            }

            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }

    private fun sendEventToReactNative(imagePath: String) {
        try {
            val reactContext = (application as? MainApplication)?.reactNativeHost?.reactInstanceManager?.currentReactContext
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("ImageShareReceived", imagePath)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        job?.cancel()
        scope.cancel()
    }
}
