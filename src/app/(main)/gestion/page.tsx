"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileDown, MessageSquare, BarChart as BarChartIcon } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, LineChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Pie, PieChart, Cell } from "recharts";

const userActivityData = [
  { month: "Ene", users: 120 },
  { month: "Feb", users: 150 },
  { month: "Mar", users: 175 },
  { month: "Abr", users: 210 },
  { month: "May", users: 190 },
  { month: "Jun", users: 220 },
];

const pageVisitsData = [
  { name: "Noticias", visits: 4000, fill: "var(--color-noticias)" },
  { name: "Directorio", visits: 3000, fill: "var(--color-directorio)" },
  { name: "Documentos", visits: 2000, fill: "var(--color-documentos)" },
  { name: "Calendario", visits: 2780, fill: "var(--color-calendario)" },
  { name: "Foros", visits: 1890, fill: "var(--color-foros)" },
];

const chartConfig = {
    visits: {
        label: "Visitas",
    },
    users: {
        label: "Usuarios Activos",
        color: "hsl(var(--chart-1))",
    },
    noticias: {
        label: "Noticias",
        color: "hsl(var(--chart-1))",
    },
    directorio: {
        label: "Directorio",
        color: "hsl(var(--chart-2))",
    },
    documentos: {
        label: "Documentos",
        color: "hsl(var(--chart-3))",
    },
    calendario: {
        label: "Calendario",
        color: "hsl(var(--chart-4))",
    },
    foros: {
        label: "Foros",
        color: "hsl(var(--chart-5))",
    },
}

export default function ReportsPage() {
  return (
    <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">
            <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
                Reportes y Estadísticas
            </span>
        </h1>
        <p className="mb-8">
            <span className="bg-sidebar text-primary-foreground px-3 py-1 rounded-md">
                Análisis del uso y la participación en la intranet del colegio.
            </span>
        </p>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos (Mes)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">220</div>
            <p className="text-xs text-muted-foreground">+15.2% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Páginas Vistas (Hoy)</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,254</div>
            <p className="text-xs text-muted-foreground">+8.1% desde ayer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descargas de Documentos</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">573</div>
            <p className="text-xs text-muted-foreground">+32 desde la semana pasada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación en Foros</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+45</div>
            <p className="text-xs text-muted-foreground">Nuevos mensajes esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Usuarios por Mes</CardTitle>
            <CardDescription>Usuarios únicos que han iniciado sesión cada mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} name="Usuarios Activos"/>
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Visitas por Sección</CardTitle>
            <CardDescription>Páginas más visitadas en los últimos 30 días.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pageVisitsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                         <Legend content={<ChartLegendContent />} />
                        <Bar dataKey="visits" name="Visitas" radius={4}>
                            {pageVisitsData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}