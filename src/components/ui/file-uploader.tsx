'use client';

import { UploadCloud } from 'lucide-react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';

// 1. We've added `accept` and `acceptText` to the props to make the component reusable.
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
  accept, // The new prop for file types
  acceptText, // The new prop for the descriptive text
  ...props
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0] || null;
    setFile(selectedFile);
    onFileSelect(selectedFile);
  };

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    multiple: false,
    disabled,
    // 2. We use the `accept` prop, or default to images if it's not provided.
    accept: accept ?? {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    },
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  // ... (rest of the component is the same)

  return (
    <div
      {...getRootProps()}
      className={twMerge(
        'group relative grid h-48 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/80',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDragActive && "border-primary",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      {
        <div className="flex flex-col items-center justify-center text-center">
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-semibold">Arrastra y suelta</span> o haz clic para seleccionar un archivo
          </p>
          {/* 3. We display the custom `acceptText`, or default to the image text. */}
          <p className="text-xs text-muted-foreground/80 mt-1">
            {acceptText ?? "Solo se aceptan archivos de imagen (JPG, PNG, WEBP, GIF)."}
          </p>
          {file && (
            <p className="mt-4 text-sm font-medium text-foreground">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>
      }
    </div>
  );
}
