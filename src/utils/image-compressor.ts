import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1, // (max file size in MB)
  maxWidthOrHeight: 1920, // (max width or height in pixels)
  useWebWorker: true, // (optional, recommended for performance)
};

export async function compressImage(file: File): Promise<File> {
  try {
    console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error during image compression:', error);
    // If compression fails, return the original file
    return file;
  }
}
