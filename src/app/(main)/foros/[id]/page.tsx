
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, runTransaction, Timestamp, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, LoaderCircle, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
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

interface ForumTopic {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
}

interface ForumReply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: Date;
}

interface UserProfile {
    name: string;
    role: string;
}

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [newReplyContent, setNewReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({ name: data.name, role: data.role });
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!topicId) return;

    const fetchTopic = async () => {
      setLoading(true);
      const topicDocRef = doc(db, "forum_topics", topicId);
      const topicDocSnap = await getDoc(topicDocRef);

      if (topicDocSnap.exists()) {
        const data = topicDocSnap.data();
        setTopic({
          id: topicDocSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
        } as ForumTopic);
      } else {
        toast({ variant: "destructive", title: "Error", description: "El tema no fue encontrado." });
        router.push("/foros");
      }
      setLoading(false);
    };

    fetchTopic();

    const repliesCollectionRef = collection(db, "forum_topics", topicId, "forum_replies");
    const q = query(repliesCollectionRef, orderBy("createdAt", "asc"));

    const unsubscribeReplies = onSnapshot(q, (querySnapshot) => {
      const repliesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
      } as ForumReply));
      setReplies(repliesList);
    });

    return () => unsubscribeReplies();

  }, [topicId, router, toast]);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !user || !userProfile) return;

    setIsSubmittingReply(true);
    const topicDocRef = doc(db, "forum_topics", topicId);
    const repliesCollectionRef = collection(topicDocRef, "forum_replies");

    try {
        await runTransaction(db, async (transaction) => {
            const topicDoc = await transaction.get(topicDocRef);
            if (!topicDoc.exists()) {
                throw "El documento del tema no existe!";
            }
            
            const newReplyCount = (topicDoc.data().replyCount || 0) + 1;

            transaction.update(topicDocRef, { 
                replyCount: newReplyCount,
                lastActivity: serverTimestamp() 
            });

            const newReply = {
                content: newReplyContent,
                authorId: user.uid,
                authorName: userProfile.name,
                createdAt: serverTimestamp(),
            };
            transaction.set(doc(repliesCollectionRef), newReply);
        });

        setNewReplyContent("");
    } catch (error) {
        console.error("Error adding reply: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo añadir tu respuesta. Revisa las reglas de seguridad.",
        });
    } finally {
        setIsSubmittingReply(false);
    }
  };

  const handleDeleteTopic = async () => {
    setIsDeleting(true);
    const topicDocRef = doc(db, "forum_topics", topicId);
    const repliesCollectionRef = collection(topicDocRef, "forum_replies");

    try {
        // Batch delete all replies
        const repliesSnapshot = await getDocs(repliesCollectionRef);
        const batch = writeBatch(db);
        repliesSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        // Delete the main topic
        batch.delete(topicDocRef);

        await batch.commit();

        toast({
            title: "Tema eliminado",
            description: "El tema y todas sus respuestas han sido eliminados.",
        });
        router.push("/foros");

    } catch (error) {
        console.error("Error deleting topic: ", error);
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: "No se pudo eliminar el tema. Revisa las reglas de seguridad.",
        });
        setIsDeleting(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'hace un momento';
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  }

  const canDelete = user && topic && (user.uid === topic.authorId || userProfile?.role === 'Admin Intranet');

  if (loading || !topic) {
    return (
        <div className="container mx-auto">
            <Skeleton className="h-8 w-48 mb-4" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a los foros
        </Button>

        {canDelete && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Tema
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de eliminar el tema?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará el tema y todas sus respuestas permanentemente.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTopic} disabled={isDeleting}>
                        {isDeleting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeleting ? "Eliminando..." : "Sí, eliminar"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </div>

      {/* Tema Original */}
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{topic.title}</CardTitle>
          <div className="flex items-center gap-3 pt-2 text-sm text-muted-foreground">
             <span className="font-semibold">{topic.authorName}</span>
             <span>•</span>
             <span>{formatDate(topic.createdAt)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{topic.content}</p>
        </CardContent>
      </Card>
      
      <Separator className="my-8" />

      {/* Respuestas */}
      <h2 className="text-xl text-white font-bold mb-4">Respuestas ({replies.length})</h2>
      <div className="space-y-6">
        {replies.map(reply => (
            <Card key={reply.id} className="bg-secondary">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{reply.authorName}</span>
                        <span>•</span>
                        <span>{formatDate(reply.createdAt)}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p>{reply.content}</p>
                </CardContent>
            </Card>
        ))}
        {replies.length === 0 && (
            <p className="text-muted-foreground text-center py-4">Aún no hay respuestas. ¡Sé el primero en comentar!</p>
        )}
      </div>

      <Separator className="my-8" />

      {/* Formulario para nueva respuesta */}
      <Card>
          <CardHeader>
              <CardTitle>Añadir una respuesta</CardTitle>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleReplySubmit}>
                <Textarea
                    placeholder="Escribe tu respuesta aquí..."
                    className="min-h-[120px]"
                    value={newReplyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                    disabled={isSubmittingReply}
                />
                <CardFooter className="px-0 pt-4 justify-end">
                    <Button type="submit" disabled={!newReplyContent.trim() || isSubmittingReply}>
                        {isSubmittingReply ? (
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Publicar Respuesta
                    </Button>
                </CardFooter>
              </form>
          </CardContent>
      </Card>
    </div>
  );
}
