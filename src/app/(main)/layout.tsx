
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  ChevronDown,
  Contact,
  FolderKanban,
  GalleryVerticalEnd,
  Link2,
  LoaderCircle,
  MessagesSquare,
  Cake,
  Newspaper,
  School,
  Shield,
  Users,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const menuItems = [
    { href: "/noticias", label: "Noticias y Eventos", icon: Newspaper },
    { href: "/foros", label: "Foros", icon: MessagesSquare },
    { href: "/documentos", label: "Documentos", icon: FolderKanban },
    { href: "/sitios_interes", label: "Sitios de Interés", icon: Link2 },
    { href: "/directorio", label: "Directorio", icon: Users },
    { href: "/jefaturas_curso", label: "Jefaturas de curso", icon: Contact },
    { href: "/cumpleanos", label: "Cumpleaños", icon: Cake },
    { href: "/cocina", label: "Menu Casino", icon: Utensils },
    { href: "/galeria", label: "Galería", icon: GalleryVerticalEnd },
    { href: "/gestion", label: "Gestión", icon: Shield, roles: ["Admin Intranet"] },
];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const filteredMenuItems = React.useMemo(() => {
    if (!userProfile?.role) {
      return menuItems.filter(item => !item.roles);
    }
    return menuItems.filter(item => 
      !item.roles || item.roles.includes(userProfile.role)
    );
  }, [userProfile?.role]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoaderCircle className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
            <Link href="/noticias" className="flex items-center gap-2 text-primary-foreground group-data-[collapsible=icon]:justify-center">
                <div className="p-1.5 bg-primary-foreground/20 rounded-lg">
                <School className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                Colegio San Francisco Javier
                </div>
            </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: item.label }} className={cn(isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90")}>
                      <span>
                        <item.icon />
                        <span>{item.label}</span>
                      </span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
            <header className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                <SidebarTrigger>
                    <span className="sr-only">Toggle Sidebar</span>
                </SidebarTrigger>
                <Image src="https://res.cloudinary.com/duys6asgx/image/upload/v1758803545/734c8556-44ed-4aae-a2bb-6a1dca6b9b67.png" alt="Logo" width={120} height={24} className="object-contain" />
                </div>
                <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                        {userProfile?.name || 'Usuario'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userProfile?.name || 'Usuario'}</p>
                            <p className="text-xs leading-none text-muted-foreground">{userProfile?.email || 'email@example.com'}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/perfil">Perfil</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>Cerrar Sesión</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 relative bg-cover bg-center" style={{ backgroundImage: "url('https://res.cloudinary.com/duys6asgx/image/upload/v1759150362/38709_120920_061D_f5holn.jpg')" }}>
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative">{children}</div>
            </main>
            <footer className="p-4 border-t bg-background">
                <div className="container mx-auto flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>© {new Date().getFullYear()} Colegio San Francisco Javier</span>
                <span>|</span>
                <Image src="https://res.cloudinary.com/duys6asgx/image/upload/v1758803545/734c8556-44ed-4aae-a2bb-6a1dca6b9b67.png" alt="Logo en footer" width={120} height={24} className="object-contain"/>
                </div>
            </footer>
            </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </AuthProvider>
    );
}
