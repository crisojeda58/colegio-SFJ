
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Book, Landmark, Microscope } from "lucide-react";

const interestingSites = [
  {
    title: "Ministerio de Educación",
    description: "Accede al portal oficial del MINEDUC para información sobre políticas, programas y recursos educativos nacionales.",
    href: "https://www.mineduc.cl",
    icon: Landmark,
    category: "Gobierno"
  },
  {
    title: "EducarChile",
    description: "Plataforma con una vasta cantidad de recursos pedagógicos, noticias y herramientas para docentes, estudiantes y apoderados.",
    href: "https://www.educarchile.cl",
    icon: Book,
    category: "Recursos"
  },
  {
    title: "Portal Explora",
    description: "Fomenta la ciencia y la tecnología con recursos, actividades y noticias del programa Explora de CONICYT.",
    href: "https://www.explora.cl",
    icon: Microscope,
    category: "Ciencia"
  },
];

export default function SitiosDeInteresPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-card mb-6">Sitios de Interés</h1>
      <p className="text-card/80 mb-8 font-bold">
        Una colección de enlaces a recursos externos, portales educativos y sitios de relevancia para nuestra comunidad escolar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {interestingSites.map((site) => (
          <Card key={site.title} className="flex flex-col group hover:border-primary hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex-row gap-4 items-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <site.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg text-card-foreground group-hover:text-primary">{site.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <p className="text-muted-foreground mb-4">
                {site.description}
              </p>
              <Button asChild className="w-full mt-auto bg-foreground text-background hover:bg-foreground/80">
                <a href={site.href} target="_blank" rel="noopener noreferrer">
                  Visitar Sitio
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}