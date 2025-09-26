import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Settings } from "lucide-react";
import Link from "next/link";

const managementSections = [
  {
    title: "Reportes y Estadísticas",
    description: "Visualizar datos de uso de la intranet.",
    icon: BarChart3,
    href: "/gestion/reportes",
  },
  {
    title: "Configuración del Sistema",
    description: "Ajustes generales de la plataforma.",
    icon: Settings,
    href: "/gestion/configuracion",
  },
];

export default function ManagementPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Panel de Gestión</h1>
      <p className="text-card/80 mb-8">
        Bienvenido al panel de administración. Desde aquí puedes gestionar los aspectos clave de la intranet.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {managementSections.map((section) => (
          <Link href={section.href} key={section.title} className="group">
            <Card className="h-full hover:border-primary hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  {section.title}
                </CardTitle>
                <section.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}