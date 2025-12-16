import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Condiciones del Servicio | Nexus",
    description: "Condiciones del Servicio de Nexus - Reglas y directrices para el uso de nuestra plataforma.",
};

export default function TermsOfServicePage() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Condiciones del Servicio</h1>

            <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
                <p>
                    Última actualización: {new Date().toLocaleDateString('es-ES')}
                </p>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">1. Aceptación de los Términos</h2>
                    <p>
                        Al acceder o utilizar la plataforma Nexus ("el Servicio"), usted acepta estar legalmente vinculado por estas Condiciones del Servicio ("Términos").
                        Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">2. Descripción del Servicio</h2>
                    <p>
                        Nexus es una plataforma de gestión escolar y CRM que ofrece herramientas para la administración de estudiantes, seguimiento de ventas y comunicación.
                        El Servicio puede incluir, entre otras cosas, funcionalidades de chat automatizado ("Chatbot") para facilitar la interacción con clientes y estudiantes.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">3. Uso Aceptable del Chatbot y Mensajería</h2>
                    <p>
                        Nuestra plataforma integra servicios de mensajería automatizada (API de WhatsApp/Meta). Al utilizar estas funciones, usted se compromete a:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>No enviar mensajes masivos no solicitados (spam).</li>
                        <li>No utilizar el Chatbot para difundir contenido ofensivo, ilegal, difamatorio o que infrinja derechos de terceros.</li>
                        <li>Cumplir con todas las políticas aplicables de Meta y WhatsApp Business, incluyendo la obtención del consentimiento necesario de los destinatarios antes de iniciar comunicaciones.</li>
                        <li>No intentar manipular, realizar ingeniería inversa o abusar de la API del Chatbot.</li>
                    </ul>
                    <p className="mt-2">
                        Nos reservamos el derecho de suspender o terminar su acceso al Servicio si detectamos un uso indebido de las herramientas de mensajería.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">4. Cuentas y Seguridad</h2>
                    <p>
                        Usted es responsable de mantener la confidencialidad de su cuenta y contraseña. Acepta notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta.
                        Nexus no será responsable por ninguna pérdida derivada del incumplimiento de esta obligación.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">5. Propiedad Intelectual</h2>
                    <p>
                        El Servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de Nexus y sus licenciantes.
                        El Servicio está protegido por derechos de autor, marcas registradas y otras leyes.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">6. Limitación de Responsabilidad</h2>
                    <p>
                        En ningún caso Nexus, ni sus directores, empleados, socios o proveedores, serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos,
                        incluyendo sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, resultantes de (i) su acceso o uso o la imposibilidad de acceder o usar el Servicio;
                        (ii) cualquier conducta o contenido de terceros en el Servicio.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">7. Modificaciones al Servicio y Términos</h2>
                    <p>
                        Nos reservamos el derecho de retirar o modificar nuestro Servicio, y cualquier servicio o material que proporcionemos, a nuestra entera discreción y sin previo aviso.
                        Podemos revisar y actualizar estos Términos periódicamente. Todos los cambios entran en vigor inmediatamente después de su publicación.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">8. Contacto</h2>
                    <p>
                        Si tiene alguna pregunta sobre estas Condiciones del Servicio, por favor contáctenos en: alberto.hernandez@cat.com
                    </p>
                </section>
            </div>
        </div>
    );
}
