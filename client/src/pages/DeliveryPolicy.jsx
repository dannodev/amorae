import { Link } from "react-router-dom";

const DeliveryPolicy = () => (
  <section className="customer-flow mx-auto mb-20 mt-10 max-w-3xl animate-fade-in">
    <span className="section-kicker">Entregas</span>
    <h1 className="section-title">Política de entrega</h1>
    <div className="glass-card mt-8 space-y-6 rounded-[2rem] p-6 text-sm leading-7 text-stone-600 md:p-8">
      <p>Amorae realiza entregas en Guadalajara, Jalisco y zona metropolitana. La disponibilidad se valida por código postal durante el checkout.</p>
      <div>
        <h2 className="font-display text-xl font-bold text-cocoa">Costo de envío</h2>
        <p className="mt-2">El costo se calcula automáticamente según distancia y promociones activas. Los pedidos de $600 MXN o más tienen envío gratis hasta 15 km.</p>
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-cocoa">Horarios</h2>
        <p className="mt-2">El horario preferido se solicita al finalizar el pedido. Lo confirmaremos por WhatsApp según capacidad de producción y ruta de entrega.</p>
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-cocoa">Dirección y recepción</h2>
        <p className="mt-2">El cliente debe compartir calle, número, colonia, código postal y referencias suficientes. Si hay un pin de ubicación, se usa solo como apoyo.</p>
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-cocoa">Cambios</h2>
        <p className="mt-2">Cualquier cambio de dirección u horario debe solicitarse por WhatsApp antes de preparar la ruta.</p>
      </div>
      <Link to="/checkout" className="btn-primary px-6 py-3 text-sm">Volver al checkout</Link>
    </div>
  </section>
);

export default DeliveryPolicy;
