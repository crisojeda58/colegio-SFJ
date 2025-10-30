
"use client";

import { useState, useEffect, ChangeEvent, DragEvent } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";

import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, LoaderCircle, Upload, X } from "lucide-react";
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
  image: z.any().optional()
    .refine((files) => !files || files.length === 0 || (files?.[0]?.size <= MAX_FILE_SIZE), `El tamaño máximo es 5MB.`)
    .refine((files) => !files || files.length === 0 || (ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type)), "Solo se aceptan .jpg, .jpeg, .png, .webp."),
  eventDate: z.date({ required_error: "La fecha del evento es obligatoria." }),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Introduce una hora válida en formato HH:mm."),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPostDialogProps {
  newsItemId: string;
  onPostEdited: () => void;
  children: React.ReactNode;
}

export function EditPostDialog({ newsItemId, onPostEdited, children }: EditPostDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialImageUrl, setInitialImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    const fetchNewsData = async () => {
      setLoading(true);
      const docRef = doc(db, "news_items", newsItemId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const eventDate = data.eventDate ? (data.eventDate as Timestamp).toDate() : new Date();
        form.reset({
          title: data.title,
          category: data.category || "Noticia",
          excerpt: data.excerpt,
          content: data.content,
          eventDate: eventDate,
          eventTime: data.eventDate ? format(eventDate, 'HH:mm') : '12:00',
        });
        setInitialImageUrl(data.imageUrl);
        setImagePreview(data.imageUrl); // Set initial preview
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se encontró la noticia." });
        setIsOpen(false);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchNewsData();
    }
  }, [isOpen, newsItemId, form, toast]);

  const processFile = (file: File) => {
    const validation = z
      .object({
        size: z.number().max(MAX_FILE_SIZE, `El tamaño máximo es 5MB.`),
        type: z.string().refine((type) => ACCEPTED_IMAGE_TYPES.includes(type), "Solo se aceptan .jpg, .jpeg, .png y .webp."),
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
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ variant: "destructive", title: "Error de configuración", description: "Cloudinary no está configurado." });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = initialImageUrl;
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

        if (!uploadResponse.ok) throw new Error('Falló la subida de la nueva imagen.');
        const uploadedImageData = await uploadResponse.json();
        imageUrl = uploadedImageData.secure_url;
      }
      
      const [hours, minutes] = data.eventTime.split(':').map(Number);
      const combinedDateTime = new Date(data.eventDate);
      combinedDateTime.setHours(hours, minutes);

      const docRef = doc(db, "news_items", newsItemId);
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
      onPostEdited();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error updating news item: ", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo actualizar." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        form.reset();
        setImagePreview(null);
        setInitialImageUrl("");
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Noticia/Evento</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="space-y-6 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Noticia">Aviso</SelectItem><SelectItem value="Evento">Evento</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>Resumen</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Contenido Completo</FormLabel><FormControl><Textarea className="min-h-[250px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField
                  control={form.control}
                  name="image"
                  render={() => (
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
                          <label htmlFor="file-upload-edit" className={cn("flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition", { "border-blue-500 bg-blue-50": isDragging }, "border-gray-300")}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-10 h-10 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                              <p className="text-xs text-gray-500">JPG, PNG, WEBP (MAX. 5MB)</p>
                            </div>
                            <Input id="file-upload-edit" type="file" className="hidden" onChange={handleImageChange} accept={ACCEPTED_IMAGE_TYPES.join(',')} />
                          </label>
                        )}\n                        </div>
                      </FormControl>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="eventDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Fecha del Evento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="eventTime" render={({ field }) => (<FormItem><FormLabel>Hora del Evento</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{isSubmitting ? "Guardando..." : "Guardar Cambios"}</Button>
                </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
