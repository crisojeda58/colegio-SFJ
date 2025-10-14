import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const gallery = {
  aniversario: [
    { src: "https://picsum.photos/seed/g1/800/600", alt: "Celebración en el patio" },
    { src: "https://picsum.photos/seed/g2/800/600", alt: "Competencias deportivas" },
    { src: "https://picsum.photos/seed/g3/800/600", alt: "Presentación de baile" },
    { src: "https://picsum.photos/seed/g4/800/600", alt: "Premiación de alianzas" },
    { src: "https://picsum.photos/seed/g5/800/600", alt: "Comunidad escolar reunida" },
    { src: "https://picsum.photos/seed/g6/800/600", alt: "Profesores participando" },
  ],
  feriaCientifica: [
    { src: "https://picsum.photos/seed/g7/800/600", alt: "Estudiante explicando su proyecto" },
    { src: "https://picsum.photos/seed/g8/800/600", alt: "Experimento de química" },
    { src: "https://picsum.photos/seed/g9/800/600", alt: "Prototipo de robot" },
  ]
};

const ImageCard = ({ src, alt }: { src: string; alt: string; }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Card className="overflow-hidden cursor-pointer group hover:shadow-xl transition-shadow">
        <div className="relative aspect-w-1 aspect-h-1">
          <Image 
            src={src} 
            alt={alt} 
            width={800} 
            height={600} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDUiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjUiIGZpbGw9IiNlMmV4ZjAiLz48L3N2Zz4="
            quality={75}
          />
        </div>
      </Card>
    </DialogTrigger>
    <DialogContent className="max-w-4xl p-0">
      <div className="relative aspect-video">
        <Image 
          src={src} 
          alt={alt} 
          layout="fill" 
          objectFit="contain" 
          quality={85}
        />
      </div>
    </DialogContent>
  </Dialog>
);

export default function GalleryPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-card">Galería Multimedia</h1>
      <Tabs defaultValue="aniversario" orientation="vertical" className="flex flex-col md:flex-row gap-8">
        <TabsList className="flex flex-row md:flex-col h-auto md:h-full">
          <TabsTrigger value="aniversario">Aniversario 2023</TabsTrigger>
          <TabsTrigger value="feriaCientifica">Feria Científica</TabsTrigger>
          <TabsTrigger value="diaDeporte">Día del Deporte</TabsTrigger>
        </TabsList>
        <div className="flex-1">
            <TabsContent value="aniversario" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.aniversario.map((photo, index) => (
                <ImageCard key={`aniv-${index}`} {...photo} />
                ))}
            </div>
            </TabsContent>
            <TabsContent value="feriaCientifica" className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.feriaCientifica.map((photo, index) => (
                <ImageCard key={`feria-${index}`} {...photo} />
                ))}
            </div>
            </TabsContent>
            <TabsContent value="diaDeporte" className="mt-0">
                <p className="text-muted-foreground">No hay fotos en este álbum todavía.</p>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}