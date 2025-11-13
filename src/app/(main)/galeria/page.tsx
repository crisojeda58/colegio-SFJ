
"use client";

import * as React from "react";
import {
  ChevronRight,
  Image as ImageIcon,
  PlusCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FileUploaderGallery } from "@/components/ui/file-uploader-gallery";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import Image from "next/image";

// --- Interfaces ---
interface Album {
  id: string;
  name: string;
}

interface Photo {
  id: string;
  url: string;
  alt: string;
  createdAt: any;
}

// --- Main Page Component ---
export default function GalleryFinalPage() {
  const { userProfile, getAuthToken } = useAuth();
  const { toast } = useToast();

  // --- State Management ---
  const [albums, setAlbums] = React.useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = React.useState<Album | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [loadingAlbums, setLoadingAlbums] = React.useState(true);
  const [loadingPhotos, setLoadingPhotos] = React.useState(false);

  // --- Admin States ---
  const [isCreateAlbumOpen, setCreateAlbumOpen] = React.useState(false);
  const [newAlbumName, setNewAlbumName] = React.useState("");
  const [isSubmittingAlbum, setIsSubmittingAlbum] = React.useState(false);
  const [albumToDelete, setAlbumToDelete] = React.useState<Album | null>(null);
  const [isUploadPhotoOpen, setUploadPhotoOpen] = React.useState(false);
  const [photosToUpload, setPhotosToUpload] = React.useState<File[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = React.useState(false);
  const [photoToDelete, setPhotoToDelete] = React.useState<Photo | null>(null);

  // --- Data Fetching ---
  React.useEffect(() => {
    setLoadingAlbums(true);
    const q = query(collection(db, "photoAlbums"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const albumsData: Album[] = [];
      querySnapshot.forEach((doc) => {
        albumsData.push({ id: doc.id, ...doc.data() } as Album);
      });
      setAlbums(albumsData);
      setLoadingAlbums(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (selectedAlbum) {
      setLoadingPhotos(true);
      const q = query(
        collection(db, `photoAlbums/${selectedAlbum.id}/photos`),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const photosData: Photo[] = [];
        querySnapshot.forEach((doc) => {
          photosData.push({ id: doc.id, ...doc.data() } as Photo);
        });
        setPhotos(photosData);
        setLoadingPhotos(false);
      });
      return () => unsubscribe();
    } else {
      setPhotos([]);
    }
  }, [selectedAlbum]);

  // --- Album Handlers ---
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      toast({
        variant: "destructive",
        title: "Falta el nombre",
        description: "Por favor, asigna un nombre al álbum.",
      });
      return;
    }
    setIsSubmittingAlbum(true);
    try {
      const newAlbumRef = await addDoc(collection(db, "photoAlbums"), {
        name: newAlbumName,
        createdAt: new Date(),
      });
      toast({
        title: "¡Éxito!",
        description: `El álbum "${newAlbumName}" se ha creado.`,
      });
      setNewAlbumName("");
      setCreateAlbumOpen(false);
      setSelectedAlbum({ id: newAlbumRef.id, name: newAlbumName });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear",
        description: error.message,
      });
    } finally {
      setIsSubmittingAlbum(false);
    }
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    const authToken = await getAuthToken();
    if (!authToken) {
      toast({ variant: "destructive", title: "Error de autenticación" });
      return;
    }
    try {
      const response = await fetch("/api/gallery/album/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ albumId: albumToDelete.id }),
      });
      if (!response.ok)
        throw new Error("No se pudo eliminar el álbum en el servidor.");

      toast({
        title: "Álbum Eliminado",
        description: `El álbum "${albumToDelete.name}" ha sido eliminado.`,
      });
      if (selectedAlbum?.id === albumToDelete.id) {
        setSelectedAlbum(null);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message,
      });
    } finally {
      setAlbumToDelete(null);
    }
  };

  // --- Photo Handlers ---
  const handleUploadPhotos = async () => {
    if (photosToUpload.length === 0 || !selectedAlbum) return;
    setIsUploadingPhotos(true);
    const authToken = await getAuthToken();
    if (!authToken) {
      toast({ variant: "destructive", title: "Error de autenticación" });
      setIsUploadingPhotos(false);
      return;
    }

    toast({
      title: "Subiendo fotos...",
      description: `Se están subiendo ${photosToUpload.length} foto(s).`,
    });

    const uploadPromises = photosToUpload.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("albumId", selectedAlbum.id);

      const response = await fetch("/api/gallery/photo/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      if (!response.ok) {
        console.error(`Failed to upload ${file.name}`);
        return null;
      }
      return response.json();
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((result) => result !== null);

    if (successfulUploads.length > 0) {
      const batch = writeBatch(db);
      successfulUploads.forEach((upload) => {
        const photoRef = doc(
          collection(db, `photoAlbums/${selectedAlbum.id}/photos`)
        );
        batch.set(photoRef, {
          url: upload.url,
          alt: "",
          createdAt: new Date(),
        });
      });
      await batch.commit();
    }

    toast({
      title: "Subida completada",
      description: `${successfulUploads.length} de ${photosToUpload.length} fotos se subieron correctamente.`,
    });
    setPhotosToUpload([]);
    setUploadPhotoOpen(false);
    setIsUploadingPhotos(false);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete || !selectedAlbum) return;
    const authToken = await getAuthToken();
    if (!authToken) {
      toast({ variant: "destructive", title: "Error de autenticación" });
      return;
    }

    try {
      const response = await fetch("/api/gallery/photo/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          albumId: selectedAlbum.id,
          photoId: photoToDelete.id,
          photoUrl: photoToDelete.url,
        }),
      });
      if (!response.ok)
        throw new Error("No se pudo eliminar la foto en el servidor.");

      toast({
        title: "Foto Eliminada",
        description: "La foto ha sido eliminada correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message,
      });
    } finally {
      setPhotoToDelete(null);
    }
  };

  return (
    <>
      <div className="container mx-auto h-[calc(100vh-120px)] flex gap-8 py-6">
        {/* --- Sidebar --- */}
        <aside className="w-1/4 lg:w-1/5 xl:w-1/6 flex flex-col border-r pr-6">
          <h3 className="text-3xl font-bold mb-4">
            <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
              Álbumes
            </span>
          </h3>
          <div className="flex-1 overflow-y-auto -mr-6 pr-6">
            {loadingAlbums ? (
              <p className="text-muted-foreground text-sm">Cargando...</p>
            ) : albums.length > 0 ? (
              <ul className="space-y-2">
                {albums.map((album) => (
                  <li key={album.id} className="relative group">
                    <button
                      onClick={() => setSelectedAlbum(album)}
                      className={cn(
                        "w-full text-left p-2 rounded-md flex items-center justify-between transition-colors",
                        selectedAlbum?.id === album.id
                          ? "bg-secondary text-secondary-foreground" // Use gray for selected
                          : "bg-muted text-muted-foreground" // Use lighter gray for non-selected
                      )}
                    >
                      <span className="truncate font-medium text-sm">
                        {album.name}
                      </span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0" />
                    </button>
                    {userProfile?.role === "Admin Intranet" && (
                      <button
                        onClick={() => setAlbumToDelete(album)}
                        className="absolute top-1/2 -translate-y-1/2 right-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay álbumes creados.
              </p>
            )}
          </div>
          {userProfile?.role === "Admin Intranet" && (
            <div className="mt-4 pt-4 border-t">
              <Dialog
                open={isCreateAlbumOpen}
                onOpenChange={setCreateAlbumOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Álbum
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Álbum</DialogTitle>
                  </DialogHeader>
                  <Input
                    id="album-name"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Nombre del álbum"
                    disabled={isSubmittingAlbum}
                    className="mt-4"
                  />
                  <DialogFooter className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCreateAlbumOpen(false)}
                      disabled={isSubmittingAlbum}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateAlbum}
                      disabled={!newAlbumName.trim() || isSubmittingAlbum}
                    >
                      {isSubmittingAlbum ? "Creando..." : "Crear Álbum"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-1 flex flex-col">
          {!selectedAlbum ? (
            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg">
              <div className="text-center text-foreground">
                <ImageIcon className="mx-auto h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">Selecciona un álbum</h3>
                <p>Elige un álbum de la lista para ver sus fotos.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h1
                  className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md"
                  title={selectedAlbum.name}
                >
                  {selectedAlbum.name}
                </h1>
                {userProfile?.role === "Admin Intranet" && (
                  <Dialog
                    open={isUploadPhotoOpen}
                    onOpenChange={setUploadPhotoOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <UploadCloud className="mr-2 h-4 w-4" /> Subir Fotos
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Subir Fotos a "{selectedAlbum.name}"
                        </DialogTitle>
                      </DialogHeader>
                      <FileUploaderGallery
                        onFileSelect={(files) => setPhotosToUpload(files)}
                        multiple
                        disabled={isUploadingPhotos}
                      />
                      <DialogFooter className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setUploadPhotoOpen(false)}
                          disabled={isUploadingPhotos}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleUploadPhotos}
                          disabled={
                            photosToUpload.length === 0 || isUploadingPhotos
                          }
                        >
                          {isUploadingPhotos
                            ? "Subiendo..."
                            : `Subir ${photosToUpload.length} Foto(s)`}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {loadingPhotos ? (
                <p className="text-muted-foreground text-center">
                  Cargando fotos...
                </p>
              ) : photos.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {photos.map((photo) => (
                      <Card
                        key={photo.id}
                        className="overflow-hidden group relative aspect-square"
                      >
                        <Image
                          src={photo.url}
                          alt={photo.alt || "Foto del álbum"}
                          width={400}
                          height={400}
                          className="object-cover w-full h-full"
                        />
                        {userProfile?.role === "Admin Intranet" && (
                          <button
                            onClick={() => setPhotoToDelete(photo)}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-16 w-16 mb-4" />
                    <p>Este álbum no tiene fotos todavía.</p>
                    {userProfile?.role === "Admin Intranet" && (
                      <p className="text-sm">¡Sube la primera foto para empezar!</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* --- Alert Dialogs --- */}
      <AlertDialog
        open={albumToDelete !== null}
        onOpenChange={() => setAlbumToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Seguro que quieres eliminar el álbum "{albumToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán todas las fotos que
              contiene y no se podrán recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAlbum}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={photoToDelete !== null}
        onOpenChange={() => setPhotoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Seguro que quieres eliminar esta foto?
            </AlertDialogTitle>
            <div className="my-4">
              <AlertDialogDescription className="mb-2">
                Esta acción es irreversible.
              </AlertDialogDescription>
              {photoToDelete && (
                <div className="relative aspect-square w-full max-w-xs mx-auto rounded-md overflow-hidden">
                  <Image
                    src={photoToDelete.url}
                    alt="Previsualización de la foto a eliminar"
                    width={400}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePhoto}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
