
import Image from "next/image";
import { School } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <Image
        src="https://res.cloudinary.com/duys6asgx/image/upload/v1758821648/campanario_zd6suo.webp"
        alt="Fondo del campanario del colegio"
        fill
        style={{ objectFit: 'cover' }}
        className="-z-10"
        quality={80}
        priority
      />
      <div className="absolute inset-0 bg-black/65 -z-10" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 text-white">
                <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                    <School className="w-8 h-8" />
                </div>
                 <h1 className="text-2xl font-bold tracking-tight">
                    Colegio San Francisco Javier
                </h1>
            </div>
        </div>
        {children}
      </div>
    </div>
  );
}
