export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 text-slate-300">
      <h1 className="text-4xl font-bold text-white mb-8">Política de Privacidad</h1>
      <p className="mb-4">Última actualización: 2 de mayo de 2026</p>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">1. Información que recopilamos</h2>
        <p>Para el funcionamiento de <strong>Ranko AI</strong>, accedemos a la siguiente información a través de Google Business Profile API:</p>
        <ul className="list-disc ml-6 mt-2 space-y-2">
          <li>Información del perfil del negocio (Nombre, ubicación, ID de negocio).</li>
          <li>Reseñas y calificaciones de clientes.</li>
          <li>Dirección de correo electrónico del administrador para autenticación.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">2. Uso de los datos</h2>
        <p>Los datos obtenidos se utilizan exclusivamente para:</p>
        <ul className="list-disc ml-6 mt-2 space-y-2">
          <li>Notificar al usuario vía WhatsApp sobre nuevas reseñas recibidas.</li>
          <li>Generar sugerencias de respuesta mediante Inteligencia Artificial.</li>
          <li>Publicar respuestas aprobadas por el usuario en Google Business Profile.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">3. Compartir información</h2>
        <p>No vendemos ni compartimos sus datos personales con terceros. El contenido de las reseñas se procesa de forma anónima para generar respuestas. No almacenamos copias persistentes de su información de Google más allá de lo necesario para el servicio técnico.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-4">4. Sus derechos</h2>
        <p>Usted puede revocar el acceso de Ranko AI a su cuenta de Google en cualquier momento desde la configuración de seguridad de su cuenta de Google o contactándonos a <strong>soporte@rankoai.com</strong>.</p>
      </section>
    </div>
  );
}