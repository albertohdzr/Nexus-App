import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Política de Privacidad | Nexus",
    description: "Política de Privacidad de Nexus - Conoce cómo manejamos tus datos.",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Política de Privacidad</h1>

            <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
                <p>
                    Última actualización: {new Date().toLocaleDateString('es-ES')}
                </p>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">1. Introducción</h2>
                    <p>
                        Bienvenido a CAT - Nexus (&quot;nosotros&quot;, &quot;nuestro&quot; o &quot;la Plataforma&quot;). Nos comprometemos a proteger su privacidad
                        y asegurar que sus datos personales sean tratados con seguridad y transparencia. Esta Política de Privacidad
                        explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestra aplicación.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">2. Información que Recopilamos</h2>
                    <p>
                        Recopilamos información que usted nos proporciona directamente cuando se registra o utiliza nuestros servicios:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Información de Cuenta:</strong> Nombre, apellidos, dirección de correo electrónico y contraseña (encriptada).</li>
                        <li><strong>Información de Perfil:</strong> Datos asociados a su rol dentro de la organización (e.g., administrador, usuario).</li>
                        <li><strong>Datos de Uso:</strong> Información sobre cómo interactúa con la plataforma, incluyendo registros de actividad y preferencias.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">3. Cómo Usamos su Información</h2>
                    <p>
                        Utilizamos la información recopilada para los siguientes propósitos:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Provisión del Servicio:</strong> Para autenticar su cuenta, gestionar su perfil y permitir el acceso a las funcionalidades del CRM y gestión escolar.</li>
                        <li><strong>Mejora del Servicio:</strong> Para analizar el uso de la plataforma y desarrollar nuevas funcionalidades.</li>
                        <li><strong>Comunicaciones:</strong> Para enviarle actualizaciones importantes, notificaciones de seguridad y, con su consentimiento, información sobre nuevos productos.</li>
                        <li><strong>Funcionalidades de IA y Mensajería:</strong> Utilizamos servicios de inteligencia artificial y plataformas de mensajería (WhatsApp, Facebook Messenger) para mejorar su experiencia (ver sección de Terceros).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">4. Compartir Información con Terceros</h2>
                    <p>
                        No vendemos sus datos personales. Sin embargo, compartimos información con proveedores de servicios de confianza necesarios para operar la plataforma:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Supabase:</strong> Para el almacenamiento seguro de base de datos y autenticación de usuarios.</li>
                        <li><strong>OpenAI:</strong> Para procesar ciertas funcionalidades impulsadas por inteligencia artificial dentro de la aplicación.</li>
                        <li><strong>Resend:</strong> Para el envío de correos electrónicos transaccionales y notificaciones.</li>
                    </ul>
                    <p className="mt-2">
                        Estos proveedores tienen acceso limitado a su información solo para realizar estas tareas en nuestro nombre y están obligados a no divulgarla ni utilizarla para otros fines.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">5. Seguridad de los Datos</h2>
                    <p>
                        Implementamos medidas de seguridad técnicas y organizativas adecuadas para proteger sus datos personales contra el acceso no autorizado,
                        la alteración, divulgación o destrucción. Esto incluye el cifrado de contraseñas y la transmisión segura de datos (HTTPS).
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">6. Sus Derechos</h2>
                    <p>
                        Dependiendo de su ubicación, usted puede tener los siguientes derechos sobre sus datos personales:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Derecho a acceder a sus datos.</li>
                        <li>Derecho a rectificar datos inexactos.</li>
                        <li>Derecho a solicitar la eliminación de sus datos (&quot;derecho al olvido&quot;).</li>
                        <li>Derecho a restringir o portar sus datos.</li>
                    </ul>
                    <p className="mt-2">
                        Para ejercer estos derechos, por favor contáctenos a través de nuestro soporte.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">7. Cambios a esta Política</h2>
                    <p>
                        Podemos actualizar nuestra Política de Privacidad periódicamente. Le notificaremos cualquier cambio publicando la nueva política en esta página
                        y actualizando la fecha de &quot;Última actualización&quot;.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">8. Contacto</h2>
                    <p>
                        Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos (alberto.hernandez@cat.com).
                    </p>
                </section>
            </div>
        </div>
    );
}
