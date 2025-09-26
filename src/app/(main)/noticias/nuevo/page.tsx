
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { db, auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LoaderCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  title: z.string().min(10, { message: "El título debe tener al menos 10 caracteres." }).max(150, { message: "El título no puede exceder los 150 caracteres." }),
  excerpt: z.string().min(20, { message: "El resumen debe tener al menos 20 caracteres." }).max(300, { message: "El resumen no puede exceder los 300 caracteres." }),
  content: z.string().min(50, { message: "El contenido debe tener al menos 50 caracteres." }),
  image: z
    .any()
    .refine((files) => files?.length == 1, "La imagen es obligatoria.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Solo se aceptan archivos .jpg, .jpeg, .png y .webp."
    ),
  eventDate: z.date({ required_error: "La fecha del evento es obligatoria." }),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Introduce una hora válida en formato HH:mm." }),
});

type FormValues = z.infer<typeof formSchema>;

interface UserProfile {
    name: string;
    role: string;
}

const ALLOWED_ROLES = ['Jefe de departamento', 'Admin Intranet'];

export default function NewNewsPage() {
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
      excerpt: "",
      content: "",
      eventTime: "12:00",
    },
  });
  
  const imageRef = form.register("image");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const profile = { name: data.name, role: data.role } as UserProfile;
            setUserProfile(profile);

            if (!ALLOWED_ROLES.includes(profile.role)) {
                toast({ variant: "destructive", title: "Acceso denegado", description: "No tienes permiso para crear noticias." });
                router.push('/noticias');
            }
        } else {
            router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router, toast]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user || !userProfile || !ALLOWED_ROLES.includes(userProfile.role)) {
      toast({
        variant: "destructive",
        title: "Error de permisos",
        description: "No tienes permiso para crear una noticia.",
      });
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ variant: "destructive", title: "Error de configuración", description: "La configuración de Cloudinary no está completa. Revisa las variables de entorno." });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Subir imagen a Cloudinary
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
        throw new Error('La subida de la imagen falló.');
      }

      const uploadedImageData = await uploadResponse.json();
      const imageUrl = uploadedImageData.secure_url;

      // 2. Preparar los datos para Firestore
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const combinedDateTime = new Date(data.eventDate);
      combinedDateTime.setHours(hours, minutes);

      const docData = {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: imageUrl, 
        eventDate: combinedDateTime,
        category: "Evento",
        authorId: user.uid,
        authorName: userProfile.name,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      };

      // 3. Guardar los datos en Firestore
      await addDoc(collection(db, "news_items"), docData);

      toast({
        title: "¡Éxito!",
        description: "La noticia ha sido publicada.",
      });
      router.push("/noticias");

    } catch (error: any) {
      console.error("Error creating new news item: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo crear la noticia.",
      });
    } finally {
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Crear Nueva Noticia/Evento</CardTitle>
          <CardDescription>Completa el formulario para publicar un nuevo artículo en el portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Un titular atractivo e informativo..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resumen (o entradilla)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Un resumen corto que aparecerá en la lista de noticias."
                        className="min-h-[100px]"
                        {...field}
                      />
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
                      <Textarea
                        placeholder="El cuerpo completo del artículo..."
                        className="min-h-[250px]"
                        {...field}
                      />
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
                                      className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                      )}
                                      >
                                      {field.value ? (
                                          format(field.value, "PPP", { locale: es })
                                      ) : (
                                          <span>Selecciona una fecha</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                  </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                          date < new Date(new Date().setHours(0,0,0,0))
                                      }
                                      initialFocus
                                  />
                                  </PopoverContent>
                              </Popover>
                              <FormDescription>
                                  Esta fecha se mostrará en el calendario.
                              </FormDescription>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                   <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                      <FormItem className="flex flex-col">
                          <FormLabel>Hora del Evento</FormLabel>
                            <FormControl>
                            <Input type="time" {...field} />
                            </FormControl>
                           <FormDescription>
                                La hora en que se realizará el evento.
                            </FormDescription>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>
              <CardFooter className="px-0 justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/noticias')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Publicando..." : "Publicar Noticia"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
