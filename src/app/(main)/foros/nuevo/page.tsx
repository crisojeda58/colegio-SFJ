
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(10, { message: "El título debe tener al menos 10 caracteres." }).max(150, { message: "El título no puede exceder los 150 caracteres." }),
  content: z.string().min(20, { message: "El contenido debe tener al menos 20 caracteres." }),
});

type FormValues = z.infer<typeof formSchema>;

interface UserProfile {
    name: string;
}

export default function NewTopicPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserProfile({ name: data.name });
        }
      } else {
        router.push('/login');
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user || !userProfile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes iniciar sesión para crear un tema.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "forum_topics"), {
        title: data.title,
        content: data.content,
        authorId: user.uid,
        authorName: userProfile.name,
        replyCount: 0,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        category: "General", // Placeholder category
      });

      toast({
        title: "¡Éxito!",
        description: "Tu tema ha sido publicado.",
      });
      router.push("/foros");

    } catch (error) {
      console.error("Error creating new topic: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el tema. Por favor, inténtalo de nuevo. Revisa las reglas de seguridad de Firestore.",
      });
      setIsSubmitting(false);
    }
  };
  
  if (loadingUser) {
    return (
        <div className="flex items-center justify-center h-full">
            <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="container mx-auto">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Crear un Nuevo Tema de Discusión</CardTitle>
          <CardDescription>Comparte tus ideas o preguntas con la comunidad.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Tema</FormLabel>
                    <FormControl>
                      <Input placeholder="Escribe un título claro y conciso..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe aquí los detalles de tu tema..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <CardFooter className="px-0 justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Publicando..." : "Publicar Tema"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
