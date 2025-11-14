'use client';

import { UploadCloud } from 'lucide-react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import { compressImage } from '@/utils/image-compressor'; // Import the compressor

interface FileUploaderGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  accept?: DropzoneOptions['accept'];
  acceptText?: string;
}

export function FileUploaderGallery({
  onFileSelect,
  className,
  disabled,
  multiple = true,
  accept,
  acceptText,
  ...props
}: FileUploaderGalleryProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) {
      setFiles([]);
      onFileSelect([]);
      return;
    }

    setIsCompressing(true);
    try {
      const compressionPromises = acceptedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return compressImage(file);
        } else {
          return Promise.resolve(file); // Return non-image files as is
        }
      });

      const compressedFiles = await Promise.all(compressionPromises);
      setFiles(compressedFiles);
      onFileSelect(compressedFiles);

    } catch (error) {
      console.error("Error during bulk image compression:", error);
      // Fallback to original files in case of an error
      setFiles(acceptedFiles);
      onFileSelect(acceptedFiles);
    } finally {
      setIsCompressing(false);
    }
  };

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    multiple,
    disabled: disabled || isCompressing,
    accept: accept ?? {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  return (
    <div
      {...getRootProps()}
      className={twMerge(
        'group relative grid h-auto min-h-[12rem] w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/80',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragActive && "border-primary",
        (disabled || isCompressing) && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center py-4">
        {isCompressing ? (
          <div>
            <p className="text-sm font-medium text-foreground">Comprimiendo imágenes...</p>
            <p className="text-xs text-muted-foreground">Esto puede tardar un momento.</p>
          </div>
        ) : (
          <>
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold">Arrastra y suelta</span> o haz clic para seleccionar archivos
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {acceptText ?? "Solo se aceptan archivos de imagen (JPG, PNG, WEBP, GIF)."}
            </p>
          </>
        )}
        {files.length > 0 && !isCompressing && (
          <div className="mt-4 text-sm font-medium text-foreground text-left">
            <p className="font-semibold">Archivos listos para subir:</p>
            <ul className="list-disc list-inside">
              {files.map((file, index) => (
                <li key={index} className="truncate">{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
