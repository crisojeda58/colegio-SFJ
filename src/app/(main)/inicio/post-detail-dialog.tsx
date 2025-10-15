
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { doc, getDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User as UserIcon, Trash2, LoaderCircle, PartyPopper, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { EditPostDialog } from "./edit-post-dialog";

interface NewsItemDetail {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  publishedAt: Date;
  eventDate?: Date;
}

interface PostDetailDialogProps {
  newsItemId: string;
  children: React.ReactNode;
  onPostDeleted: () => void;
}

export function PostDetailDialog({ newsItemId, children, onPostDeleted }: PostDetailDialogProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newsItem, setNewsItem] = useState<NewsItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNewsItem = useCallback(async () => {
    setLoading(true);
    const newsDocRef = doc(db, "news_items", newsItemId);
    try {
      const newsDocSnap = await getDoc(newsDocRef);
      if (newsDocSnap.exists()) {
        const data = newsDocSnap.data();
        setNewsItem({
          id: newsDocSnap.id,
          ...data,
          publishedAt: (data.publishedAt as Timestamp).toDate(),
          eventDate: data.eventDate ? (data.eventDate as Timestamp).toDate() : undefined,
        } as NewsItemDetail);
      } else {
        toast({ variant: "destructive", title: "Error", description: "La noticia no fue encontrada." });
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Error fetching news item:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la noticia." });
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, [newsItemId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchNewsItem();
    }
  }, [isOpen, fetchNewsItem]);

  const handlePostEdited = () => {
    fetchNewsItem();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const newsDocRef = doc(db, "news_items", newsItemId);
    try {
        await deleteDoc(newsDocRef);
        toast({ title: "Noticia eliminada", description: "El artículo ha sido eliminado." });
        onPostDeleted();
        setIsOpen(false);
    } catch (error) {
        console.error("Error deleting news item:", error);
        toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar la noticia." });
        setIsDeleting(false);
    }
  };

  const isAuthor = userProfile && newsItem && userProfile.uid === newsItem.authorId;
  const isAdmin = userProfile?.role === 'Admin Intranet';
  const canManage = isAuthor || isAdmin;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {loading || !newsItem ? (
           <div className="p-6 md:p-8">
                <Skeleton className="w-full h-64 sm:h-80 rounded-lg mb-6" />
                <Skeleton className="h-8 w-3/4 mb-4" />
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                </div>
            </div>
        ) : (
          <>
            <div className="relative w-full h-64 sm:h-80 lg:h-96">
                <Image src={newsItem.imageUrl} alt={newsItem.title} layout="fill" objectFit="cover" />
            </div>
            <DialogHeader className="p-6 md:p-8 !text-left">
                <div className="flex justify-between items-start">
                    <DialogTitle className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tighter pr-4">
                        {newsItem.title}
                    </DialogTitle>
                    {canManage && (
                        <div className="flex gap-2 flex-shrink-0">
                            <EditPostDialog newsItemId={newsItem.id} onPostEdited={handlePostEdited}>
                                <Button variant="outline" size="sm">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Button>
                            </EditPostDialog>
                            {isAdmin && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeaderComponent>
                                            <AlertDialogTitleComponent>¿Estás seguro?</AlertDialogTitleComponent>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer y eliminará permanentemente la publicación.
                                            </AlertDialogDescription>
                                        </AlertDialogHeaderComponent>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                                                {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                                Confirmar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>{newsItem.authorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Publicado: {format(newsItem.publishedAt, "dd 'de' MMMM, yyyy", { locale: es })}</span>
                    </div>
                    {newsItem.eventDate && (
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <PartyPopper className="h-4 w-4" />
                            <span>{format(newsItem.eventDate, "dd 'de' MMMM, yyyy 'a las' HH:mm 'hrs.'", { locale: es })}</span>
                        </div>
                    )}
                </div>
            </DialogHeader>

            <div className="prose prose-lg max-w-none text-foreground text-base md:text-lg whitespace-pre-wrap px-6 md:px-8 pb-6 md:pb-8">
                {newsItem.content}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
