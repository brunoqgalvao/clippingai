import { Storage } from '@google-cloud/storage';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// GCS Configuration
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_PROJECT_ID = process.env.GCP_PROJECT_ID; // Uses GCP_PROJECT_ID from env

// Initialize GCS client (uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
let storage: Storage | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;

function getGCSBucket() {
  if (!storage) {
    storage = new Storage({
      projectId: GCS_PROJECT_ID,
    });
  }
  if (!bucket && GCS_BUCKET_NAME) {
    bucket = storage.bucket(GCS_BUCKET_NAME);
  }
  return bucket;
}

/**
 * Check if GCS is configured
 */
export function isGCSConfigured(): boolean {
  return !!(GCS_BUCKET_NAME && GCS_PROJECT_ID);
}

/**
 * Downloads an image from a URL and saves it to Google Cloud Storage
 * @param imageUrl The temporary URL (e.g., from OpenAI)
 * @param prefix Optional prefix for the filename
 * @returns The public URL to serve the image
 */
export async function saveImageToCloud(imageUrl: string, prefix: string = 'img'): Promise<string> {
  const gcsBucket = getGCSBucket();

  if (!gcsBucket) {
    console.warn('GCS not configured, returning original URL (may expire)');
    return imageUrl;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const filename = `${prefix}-${uuidv4()}.png`;
    const file = gcsBucket.file(`images/${filename}`);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/images/${filename}`;
  } catch (error) {
    console.error('Error saving image to GCS:', error);
    // Fallback to original URL if upload fails
    return imageUrl;
  }
}

/**
 * Saves a base64 encoded image to Google Cloud Storage
 * Used for gpt-image-1 which returns b64_json instead of URLs
 * @param base64Data The base64 encoded image data
 * @param prefix Optional prefix for the filename
 * @returns The public URL to serve the image
 */
export async function saveBase64ImageToCloud(base64Data: string, prefix: string = 'img'): Promise<string> {
  const gcsBucket = getGCSBucket();

  if (!gcsBucket) {
    console.error('GCS not configured, cannot save base64 image');
    throw new Error('Cloud storage not configured');
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${prefix}-${uuidv4()}.png`;
    const file = gcsBucket.file(`images/${filename}`);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/images/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image to GCS:', error);
    throw error;
  }
}

// Legacy function names for backward compatibility
export const saveImageLocally = saveImageToCloud;
export const saveBase64ImageLocally = saveBase64ImageToCloud;
