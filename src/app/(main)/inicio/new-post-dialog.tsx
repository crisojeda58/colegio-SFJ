
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LoaderCircle, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/context/AuthContext";
import type { User } from "firebase/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  title: z.string().min(10, "El título debe tener al menos 10 caracteres.").max(150, "El título no puede exceder los 150 caracteres."),
  category: z.enum(["Noticia", "Evento"], { required_error: "Debes seleccionar una categoría." }),
  excerpt: z.string().min(20, "El resumen debe tener al menos 20 caracteres.").max(300, "El resumen no puede exceder los 300 caracteres."),
  content: z.string().min(50, "El contenido debe tener al menos 50 caracteres."),
  image: z
    .any()
    .refine((files) => files?.length == 1, "La imagen es obligatoria.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Solo se aceptan archivos .jpg, .jpeg, .png y .webp."
    ),
  eventDate: z.date({ required_error: "La fecha del evento es obligatoria." }),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Introduce una hora válida en formato HH:mm."),
});

type FormValues = z.infer<typeof formSchema>;

interface NewPostDialogProps {
  user: User;
  userProfile: UserProfile;
  onPostCreated: () => void;
}

export function NewPostDialog({ user, userProfile, onPostCreated }: NewPostDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ variant: "destructive", title: "Error de configuración", description: "La configuración de Cloudinary no está completa." });
      return;
    }

    setIsSubmitting(true);

    try {
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

      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const combinedDateTime = new Date(data.eventDate);
      combinedDateTime.setHours(hours, minutes);

      const docData = {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: imageUrl,
        eventDate: combinedDateTime,
        category: data.category,
        authorId: user.uid,
        authorName: userProfile.name,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "news_items"), docData);

      toast({ title: "¡Éxito!", description: "La publicación ha sido creada." });
      form.reset();
      onPostCreated(); // Refresh the list
      setIsOpen(false); // Close the dialog

    } catch (error: any) {
      console.error("Error creating new news item: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo crear la noticia." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Crear Publicación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Noticia/Evento</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <SelectItem value="Noticia">Aviso</SelectItem>
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
                                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
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
                                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                      initialFocus
                                  />
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
                      <FormItem className="flex flex-col">
                          <FormLabel>Hora del Evento</FormLabel>
                            <FormControl>
                            <Input type="time" {...field} />
                            </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Publicando..." : "Publicar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
