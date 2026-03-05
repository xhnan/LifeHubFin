package com.lifehubfin

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.facebook.react.bridge.*
import java.io.File

class ImageHandlerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val sharedImages = mutableListOf<String>()
    private val context: Context = reactContext.applicationContext

    override fun getName(): String = "ImageHandler"

    @ReactMethod
    fun getLastSharedImage(promise: Promise) {
        try {
            if (sharedImages.isEmpty()) {
                promise.resolve(null)
            } else {
                // Return the most recent shared image
                val imagePath = sharedImages.last()
                promise.resolve(imagePath)
            }
        } catch (e: Exception) {
            promise.reject("GET_IMAGE_ERROR", "Failed to get shared image", e)
        }
    }

    @ReactMethod
    fun clearSharedImage(promise: Promise) {
        try {
            if (sharedImages.isNotEmpty()) {
                val imagePath = sharedImages.removeAt(sharedImages.size - 1)

                // Try to delete the cached file
                try {
                    val uri = Uri.parse(imagePath)
                    val path = getFilePathFromUri(uri)
                    if (path != null) {
                        val file = File(path)
                        if (file.exists()) {
                            file.delete()
                        }
                    }
                } catch (e: Exception) {
                    // Ignore deletion errors
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CLEAR_IMAGE_ERROR", "Failed to clear shared image", e)
        }
    }

    @ReactMethod
    fun getAllSharedImages(promise: Promise) {
        try {
            val images = Arguments.makeNativeArray(sharedImages.toList())
            promise.resolve(images)
        } catch (e: Exception) {
            promise.reject("GET_ALL_IMAGES_ERROR", "Failed to get all shared images", e)
        }
    }

    @ReactMethod
    fun saveSharedImage(uri: String, promise: Promise) {
        try {
            sharedImages.add(uri)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SAVE_IMAGE_ERROR", "Failed to save shared image", e)
        }
    }

    private fun getFilePathFromUri(uri: Uri): String? {
        return try {
            when (uri.scheme) {
                "file" -> uri.path
                "content" -> {
                    // For content URIs, try to get the file path
                    val projection = arrayOf(MediaStore.Images.Media.DATA)
                    val cursor = context.contentResolver.query(uri, projection, null, null, null)
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val columnIndex = it.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)
                            it.getString(columnIndex)
                        } else {
                            null
                        }
                    }
                }
                else -> null
            }
        } catch (e: Exception) {
            null
        }
    }
}
