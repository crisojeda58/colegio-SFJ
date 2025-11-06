
"use client";

import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, PlusCircle, Download, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, onSnapshot, query, deleteDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface StoredFile {
  id: string;
  name: string;
  url: string;
}

export default function FolderContentPage() {
  const router = useRouter();
  const params = useParams();
  const folderId = params?.id as string;
  const { userProfile, getAuthToken } = useAuth(); 

  const { toast } = useToast();
  const [folderName, setFolderName] = React.useState("Cargando...");
  const [files, setFiles] = React.useState<StoredFile[]>([]);
  const [isUploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [fileToUpload, setFileToUpload] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingFile, setEditingFile] = React.useState<StoredFile | null>(null);
  const [newFileName, setNewFileName] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!folderId) return;

    const folderDocRef = doc(db, "docs_folders", folderId);
    const unsubscribeFolder = onSnapshot(folderDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setFolderName(docSnap.data().name);
      } else {
        setFolderName("Carpeta no encontrada");
      }
    });

    const filesQuery = query(collection(folderDocRef, "files"));
    const unsubscribeFiles = onSnapshot(filesQuery, (querySnapshot) => {
      const filesData: StoredFile[] = [];
      querySnapshot.forEach((doc) => {
        filesData.push({ id: doc.id, ...doc.data() } as StoredFile);
      });
      setFiles(filesData);
    });

    return () => {
      unsubscribeFolder();
      unsubscribeFiles();
    };
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
      const { url, name } = result; // Obtenemos la URL y el nombre sanitizado

      const folderDocRef = doc(db, "docs_folders", folderId);
      await addDoc(collection(folderDocRef, "files"), {
        name: name, // Usamos el nombre sanitizado que nos devuelve el servidor
        url: url, 
        createdAt: new Date(),
      });

      toast({ title: "¡Éxito!", description: `El archivo "${name}" se ha subido.` });

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

  const handleEdit = (file: StoredFile) => {
    setEditingFile(file);
    setNewFileName(file.name);
    setEditDialogOpen(true);
  };
  
  const handleUpdateFileName = async () => {
    if (!editingFile || !newFileName.trim()) return;

    const fileDocRef = doc(db, `docs_folders/${folderId}/files`, editingFile.id);

    try {
        await updateDoc(fileDocRef, { name: newFileName.trim() });
        toast({ title: "Éxito", description: "El nombre del archivo ha sido actualizado." });
        setEditDialogOpen(false);
        setEditingFile(null);
    } catch (error: any) {
        console.error("Error actualizando el nombre del archivo:", error);
        toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
    }
  };
  
  const handleDelete = async (file: StoredFile) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar \"${file.name}\"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const authToken = await getAuthToken();
    if (!authToken) {
        toast({ variant: "destructive", title: "Error de autenticación" });
        return;
    }

    const filePath = decodeURIComponent(file.url.split("/documentos/").pop() || "");
    if (!filePath) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo obtener la ruta del archivo." });
        return;
    }

    try {
        const response = await fetch("/api/documents/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ filePath }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "No se pudo eliminar el archivo de Supabase.");
        }

        const fileDocRef = doc(db, `docs_folders/${folderId}/files`, file.id);
        await deleteDoc(fileDocRef);

        toast({ title: "Éxito", description: `El archivo \"${file.name}\" ha sido eliminado.` });

    } catch (error: any) {
        console.error("Error eliminando el archivo:", error);
        toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  return (
    <div className="container mx-auto">
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Nombre del Archivo</DialogTitle>
                    <DialogDescription>
                      Aquí puedes cambiar el nombre del archivo. Haz clic en Guardar Cambios cuando termines.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Label htmlFor="new-file-name">Nuevo nombre</Label>
                    <Input id="new-file-name" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleUpdateFileName}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
                 <DialogDescription>
                  Selecciona un archivo de tu computador para subirlo a esta carpeta.
                </DialogDescription>
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
                        <TableCell>
                            <div className="flex justify-end items-center gap-2">
                                <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Descargar
                                    </Button>
                                </a>
                                {userProfile?.role === 'Admin Intranet' && (
                                    <>
                                    <Button size="sm" onClick={() => handleEdit(file)} className="bg-yellow-400 text-black hover:bg-yellow-500">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(file)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                    </>
                                )}
                            </div>
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
