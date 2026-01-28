import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Eliminación de Datos | Nexus",
    description: "Instrucciones para solicitar la eliminación de datos en Nexus.",
};

export default function DataDeletionPage() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Instrucciones de Eliminación de Datos</h1>

            <div className="space-y-6 text-muted-foreground text-sm leading-relaxed">
                <p>
                    En Nexus, valoramos su privacidad y le damos control sobre sus datos personales. De acuerdo con las políticas de la plataforma Facebook/Meta
                    y las regulaciones de protección de datos (como el RGPD), usted tiene derecho a solicitar la eliminación de sus datos de nuestros servidores.
                </p>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">Cómo solicitar la eliminación de sus datos</h2>
                    <p>
                        Si desea eliminar su cuenta y todos los datos asociados a ella, por favor siga estos pasos:
                    </p>
                    <ol className="list-decimal pl-5 mt-2 space-y-2">
                        <li>
                            Envíe un correo electrónico a nuestro equipo de soporte a: <strong>alberto.hernandez@cat.com</strong>
                        </li>
                        <li>
                            Utilice el asunto: <strong>&quot;Solicitud de Eliminación de Datos&quot;</strong>.
                        </li>
                        <li>
                            En el cuerpo del mensaje, por favor indique claramente su deseo de eliminar su cuenta e incluya la dirección de correo electrónico
                            asociada a su cuenta de Nexus para que podamos verificar su identidad.
                        </li>
                    </ol>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">Proceso de Eliminación</h2>
                    <p>
                        Una vez recibida su solicitud:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>
                            Nuestro equipo revisará su solicitud y podrá contactarlo para finalizar la verificación de identidad si es necesario.
                        </li>
                        <li>
                            Procederemos a eliminar su cuenta y todos los datos personales asociados (perfil, registros de actividad, etc.) de nuestra base de datos activa.
                        </li>
                        <li>
                            Este proceso se completará en un plazo máximo de 30 días hábiles.
                        </li>
                        <li>
                            Recibirá una confirmación por correo electrónico una vez que la eliminación se haya completado.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">Retención de Datos</h2>
                    <p>
                        Tenga en cuenta que podemos retener cierta información anónima o agregada para fines analíticos, o datos que estemos obligados a conservar
                        por motivos legales, fiscales o de seguridad, incluso después de que se elimine su cuenta.
                    </p>
                </section>
            </div>
        </div>
    );
}
