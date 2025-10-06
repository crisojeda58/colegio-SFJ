"use client";

import * as React from "react";
import { Folder, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { collection, addDoc, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Folder as FolderType } from "@/types/folder";
import Link from "next/link";

export default function DocumentosPage() {
  const [folders, setFolders] = React.useState<FolderType[]>([]);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [newFolderImageUrl, setNewFolderImageUrl] = React.useState("");
  const [isCreateFolderOpen, setCreateFolderOpen] = React.useState(false);

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

  const handleCreateFolder = async () => {
    if (newFolderName.trim() !== "" && newFolderImageUrl.trim() !== "") {
      await addDoc(collection(db, "docs_folders"), {
        name: newFolderName,
        imageUrl: newFolderImageUrl,
      });
      setNewFolderName("");
      setNewFolderImageUrl("");
      setCreateFolderOpen(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold text-card">Documentos</h1>
        <Dialog open={isCreateFolderOpen} onOpenChange={setCreateFolderOpen}>
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
                />
              </div>
              <div>
                <Label htmlFor="folder-image-url">URL de la imagen</Label>
                <Input
                  id="folder-image-url"
                  value={newFolderImageUrl}
                  onChange={(e) => setNewFolderImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.png"
                />
              </div>
            </div>
            <Button onClick={handleCreateFolder}>Crear Carpeta</Button>
          </DialogContent>
        </Dialog>
      </div>

      <main className="flex-1 bg-transparent">
        <section>
          <h2 className="text-xl font-bold mb-4 text-white">Carpetas</h2>
          {folders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {folders.map((folder) => (
                <Link href={`/documentos/${folder.id}`} key={folder.id}>
                  <Card
                    className="cursor-pointer transform transition-transform duration-200 hover:scale-[1.02] overflow-hidden group hover:border-primary"
                  >
                    <CardHeader>
                      <div className="relative w-full h-32">
                        <img
                          src={folder.imageUrl}
                          alt={folder.name}
                          className="w-full h-full object-cover rounded-md"
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