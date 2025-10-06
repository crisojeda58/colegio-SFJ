
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LoaderCircle, ArrowLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  title: z.string().min(10, "El título debe tener al menos 10 caracteres.").max(150),
  category: z.enum(["Noticia", "Evento"], { required_error: "Debes seleccionar una categoría." }),
  excerpt: z.string().min(20, "El resumen debe tener al menos 20 caracteres.").max(300),
  content: z.string().min(50, "El contenido debe tener al menos 50 caracteres."),
  image: z
    .any()
    .optional()
    .refine((files) => !files || files.length === 0 || (files?.[0] && files?.[0].size <= MAX_FILE_SIZE), `El tamaño máximo es 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || (files?.[0] && ACCEPTED_IMAGE_TYPES.includes(files?.[0].type)),
      "Solo se aceptan archivos .jpg, .jpeg, .png y .webp."
    ),
  eventDate: z.date({ required_error: "La fecha del evento es obligatoria." }),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Introduce una hora válida en formato HH:mm."),
});


type FormValues = z.infer<typeof formSchema>;

interface NewsItem {
    authorId: string;
    imageUrl: string;
    category: "Noticia" | "Evento";
}

interface UserProfile {
    uid: string;
    role: string;
}

export default function EditNewsPage() {
  const router = useRouter();
  const params = useParams();
  const newsId = params.id as string;
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "Noticia",
      excerpt: "",
      content: "",
      eventTime: "12:00",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            setUserProfile({ uid: user.uid, role: docSnap.data().role });
          }
        });
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!newsId) return;

    const fetchNewsData = async () => {
      const docRef = doc(db, "news_items", newsId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setNewsItem({ authorId: data.authorId, imageUrl: data.imageUrl, category: data.category });
        
        const eventDate = data.eventDate ? (data.eventDate as Timestamp).toDate() : new Date();
        
        form.reset({
          title: data.title,
          category: data.category || "Noticia",
          excerpt: data.excerpt,
          content: data.content,
          eventDate: eventDate,
          eventTime: data.eventDate ? format((data.eventDate as Timestamp).toDate(), 'HH:mm') : '12:00',
        });
        setLoading(false);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se encontró la noticia." });
        router.push('/noticias');
      }
    };

    fetchNewsData();
  }, [newsId, router, toast, form]);

  useEffect(() => {
    if (!loading && userProfile && newsItem) {
        const isAuthor = userProfile.uid === newsItem.authorId;
        const isAdmin = userProfile.role === 'Admin Intranet';
        if (!isAuthor && !isAdmin) {
            toast({ variant: "destructive", title: "Acceso Denegado", description: "No tienes permiso para editar esta noticia." });
            router.push(`/noticias/${newsId}`);
        }
    }
  }, [loading, userProfile, newsItem, router, newsId, toast]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!newsItem) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ variant: "destructive", title: "Error de configuración", description: "La configuración de Cloudinary no está completa." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = newsItem.imageUrl;

      if (data.image && data.image.length > 0) {
        const imageFile = data.image[0];
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'intranet_colegio/noticias');

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Falló la actualización de la imagen.');
        }

        const uploadedImageData = await uploadResponse.json();
        imageUrl = uploadedImageData.secure_url;
      }
      
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const combinedDateTime = new Date(data.eventDate);
      combinedDateTime.setHours(hours, minutes);

      const docRef = doc(db, "news_items", newsId);
      await updateDoc(docRef, {
        title: data.title,
        category: data.category,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: imageUrl,
        eventDate: combinedDateTime,
        lastEdited: serverTimestamp(),
      });

      toast({ title: "¡Éxito!", description: "La noticia ha sido actualizada." });
      router.push(`/noticias/${newsId}`);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating news item: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo actualizar la noticia." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const imageRef = form.register("image");

  if (loading) {
    return (
        <div className="container mx-auto max-w-4xl">
             <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
             </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto">
      <Button variant="ghost" onClick={() => router.push('/noticias')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Editar Noticia/Evento</CardTitle>
          <CardDescription>Modifica los detalles del artículo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                          <Input {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una categoría" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="Noticia">Noticia</SelectItem>
                                  <SelectItem value="Evento">Evento</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>
                <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Resumen</FormLabel>
                        <FormControl>
                        <Textarea className="min-h-[100px]" {...field} />
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
                        <FormLabel>Contenido Completo</FormLabel>
                        <FormControl>
                        <Textarea className="min-h-[250px]" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Imagen de Portada</FormLabel>
                        <FormControl>
                          <Input type="file" {...imageRef} />
                        </FormControl>
                        <FormDescription>
                          Sube una nueva imagen para reemplazar la actual. Si no seleccionas ninguna, se mantendrá la imagen existente.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Evento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eventTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora del Evento</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <CardFooter className="px-0 justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/noticias/${newsId}`)} >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Guardando Cambios..." : "Guardar Cambios"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
