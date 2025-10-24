
"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";

const materialsList = [
  { id: "pizarra", label: "Pizarra" },
  { id: "computador", label: "Computador" },
  { id: "proyector", label: "Proyector" },
  { id: "microfono", label: "Micrófono" },
];

export default function SolicitudesEspacio() {
  const { userProfile } = useAuth();
  const [space, setSpace] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleMaterialChange = (materialId: string, checked: boolean | "indeterminate") => {
    setSelectedMaterials((prev) => {
      if (checked) {
        return [...prev, materialId];
      } else {
        return prev.filter((id) => id !== materialId);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de campos
    if (!space || !date || !time) {
      alert("Por favor, complete todos los campos requeridos: Espacio, Fecha y Hora.");
      return;
    }

    const name = userProfile?.name || "No especificado";
    const email = userProfile?.email || "No especificado";

    const to = "cristian.ojeda@colsanjavier.cl";
    const subject = "Solicitud de Espacio/Materiales";
    const body = `
      Solicitante: ${name}
      Email: ${email}
      
      Espacio Solicitado: ${space}
      Materiales Requeridos: ${selectedMaterials.join(", ") || "Ninguno"}
      
      Fecha: ${date}
      Hora: ${time}
    `;

    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="flex-1 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Formulario de Solicitud</CardTitle>
          <CardDescription>
            Complete el formulario para solicitar un espacio o materiales.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="space">Espacio Solicitado</Label>
              <Select onValueChange={setSpace} value={space}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un espacio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salón de Actos">Salón de Actos</SelectItem>
                  <SelectItem value="Sala de Reuniones">Sala de Reuniones</SelectItem>
                  <SelectItem value="Gimnasio">Gimnasio</SelectItem>
                  <SelectItem value="Patio Techado">Patio Techado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Materiales Requeridos</Label>
              <div className="grid grid-cols-2 gap-4">
                {materialsList.map((material) => (
                  <div key={material.id} className="flex items-center gap-2">
                    <Checkbox
                      id={material.id}
                      onCheckedChange={(checked) => handleMaterialChange(material.label, checked)}
                    />
                    <Label htmlFor={material.id} className="font-normal">
                      {material.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Generar Solicitud por Correo</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
