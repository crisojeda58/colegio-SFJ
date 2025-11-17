import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 0.5,             // (max file size in MB)
  maxWidthOrHeight: 1280,     // (max width or height in pixels)
  useWebWorker: true,         // (optional, recommended for performance)
  initialQuality: 0.7,        // (quality between 0 and 1)
  fileType: 'image/webp',     // <<< Force conversion to WebP
};

export async function compressImage(file: File): Promise<File> {
  try {
    console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    
    // The library doesn't automatically rename the file, so we do it here
    const renamedFile = new File([compressedFile], `${file.name.split('.').slice(0, -1).join('.')}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });

    return renamedFile;
  } catch (error) {
    console.error('Error during image compression:', error);
    // If compression fails, return the original file
    return file;
  }
}
