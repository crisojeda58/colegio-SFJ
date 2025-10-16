"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, type UserProfile } from "@/context/AuthContext";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Pencil, LoaderCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// --- Tipos y Esquemas ---

const normalDaySchema = z.object({
  option1: z.string().min(3, "Debe tener al menos 3 caracteres."),
  option2: z.string().min(3, "Debe tener al menos 3 caracteres."),
});

const singleDaySchema = z.string().min(3, "Debe tener al menos 3 caracteres.");

const weekSchema = z.object({
  Lunes: singleDaySchema,
  Martes: singleDaySchema,
  Miércoles: singleDaySchema,
  Jueves: singleDaySchema,
  Viernes: singleDaySchema,
});

const normalWeekSchema = z.object({
    Lunes: normalDaySchema,
    Martes: normalDaySchema,
    Miércoles: normalDaySchema,
    Jueves: normalDaySchema,
    Viernes: normalDaySchema,
});


const formSchema = z.object({
  normal: normalWeekSchema,
  hipocalorica: weekSchema,
  vegetariana: weekSchema,
});

type FormValues = z.infer<typeof formSchema>;

const initialMenuData: FormValues = {
  normal: {
    Lunes: { option1: "", option2: "" },
    Martes: { option1: "", option2: "" },
    Miércoles: { option1: "", option2: "" },
    Jueves: { option1: "", option2: "" },
    Viernes: { option1: "", option2: "" },
  },
  hipocalorica: { Lunes: "", Martes: "", Miércoles: "", Jueves: "", Viernes: "" },
  vegetariana: { Lunes: "", Martes: "", Miércoles: "", Jueves: "", Viernes: "" },
};

// --- Componentes ---

const NormalMenuTabContent = ({ menuData, loading }: { menuData: any; loading: boolean }) => {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {days.map(day => (
          <Card key={day} className="bg-card">
            <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!menuData) {
    return <p className="text-center text-muted-foreground py-8">No hay datos de menú disponibles.</p>
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {days.map(day => (
        <Card key={day} className="bg-card">
          <CardHeader>
            <CardTitle>{day}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-primary">Opción 1:</p>
            <CardDescription className="mb-2">{menuData[day]?.option1 || 'No definido'}</CardDescription>
            <p className="font-semibold text-primary">Opción 2:</p>
            <CardDescription>{menuData[day]?.option2 || 'No definido'}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const SingleMenuTabContent = ({ menuData, loading }: { menuData: any; loading: boolean }) => {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {days.map(day => (
          <Card key={day} className="bg-card">
            <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!menuData) {
    return <p className="text-center text-muted-foreground py-8">No hay datos de menú disponibles.</p>
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {days.map(day => (
        <Card key={day} className="bg-card">
          <CardHeader>
            <CardTitle>{day}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-primary">Plato Principal:</p>
            <CardDescription>{menuData[day] || 'No definido'}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const NormalMenuFormTab = ({ control }: { control: any }) => {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  return (
    <div className="space-y-6">
      {days.map(day => (
        <Card key={day}>
          <CardHeader><CardTitle>{day}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={control}
              name={`normal.${day}.option1`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opción 1</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Lentejas con arroz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`normal.${day}.option2`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opción 2</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Pollo asado con puré" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


const SingleMenuFormTab = ({ control, menuType }: { control: any, menuType: 'hipocalorica' | 'vegetariana' }) => {
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  return (
    <div className="space-y-6">
      {days.map(day => (
        <Card key={day}>
          <CardHeader><CardTitle>{day}</CardTitle></CardHeader>
          <CardContent>
            <FormField
              control={control}
              name={`${menuType}.${day}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plato Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ensalada César" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default function KitchenPage() {
  const [menu, setMenu] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialMenuData,
  });

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const menuDocRef = doc(db, "kitchen_menus", "weekly");
      try {
        const docSnap = await getDoc(menuDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data().menu as FormValues;
          // Merge with initial data to ensure all fields are present, preventing uncontrolled component errors
          const mergedData = {
            ...initialMenuData,
            ...data,
            normal: {
              ...initialMenuData.normal,
              ...(data.normal || {}),
            }
          };
          setMenu(mergedData);
          form.reset(mergedData);
        } else {
          setMenu(initialMenuData);
          form.reset(initialMenuData);
        }
      } catch (error) {
        console.error("Error fetching menu:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la minuta." });
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [form, toast]);


  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const menuDocRef = doc(db, "kitchen_menus", "weekly");
    try {
      await setDoc(menuDocRef, {
        menu: data,
        lastUpdated: serverTimestamp(),
      });
      setMenu(data);
      toast({ title: "Éxito", description: "La minuta semanal ha sido actualizada." });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving menu:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la minuta. Revisa las reglas de seguridad de Firestore." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const canEditMenu = userProfile?.role === 'Admin Intranet' || userProfile?.role === 'Jefe de cocina';

  return (
    <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-card">Minuta de Cocina Semanal</h1>
            {canEditMenu && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                      <Pencil className="mr-2 h-4 w-4" />
                      Cambiar Menú
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Editar Minuta Semanal</DialogTitle>
                  </DialogHeader>
                  <div className="flex-grow overflow-y-auto pr-6">
                    <Form {...form}>
                      <form id="menu-form" className="space-y-8">
                        <Tabs defaultValue="normal">
                            <TabsList className="grid w-full grid-cols-3 bg-secondary data-[state=active]:bg-sidebar-primary">
                              <TabsTrigger value="normal" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground font-bold">Normal</TabsTrigger>
                              <TabsTrigger value="hipocalorica" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground font-bold">Hipocalórica</TabsTrigger>
                              <TabsTrigger value="vegetariana" className="data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground font-bold">Vegetariana</TabsTrigger>
                            </TabsList>
                            <TabsContent value="normal" className="mt-6">
                              <NormalMenuFormTab control={form.control} />
                            </TabsContent>
                            <TabsContent value="hipocalorica" className="mt-6">
                              <SingleMenuFormTab control={form.control} menuType="hipocalorica" />
                            </TabsContent>
                            <TabsContent value="vegetariana" className="mt-6">
                              <SingleMenuFormTab control={form.control} menuType="vegetariana" />
                            </TabsContent>
                          </Tabs>
                      </form>
                    </Form>
                  </div>
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                      </DialogClose>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button disabled={isSubmitting}>
                                {isSubmitting && <LoaderCircle className="animate-spin mr-2" />}
                                Guardar Cambios
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar Cambios?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Estás a punto de sobrescribir la minuta semanal actual. Esta acción no se puede deshacer. ¿Deseas continuar?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={form.handleSubmit(onSubmit)}>
                                    Sí, guardar cambios
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
        </div>
      <Tabs defaultValue="normal">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="normal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Normal</TabsTrigger>
          <TabsTrigger value="hipocalorica" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Hipocalórica</TabsTrigger>
          <TabsTrigger value="vegetariana" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Vegetariana</TabsTrigger>
        </TabsList>
        <TabsContent value="normal" className="mt-6">
          <NormalMenuTabContent menuData={menu?.normal} loading={loading} />
        </TabsContent>
        <TabsContent value="hipocalorica" className="mt-6">
          <SingleMenuTabContent menuData={menu?.hipocalorica} loading={loading} />
        </TabsContent>
        <TabsContent value="vegetariana" className="mt-6">
          <SingleMenuTabContent menuData={menu?.vegetariana} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
