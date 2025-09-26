
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, FileText, FileWarning, LoaderCircle, UploadCloud } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CloudinaryResource } from "./actions";
import { getSignedDownloadUrl } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface UserProfile {
  role: string;
}

interface DownloadingState {
    [assetId: string]: boolean;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DocumentsClientPage({ initialDocuments }: { initialDocuments: CloudinaryResource[] }) {
  const [documents, setDocuments] = useState<CloudinaryResource[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [downloading, setDownloading] = useState<DownloadingState>({});
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFileToUpload(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona un archivo para subir.' });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ variant: "destructive", title: "Error de configuración", description: "La configuración de Cloudinary no está completa." });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'intranet_colegio/documentos');
    const publicId = fileToUpload.name.substring(0, fileToUpload.name.lastIndexOf('.')) || fileToUpload.name;
    formData.append('public_id', publicId); 
    formData.append('resource_type', 'raw');

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error?.message || 'La subida del archivo falló.');
      }

      toast({ title: 'Éxito', description: 'El documento ha sido subido correctamente.' });
      setFileToUpload(null);
      setIsDialogOpen(false);
      
      router.refresh();

    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo subir el documento.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: CloudinaryResource) => {
    setDownloading(prev => ({ ...prev, [doc.asset_id]: true }));
    try {
        const { url, error } = await getSignedDownloadUrl(doc.public_id);

        if (error || !url) {
            throw new Error(error || 'No se pudo obtener la URL de descarga.');
        }

        toast({ title: 'Descarga Iniciada', description: `Tu navegador debería empezar a descargar ${doc.filename}.${doc.format}.` });
        // Abrir la URL en una nueva pestaña. El navegador se encargará de la descarga.
        window.open(url, '_blank');

    } catch (err: any) {
        console.error("Download failed", err);
        toast({ variant: "destructive", title: "Error de descarga", description: err.message || "No se pudo descargar el archivo." });
    } finally {
        setDownloading(prev => ({ ...prev, [doc.asset_id]: false }));
    }
  };

  const canUpload = userProfile?.role === 'Admin Intranet';

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-card">Repositorio de Documentos</h1>
            <p className="text-card/80 font-bold mt-2">
                Aquí se listan los documentos oficiales de la plataforma.
            </p>
        </div>
        {canUpload && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UploadCloud className="mr-2 h-4 w-4" />
                Subir Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nuevo Documento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Selecciona un archivo (PDF, DOCX, etc.). Se añadirá a la carpeta 'intranet_colegio/documentos' en Cloudinary. Si subes un archivo con el mismo nombre, se sobrescribirá.
                </p>
                <Input
                  id="document-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {fileToUpload && <p className="text-sm font-medium">Archivo seleccionado: {fileToUpload.name}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isUploading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleUpload} disabled={isUploading || !fileToUpload}>
                  {isUploading && <LoaderCircle className="animate-spin mr-2" />}
                  {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="text-foreground font-bold">Nombre del Documento</TableHead>
              <TableHead className="text-foreground font-bold">Fecha de Subida</TableHead>
              <TableHead className="text-foreground font-bold">Tipo</TableHead>
              <TableHead className="text-foreground font-bold">Tamaño</TableHead>
              <TableHead className="text-right text-foreground font-bold">Descarga</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents && documents.length > 0 ? (
              documents.map((doc: CloudinaryResource) => {
                const isDownloading = downloading[doc.asset_id];
                return (
                    <TableRow key={doc.asset_id} className="hover:bg-muted/50">
                    <TableCell>
                        <FileText className="h-6 w-6 text-primary" />
                    </TableCell>
                    <TableCell className="font-medium">{doc.filename}.{doc.format}</TableCell>
                    <TableCell>
                        {format(new Date(doc.created_at), "dd MMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary">{doc.format.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{formatBytes(doc.bytes)}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                        size="sm" 
                        className="bg-foreground text-background hover:bg-foreground/80"
                        onClick={() => handleDownload(doc)}
                        disabled={isDownloading}
                        >
                        {isDownloading ? (
                            <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {isDownloading ? 'Generando...' : 'Descargar'}
                        </Button>
                    </TableCell>
                    </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <FileWarning className="h-5 w-5 text-muted-foreground" />
                    <span>No se encontraron documentos. Sube uno para empezar.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
