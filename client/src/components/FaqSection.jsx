import { Link } from "react-router-dom";

const faqs = [
  {
    q: "¿Dónde entregan?",
    a: "Entregamos en Guadalajara, Jalisco y zona metropolitana. El checkout valida el código postal antes de registrar el pedido.",
  },
  {
    q: "¿Con cuánto tiempo debo pedir?",
    a: "Para catálogo regular recomendamos pedir con al menos 24 horas. Para pedidos personalizados, idealmente 3 a 5 días antes.",
  },
  {
    q: "¿Puedo pedir algo personalizado?",
    a: "Sí. Puedes enviar una solicitud con fecha, número de porciones, presupuesto y detalles desde el formulario de pedido especial.",
  },
  {
    q: "¿Cómo pago?",
    a: "El pedido se registra y se abre WhatsApp para confirmar disponibilidad, horario y datos de pago.",
  },
];

const FaqSection = () => (
  <section className="reveal-on-scroll mt-24">
    <div className="text-center">
      <span className="section-kicker">Dudas comunes</span>
      <h2 className="section-title mx-auto">Antes de hacer tu pedido</h2>
    </div>
    <div className="mt-8 grid items-start gap-3 md:grid-cols-2">
      {faqs.map((item) => (
        <details key={item.q} className="glass-card group rounded-2xl p-5">
          <summary className="cursor-pointer list-none font-display text-lg font-bold text-cocoa">
            {item.q}
            <span className="float-right text-primary-dull transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-stone-500">{item.a}</p>
        </details>
      ))}
    </div>
    <div className="mt-6 text-center">
      <Link to="/delivery-policy" className="text-sm font-bold text-primary-dull underline-offset-4 hover:underline">
        Ver política completa de entregas
      </Link>
    </div>
  </section>
);

export default FaqSection;
