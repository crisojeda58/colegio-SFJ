'use client';

import { UploadCloud } from 'lucide-react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';
import { compressImage } from '@/utils/image-compressor'; // Import the compressor

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  accept?: DropzoneOptions['accept'];
  acceptText?: string;
}

export function FileUploader({
  onFileSelect,
  className,
  disabled,
  accept,
  acceptText,
  ...props
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false); // State for loading indicator

  const onDrop = async (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0] || null;
    if (!selectedFile) {
      setFile(null);
      onFileSelect(null);
      return;
    }

    // Check if the file is an image before compressing
    const isImage = selectedFile.type.startsWith('image/');
    if (isImage) {
      setIsCompressing(true);
      try {
        const compressedFile = await compressImage(selectedFile);
        setFile(compressedFile);
        onFileSelect(compressedFile);
      } catch (error) {
        console.error("Compression failed, using original file:", error);
        setFile(selectedFile);
        onFileSelect(selectedFile);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // If it's not an image, just use the original file
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    multiple: false,
    disabled: disabled || isCompressing, // Disable dropzone while compressing
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
        'group relative grid h-48 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/80',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragActive && "border-primary",
        (disabled || isCompressing) && "cursor-not-allowed opacity-50", // Style for disabled state
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      {
        isCompressing ? (
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-foreground">Comprimiendo imagen...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <UploadCloud className="w-12 h-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold">Arrastra y suelta</span> o haz clic para seleccionar un archivo
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {acceptText ?? "Solo se aceptan archivos de imagen (JPG, PNG, WEBP, GIF)."}
            </p>
            {file && (
              <p className="mt-4 text-sm font-medium text-foreground">
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>
        )
      }
    </div>
  );
}
