
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowUpRight, Book, Landmark, Microscope, Plus, Globe, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface Site {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  category: string;
}

const iconMap: { [key: string]: LucideIcon } = {
  Book,
  Landmark,
  Microscope,
  Globe,
};

export default function SitiosDeInteresPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    const fetchSites = async () => {
      setLoading(true);
      try {
        const sitesCollection = collection(db, "sites");
        const querySnapshot = await getDocs(sitesCollection);
        const sitesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        // Ordenar los sitios alfabéticamente por título
        sitesList.sort((a, b) => a.title.localeCompare(b.title));
        setSites(sitesList);
      } catch (error) {
        console.error("Error fetching sites: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los sitios de interés.' });
      } finally {
        setLoading(false);
      }
    };
    fetchSites();
  }, [toast]);

  const openDeleteDialog = (siteId: string) => {
    setSiteToDelete(siteId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      await deleteDoc(doc(db, "sites", siteToDelete));
      setSites(prevSites => prevSites.filter(site => site.id !== siteToDelete));
      toast({ title: "Éxito", description: "El sitio de interés ha sido eliminado." });
    } catch (error) {
      console.error("Error deleting site: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el sitio de interés.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setSiteToDelete(null);
    }
  };

  const isAdmin = userProfile?.role === 'Admin Intranet';

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-card">Sitios de Interés</h1>
        {isAdmin && (
          <Button asChild>
            <Link href="/sitios_interes/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Sitio
            </Link>
          </Button>
        )}
      </div>
      <p className="text-card/80 mb-8 font-bold">
        Una colección de enlaces a recursos externos, portales educativos y sitios de relevancia para nuestra comunidad escolar.
      </p>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el sitio de interés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSite} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
             <Card key={index} className="flex flex-col">
             <CardHeader className="flex-row gap-4 items-center">
                 <Skeleton className="w-12 h-12 p-3 rounded-lg" />
                 <Skeleton className="h-6 w-40" />
             </CardHeader>
             <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                 <Skeleton className="h-10 w-full mt-4" />
             </CardContent>
           </Card>
          ))}
        </div>
      ) : sites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => {
            const Icon = iconMap[site.icon] || Globe;
            return (
              <Card key={site.id} className="flex flex-col group hover:border-primary hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex-row gap-4 items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-card-foreground group-hover:text-primary pt-2">{site.title}</CardTitle>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => openDeleteDialog(site.id)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <p className="text-muted-foreground mb-4">{site.description}</p>
                  <Button asChild className="w-full mt-auto bg-foreground text-background hover:bg-foreground/80">
                    <a href={site.href} target="_blank" rel="noopener noreferrer">
                      Visitar Sitio
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">No hay sitios de interés para mostrar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
