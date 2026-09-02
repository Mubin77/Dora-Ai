package ai.dora.companion

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.HandlerThread
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

/**
 * Manages native Android MediaProjection screen capture pipeline.
 * Extracts frames at optimal intervals, downscales to lightweight JPEG Base64,
 * and feeds the visual stream into Dora's Live Session.
 */
class DoraScreenCaptureManager private constructor() {

    companion object {
        private const val TAG = "DoraScreenCaptureMgr"
        private const val TARGET_MAX_WIDTH = 720
        private const val FRAME_INTERVAL_MS = 1200L // ~1 frame every 1.2s for optimal Live Session latency & bandwidth

        @Volatile
        private var instance: DoraScreenCaptureManager? = null

        fun getInstance(): DoraScreenCaptureManager {
            return instance ?: synchronized(this) {
                instance ?: DoraScreenCaptureManager().also { instance = it }
            }
        }
    }

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var handlerThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null

    private var isCapturing = false
    private var lastFrameTime = 0L
    private var lastFrameHash = 0L

    @Synchronized
    fun isCapturing(): Boolean = isCapturing

    /**
     * Begins native screen capture using approved MediaProjection intent results
     */
    @Synchronized
    fun startCapture(
        resultCode: Int,
        data: Intent,
        activity: MainActivity,
        onResult: (Boolean, String?) -> Unit
    ) {
        if (isCapturing) {
            Log.i(TAG, "Screen capture already active")
            onResult(true, "Screen capture already active")
            return
        }

        try {
            // 1. Start required Android foreground service
            DoraScreenCaptureService.start(activity)

            // 2. Obtain MediaProjection instance
            val projectionManager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
            if (projectionManager == null) {
                onResult(false, "MediaProjectionManager unavailable")
                return
            }

            val projection = projectionManager.getMediaProjection(resultCode, data)
            if (projection == null) {
                onResult(false, "Failed to initialize MediaProjection token")
                return
            }
            this.mediaProjection = projection

            // 3. Register required projection callback for lifecycle & revocation safety
            val thread = HandlerThread("DoraScreenCaptureBackgroundThread").apply { start() }
            this.handlerThread = thread
            val handler = Handler(thread.looper)
            this.backgroundHandler = handler

            projection.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() {
                    Log.i(TAG, "MediaProjection stopped by system or user revocation")
                    stopCapture(activity)
                    activity.runOnUiThread {
                        activity.notifyScreenCaptureStopped()
                    }
                }
            }, handler)

            // 4. Compute display dimensions & density
            val displayMetrics = activity.resources.displayMetrics
            val rawWidth = displayMetrics.widthPixels
            val rawHeight = displayMetrics.heightPixels
            val densityDpi = displayMetrics.densityDpi

            // Scale to target width maintaining aspect ratio
            val scale = if (rawWidth > TARGET_MAX_WIDTH) TARGET_MAX_WIDTH.toFloat() / rawWidth.toFloat() else 1.0f
            val captureWidth = (rawWidth * scale).toInt()
            val captureHeight = (rawHeight * scale).toInt()

            Log.i(TAG, "Starting screen capture: display=${rawWidth}x${rawHeight} scaled=${captureWidth}x${captureHeight} dpi=$densityDpi")

            // 5. Initialize ImageReader with RGBA_8888 buffer
            val reader = ImageReader.newInstance(captureWidth, captureHeight, PixelFormat.RGBA_8888, 2)
            this.imageReader = reader

            reader.setOnImageAvailableListener({ imageReaderInstance ->
                handleImageAvailable(imageReaderInstance, captureWidth, captureHeight, activity)
            }, handler)

            // 6. Create VirtualDisplay mirroring display to ImageReader surface
            val display = projection.createVirtualDisplay(
                "DoraScreenCaptureVirtualDisplay",
                captureWidth,
                captureHeight,
                densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                handler
            )
            this.virtualDisplay = display
            this.isCapturing = true

            Log.i(TAG, "Native screen capture successfully initialized and active")
            onResult(true, null)
        } catch (e: Exception) {
            Log.e(TAG, "Exception initializing screen capture", e)
            stopCapture(activity)
            onResult(false, e.message ?: "Failed to start native screen capture")
        }
    }

    /**
     * Extracts and processes captured frames from ImageReader buffer
     */
    private fun handleImageAvailable(
        reader: ImageReader,
        width: Int,
        height: Int,
        activity: MainActivity
    ) {
        var image: Image? = null
        try {
            image = reader.acquireLatestImage()
            if (image == null || !isCapturing) return

            val now = System.currentTimeMillis()
            if (now - lastFrameTime < FRAME_INTERVAL_MS) {
                // Throttle to respect frame interval
                return
            }

            val planes = image.planes
            if (planes.isEmpty()) return

            val buffer: ByteBuffer = planes[0].buffer
            val pixelStride: Int = planes[0].pixelStride
            val rowStride: Int = planes[0].rowStride
            val rowPadding: Int = rowStride - pixelStride * width

            // Create bitmap from buffer
            val tempBitmap = Bitmap.createBitmap(
                width + rowPadding / pixelStride,
                height,
                Bitmap.Config.ARGB_8888
            )
            tempBitmap.copyPixelsFromBuffer(buffer)

            val cleanBitmap = if (rowPadding > 0) {
                Bitmap.createBitmap(tempBitmap, 0, 0, width, height)
            } else {
                tempBitmap
            }

            // Quick change detection hash via sample pixels
            val sampleHash = calculateQuickFrameHash(cleanBitmap, width, height)
            val hasChanged = sampleHash != lastFrameHash || (now - lastFrameTime > 4500L)

            if (hasChanged) {
                lastFrameHash = sampleHash
                lastFrameTime = now

                // Compress to compact JPEG Base64
                val outputStream = ByteArrayOutputStream()
                cleanBitmap.compress(Bitmap.CompressFormat.JPEG, 72, outputStream)
                val jpegBytes = outputStream.toByteArray()
                val base64Jpeg = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)

                activity.runOnUiThread {
                    activity.notifyScreenFrameCaptured(base64Jpeg)
                }
            }

            if (cleanBitmap != tempBitmap && !tempBitmap.isRecycled) {
                tempBitmap.recycle()
            }
            if (!cleanBitmap.isRecycled) {
                cleanBitmap.recycle()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error acquiring or processing screen image: ${e.message}")
        } finally {
            try {
                image?.close()
            } catch (e: Exception) {}
        }
    }

    private fun calculateQuickFrameHash(bitmap: Bitmap, width: Int, height: Int): Long {
        var hash = 17L
        val stepX = (width / 8).coerceAtLeast(1)
        val stepY = (height / 8).coerceAtLeast(1)
        for (y in 0 until height step stepY) {
            for (x in 0 until width step stepX) {
                val pixel = bitmap.getPixel(x, y)
                hash = hash * 31L + pixel.toLong()
            }
        }
        return hash
    }

    /**
     * Cleanly stops screen capture and releases all projection & display resources
     */
    @Synchronized
    fun stopCapture(context: Context) {
        if (!isCapturing && mediaProjection == null) {
            return
        }
        Log.i(TAG, "Stopping native screen capture and releasing resources")
        isCapturing = false

        try {
            virtualDisplay?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing VirtualDisplay: ${e.message}")
        }
        virtualDisplay = null

        try {
            imageReader?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing ImageReader: ${e.message}")
        }
        imageReader = null

        try {
            mediaProjection?.stop()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping MediaProjection: ${e.message}")
        }
        mediaProjection = null

        try {
            handlerThread?.quitSafely()
        } catch (e: Exception) {
            Log.w(TAG, "Error quitting capture thread: ${e.message}")
        }
        handlerThread = null
        backgroundHandler = null

        // Stop foreground service
        try {
            DoraScreenCaptureService.stop(context)
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping DoraScreenCaptureService: ${e.message}")
        }

        lastFrameHash = 0L
        lastFrameTime = 0L
        Log.i(TAG, "Native screen capture resources successfully cleaned up")
    }
}
