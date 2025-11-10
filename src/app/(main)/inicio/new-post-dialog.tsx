"use client";

import { useState, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LoaderCircle, Plus, Upload, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

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
  onPostCreated: () => void;
}

export function NewPostDialog({ onPostCreated }: NewPostDialogProps) {
  const { user, userProfile, getAuthToken } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      eventTime: "12:00",
    },
  });

  const processFile = (file: File) => {
    const validation = z
      .object({
        size: z.number().max(MAX_FILE_SIZE, `El tamaño máximo es 5MB.`),
        type: z.string().refine((type) => ACCEPTED_IMAGE_TYPES.includes(type), "Solo se aceptan archivos .jpg, .jpeg, .png y .webp."),
      })
      .safeParse(file);

    if (!validation.success) {
      form.setError("image", { type: "manual", message: validation.error.errors[0].message });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    form.setValue("image", [file] as any, { shouldValidate: true });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  
  const removeImage = () => {
    setImagePreview(null);
    form.setValue("image", null, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user || !userProfile || !getAuthToken) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear una publicación." });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await getAuthToken();
      if (!idToken) {
        throw new Error("No se pudo obtener el token de autenticación.");
      }

      // 1. Upload image to Supabase via our API
      const imageFile = data.image[0];
      const formData = new FormData();
      formData.append('file', imageFile);

      const uploadResponse = await fetch('/api/news/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'La subida de la imagen falló.');
      }

      const uploadedImageData = await uploadResponse.json();
      const imageUrl = uploadedImageData.url;
      
      // 2. Prepare document data for Firestore
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const combinedDateTime = new Date(data.eventDate);
      combinedDateTime.setHours(hours, minutes);

      const docData = {
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: imageUrl, // Use Supabase URL
        eventDate: combinedDateTime,
        category: data.category,
        authorId: user.uid,
        authorName: userProfile.name,
        createdAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      };

      // 3. Save the document to Firestore
      await addDoc(collection(db, "news_items"), docData);

      toast({ title: "¡Éxito!", description: "La publicación ha sido creada." });
      form.reset();
      setImagePreview(null);
      onPostCreated();
      setIsOpen(false);

    } catch (error: any) {
      console.error("Error creating new news item: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo crear la noticia." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setImagePreview(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                      className="min-h-[60px]"
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
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen de Portada</FormLabel>
                  <FormControl>
                  <div
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="relative w-full max-w-sm mx-auto">
                        <Image src={imagePreview} alt="Previsualización" width={400} height={225} className="rounded-lg object-cover w-full h-auto" />
                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-7 w-7" onClick={removeImage}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="file-upload" className={cn("flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition", { "border-blue-500 bg-blue-50": isDragging }, "border-gray-300")}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                          <p className="text-xs text-gray-500">JPG, PNG, WEBP (MAX. 5MB)</p>
                        </div>
                        <Input id="file-upload" type="file" className="hidden" onChange={handleImageChange} accept={ACCEPTED_IMAGE_TYPES.join(',')} />
                      </label>
                    )}                    
                  </div>
                  </FormControl>
                  <FormMessage className="mt-2" />
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
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
