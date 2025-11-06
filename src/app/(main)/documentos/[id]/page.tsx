
"use client";

import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, PlusCircle, Download, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, addDoc, onSnapshot, query, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from '@/lib/supabase'; // Import Supabase client for deletion

interface StoredFile {
  id: string;
  name: string;
  url: string;
}

export default function FolderContentPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;
  const { userProfile, getAuthToken } = useAuth(); // Get getAuthToken from context

  const { toast } = useToast();
  const [folderName, setFolderName] = React.useState("Cargando...");
  const [files, setFiles] = React.useState<StoredFile[]>([]);
  const [isUploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [fileToUpload, setFileToUpload] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!folderId) return;

    const folderDocRef = doc(db, "docs_folders", folderId);
    getDoc(folderDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        setFolderName(docSnap.data().name);
      } else {
        setFolderName("Carpeta no encontrada");
      }
    });

    const filesQuery = query(collection(folderDocRef, "files"));
    const unsubscribe = onSnapshot(filesQuery, (querySnapshot) => {
      const filesData: StoredFile[] = [];
      querySnapshot.forEach((doc) => {
        filesData.push({ id: doc.id, ...doc.data() } as StoredFile);
      });
      setFiles(filesData);
    });

    return () => unsubscribe();
  }, [folderId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFileToUpload(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload) {
      toast({ variant: "destructive", title: "No se ha seleccionado ningún archivo" });
      return;
    }

    const authToken = await getAuthToken();
    if (!authToken) {
      toast({ variant: "destructive", title: "Error de autenticación" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Llama a nuestra API segura
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falló la subida del archivo.");
      }

      const result = await response.json();
      const { url } = result;

      // Guarda la información del archivo en Firestore
      const folderDocRef = doc(db, "docs_folders", folderId);
      await addDoc(collection(folderDocRef, "files"), {
        name: fileToUpload.name,
        url: url, // La URL devuelta por nuestra API
        createdAt: new Date(),
      });

      toast({ title: "¡Éxito!", description: `El archivo "${fileToUpload.name}" se ha subido.` });

      setFileToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadDialogOpen(false);
    } catch (error: any) {
      console.error("Error subiendo el archivo:", error);
      toast({ variant: "destructive", title: "Error al subir el archivo", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Button className="bg-white text-black hover:bg-white" onClick={() => router.push('/documentos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
        {userProfile?.role === "Admin Intranet" && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2" />
                Subir Archivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nuevo Archivo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="file-upload">Selecciona un archivo</Label>
                  <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
              </div>
              <Button onClick={handleUpload} disabled={!fileToUpload || isUploading}>
                {isUploading ? "Subiendo..." : "Subir Archivo"}
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <h1 className="text-3xl font-bold text-card mb-4">{folderName}</h1>

      <main className="flex-1 bg-transparent">
        <section>
          <h2 className="text-xl font-bold mb-4 text-white">Archivos</h2>
          {files.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Archivo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium flex items-center">
                          <FileText className="w-5 h-5 mr-3 text-muted-foreground" />
                          {file.name}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Download className="mr-2 h-4 w-4" />
                              Descargar
                            </Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No hay archivos en esta carpeta.</p>
                  <p>Sube tu primer archivo para empezar.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
