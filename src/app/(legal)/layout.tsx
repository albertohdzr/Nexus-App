import Link from "next/link";
import { Shield, FileText, UserX, ArrowLeft } from "lucide-react";

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                            <span className="font-bold">N</span>
                        </div>
                        <span>Nexus</span>
                    </div>
                    <Link
                        href="/login"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a la App
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t bg-zinc-50 dark:bg-zinc-950">
                <div className="container mx-auto px-6 py-12">
                    {/* Main Footer Content */}
                    <div className="flex flex-col md:flex-row justify-between gap-10">
                        {/* Brand Section */}
                        <div className="space-y-4 md:max-w-sm">
                            <div className="flex items-center gap-2 font-bold text-xl">
                                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                    <span>N</span>
                                </div>
                                <span>Nexus</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Nexus es una plataforma integral de gestión escolar y CRM diseñada para potenciar la educación.
                            </p>
                        </div>

                        {/* Links Section */}
                        <div>
                            <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link href="/privacy-policy" className="hover:text-primary transition-colors flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Política de Privacidad
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms-of-service" className="hover:text-primary transition-colors flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Condiciones del Servicio
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/data-deletion" className="hover:text-primary transition-colors flex items-center gap-2">
                                        <UserX className="w-4 h-4" />
                                        Eliminación de Datos
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Copyright Section */}
                    <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} Nexus. Todos los derechos reservados.</p>
                        <p>Hecho con ❤️ para la educación.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
