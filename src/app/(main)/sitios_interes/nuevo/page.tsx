
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { LoaderCircle } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  href: z.string().url("Debe ser una URL válida"),
  icon: z.string().min(1, "El ícono es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
});

export default function NewSitePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, loading } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      href: "",
      icon: "Globe",
      category: "",
    },
  });

  useEffect(() => {
    if (!loading && userProfile?.role !== 'Admin Intranet') {
      toast({
        variant: "destructive",
        title: "Acceso Denegado",
        description: "No tienes permiso para crear sitios de interés.",
      });
      router.replace("/sitios_interes");
    }
  }, [loading, userProfile, router, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await addDoc(collection(db, "sites"), {
        ...values,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Éxito", description: "Sitio de interés creado correctamente." });
      router.push("/sitios_interes");
    } catch (error) {
      console.error("Error creating site: ", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el sitio de interés." });
    }
  };

  if (loading || userProfile?.role !== 'Admin Intranet') {
    return (
        <div className="flex items-center justify-center h-full pt-40">
            <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="container mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Crear Nuevo Sitio de Interés</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Portal Académico" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder="Descripción breve del sitio de interés"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="href"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>URL del Sitio</FormLabel>
                        <FormControl>
                            <Input placeholder="https://ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Ícono</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un ícono" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Globe">Globo</SelectItem>
                                    <SelectItem value="Book">Libro</SelectItem>
                                    <SelectItem value="Landmark">Edificio</SelectItem>
                                    <SelectItem value="Microscope">Microscopio</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Elige el ícono que mejor represente al sitio.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Creando..." : "Crear Sitio"}
                        </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
