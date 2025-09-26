
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User as UserIcon, Trash2, LoaderCircle, PartyPopper, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  publishedAt: Date;
  eventDate?: Date;
}

interface UserProfile {
    uid: string;
    role: string;
}

export default function NewsDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const newsId = params.id as string;

  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({ uid: user.uid, role: data.role });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!newsId) return;

    const fetchNewsItem = async () => {
      setLoading(true);
      const newsDocRef = doc(db, "news_items", newsId);
      try {
        const newsDocSnap = await getDoc(newsDocRef);

        if (newsDocSnap.exists()) {
          const data = newsDocSnap.data();
          setNewsItem({
            id: newsDocSnap.id,
            ...data,
            publishedAt: (data.publishedAt as Timestamp).toDate(),
            eventDate: data.eventDate ? (data.eventDate as Timestamp).toDate() : undefined,
          } as NewsItem);
        } else {
          toast({ variant: "destructive", title: "Error", description: "La noticia no fue encontrada." });
          router.push("/noticias");
        }
      } catch(error) {
        console.error("Error fetching news item:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la noticia." });
      } finally {
        setLoading(false);
      }
    };

    fetchNewsItem();
  }, [newsId, router, toast]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const newsDocRef = doc(db, "news_items", newsId);
    try {
        await deleteDoc(newsDocRef);
        toast({
            title: "Noticia eliminada",
            description: "El artículo ha sido eliminado correctamente.",
        });
        router.push("/noticias");
    } catch (error) {
        console.error("Error deleting news item:", error);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar la noticia. Revisa los permisos.",
        });
        setIsDeleting(false);
    }
  };
  
  if (loading) {
    return (
        <div className="container mx-auto max-w-4xl">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="w-full h-80 rounded-lg mb-6" />
            <Skeleton className="h-10 w-3/4 mb-4" />
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
    );
  }

  if (!newsItem) {
    return (
        <div className="container mx-auto text-center">
            <p>La noticia solicitada no existe o no se pudo cargar.</p>
            <Button onClick={() => router.push('/noticias')} className="mt-4">Volver a Noticias</Button>
        </div>
    )
  }
  
  const isAuthor = userProfile && userProfile.uid === newsItem.authorId;
  const isAdmin = userProfile?.role === 'Admin Intranet';
  const canManage = isAuthor || isAdmin;

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.push('/noticias')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Noticias
        </Button>

        {canManage && (
            <div className="flex gap-2">
                <Button variant="outline" asChild>
                    <Link href={`/noticias/editar/${newsItem.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar Noticia
                    </Link>
                </Button>
                {isAdmin && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Noticia
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la noticia de la base de datos.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                                {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        )}
      </div>

      <article>
        <Card className="overflow-hidden">
            <div className="relative w-full aspect-video">
                <Image src={newsItem.imageUrl} alt={newsItem.title} layout="fill" objectFit="cover" />
            </div>
            <div className="p-6 md:p-8">
                <header className="mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tighter">
                        {newsItem.title}
                    </h1>
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
                </header>

                <div className="prose prose-lg max-w-none text-foreground text-base md:text-lg whitespace-pre-wrap">
                    {newsItem.content}
                </div>
            </div>
        </Card>
      </article>
    </div>
  );
}
