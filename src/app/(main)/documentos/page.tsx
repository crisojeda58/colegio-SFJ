
"use client";

import * as React from "react";
import { Folder, PlusCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, addDoc, onSnapshot, query, doc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Folder as FolderType } from "@/types/folder";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { FileUploader } from "@/components/ui/file-uploader";
import { useToast } from "@/hooks/use-toast";

export default function DocumentosPage() {
  const [folders, setFolders] = React.useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderImage, setNewFolderImage] = React.useState<File | null>(null);
  const [isCreateFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleteMode, setDeleteMode] = React.useState(false);
  
  const { userProfile, getAuthToken } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    const q = query(collection(db, "docs_folders"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const foldersData: FolderType[] = [];
      querySnapshot.forEach((doc) => {
        foldersData.push({ id: doc.id, ...doc.data() } as FolderType);
      });
      setFolders(foldersData);
    });

    return () => unsubscribe();
  }, []);

  const resetCreateDialog = () => {
    setNewFolderName("");
    setNewFolderImage(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !newFolderImage) {
      toast({ variant: "destructive", title: "Faltan campos", description: "Por favor, asigna un nombre y una imagen a la carpeta." });
      return;
    }

    setIsSubmitting(true);
    const authToken = await getAuthToken();
    if (!authToken) {
      toast({ variant: "destructive", title: "Error de autenticación" });
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", newFolderImage);

      const response = await fetch("/api/documents/folder/upload", { // New endpoint
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falló la subida de la imagen.");
      }

      const { url: imageUrl } = await response.json();

      await addDoc(collection(db, "docs_folders"), {
        name: newFolderName,
        imageUrl: imageUrl,
        createdAt: new Date(),
      });

      toast({ title: "¡Éxito!", description: `La carpeta "${newFolderName}" se ha creado.` });
      
      resetCreateDialog();
      setCreateFolderOpen(false);
    } catch (error: any) {
      console.error("Error creando la carpeta:", error);
      toast({ variant: "destructive", title: "Error al crear", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteFolder = async (folder: FolderType) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la carpeta "${folder.name}"? Esto eliminará TODOS sus archivos. ¡Esta acción es irreversible!`)) {
        return;
    }

    const authToken = await getAuthToken();
    if (!authToken) {
        toast({ variant: "destructive", title: "Error de autenticación" });
        return;
    }

    try {
        // API call to delete folder image and contained files from Supabase
        const response = await fetch("/api/documents/folder/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ folderId: folder.id, folderImageUrl: folder.imageUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "No se pudo eliminar la carpeta en el servidor.");
        }

        // Use a batch write to delete Firestore documents atomically
        const batch = writeBatch(db);
        const folderRef = doc(db, "docs_folders", folder.id);
        const filesSnapshot = await getDocs(collection(folderRef, "files"));

        filesSnapshot.forEach(fileDoc => {
            batch.delete(fileDoc.ref);
        });

        batch.delete(folderRef);
        await batch.commit();

        toast({ title: "Carpeta Eliminada", description: `La carpeta "${folder.name}" y todos sus contenidos han sido eliminados.` });

    } catch (error: any) {
        console.error("Error eliminando la carpeta:", error);
        toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };


  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-card">Documentos</h1>
        {userProfile?.role === "Admin Intranet" && (
          <div className="flex gap-2">
            <Dialog open={isCreateFolderOpen} onOpenChange={(isOpen) => { setCreateFolderOpen(isOpen); if (!isOpen) resetCreateDialog(); }}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2" />
                  Nueva Carpeta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Carpeta</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="folder-name">Nombre de la carpeta</Label>
                    <Input
                      id="folder-name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Ej: Documentos Importantes"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label>Imagen de la carpeta</Label>
                    <FileUploader onFileSelect={setNewFolderImage} disabled={isSubmitting}/>
                  </div>
                </div>
                <DialogFooter>
                   <Button variant="outline" onClick={() => setCreateFolderOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                   <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || !newFolderImage || isSubmitting}>
                    {isSubmitting ? "Creando..." : "Crear Carpeta"}
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant={isDeleteMode ? "secondary" : "destructive"} onClick={() => setDeleteMode(!isDeleteMode)}>
                <Trash2 className="mr-2" />
                {isDeleteMode ? "Cancelar" : "Eliminar Carpetas"}
            </Button>
          </div>
        )}
      </div>
      <main className="flex-1 bg-transparent">
        <section>
          <h2 className="text-xl font-bold mb-4 text-white">Carpetas</h2>
          {folders.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {folders.map((folder) => (
                <div key={folder.id} className="relative">
                     <Link
                       href={`/documentos/${folder.id}`}
                       className={`${isDeleteMode ? 'pointer-events-none' : ''}`}>

                       <Card
                           className="cursor-pointer transform transition-transform duration-200 hover:scale-[1.02] overflow-hidden group hover:border-primary"
                       >
                           <CardHeader>
                           <div className="relative w-full h-32">
                               <Image
                               src={folder.imageUrl}
                               alt={folder.name}
                               fill
                               style={{ objectFit: 'cover' }}
                               className="rounded-md"
                               quality={75}
                               />
                           </div>
                           </CardHeader>
                           <CardContent>
                           <div className="flex items-center text-foreground">
                               <Folder className="w-5 h-5 mr-2 text-muted-foreground" />
                               <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-primary">
                               {folder.name}
                               </span>
                           </div>
                           </CardContent>
                       </Card>

                     </Link>
                    {isDeleteMode && (
                        <Button 
                            variant="destructive" 
                            size="icon"
                            className="absolute top-2 right-2 z-10 rounded-full h-8 w-8"
                            onClick={() => handleDeleteFolder(folder)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-4" />
                  <p>No hay carpetas.</p>
                  <p>Crea tu primera carpeta para empezar.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
