import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory relative to this file
// src/services -> src -> .. -> public/uploads
const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Downloads an image from a URL and saves it to local storage
 * @param imageUrl The temporary URL (e.g., from OpenAI)
 * @param prefix Optional prefix for the filename
 * @returns The relative URL path to serve the image (e.g., "/uploads/image-123.png")
 */
export async function saveImageLocally(imageUrl: string, prefix: string = 'img'): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const filename = `${prefix}-${uuidv4()}.png`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.promises.writeFile(filepath, buffer);

    // Return the path relative to the public root
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image locally:', error);
    // Fallback to original URL if download fails (better than nothing, though it will expire)
    return imageUrl;
  }
}

/**
 * Saves a base64 encoded image to local storage
 * Used for gpt-image-1 which returns b64_json instead of URLs
 * @param base64Data The base64 encoded image data
 * @param prefix Optional prefix for the filename
 * @returns The relative URL path to serve the image (e.g., "/uploads/image-123.png")
 */
export async function saveBase64ImageLocally(base64Data: string, prefix: string = 'img'): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${prefix}-${uuidv4()}.png`;
    const filepath = path.join(UPLOADS_DIR, filename);

    await fs.promises.writeFile(filepath, buffer);

    // Return the path relative to the public root
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving base64 image locally:', error);
    throw error;
  }
}
