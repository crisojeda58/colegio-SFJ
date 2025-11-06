
"use client";

import { UploadCloud } from "lucide-react";
import * as React from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { twMerge } from "tailwind-merge";

const variants = {
  base: "relative rounded-lg p-4 w-full flex justify-center items-center flex-col cursor-pointer border-2 border-dashed border-muted-foreground/25",
  active: "border-primary",
  disabled: "bg-muted-foreground/10 cursor-default pointer-events-none",
  accept: "border-green-500",
  reject: "border-red-500",
};

export type FileUploaderProps = {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
};

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);

  const onDrop = React.useCallback((acceptedFiles: File[], rejectedFiles: any) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    } else {
        // Puedes manejar los archivos rechazados aquí si quieres
        setFile(null);
        onFileSelect(null);
    }
  }, [onFileSelect]);
  
  const options: DropzoneOptions = {
    onDrop,
    maxFiles: 1,
    multiple: false,
    disabled,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "image/*": [".jpg", ".jpeg", ".png", ".gif"],
    },
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone(options);

  return (
    <div
      {...getRootProps({
        className: twMerge(
          variants.base,
          isDragActive && variants.active,
          disabled && variants.disabled,
          isDragAccept && variants.accept,
          isDragReject && variants.reject
        ),
      })}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center text-center">
        <UploadCloud className="w-12 h-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold">Arrastra y suelta</span> o haz clic para seleccionar un archivo
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, e imágenes.
        </p>
        {file && (
          <p className="mt-4 text-sm font-medium text-foreground">
            Archivo seleccionado: {file.name}
          </p>
        )}
      </div>
    </div>
  );
}
