import { Link } from "react-router-dom";
import { readReviews } from "../lib/businessTools";

const ReviewsSection = () => {
  const reviews = readReviews().filter((review) => review.approved).slice(0, 3);

  return (
    <section className="reveal-on-scroll mt-24">
      <div className="flex flex-col justify-between gap-4 text-center md:flex-row md:items-end md:text-left">
        <div>
          <span className="section-kicker">Opiniones reales</span>
          <h2 className="section-title">Lo que dicen después de probar</h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-stone-500">
          Opiniones compartidas por clientes después de probar sus pedidos.
        </p>
      </div>

      {reviews.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {reviews.map((review) => (
            <article key={review.id} className="glass-card rounded-[1.75rem] p-5">
              <div className="text-lg text-[#d99b4f]">{"★".repeat(review.rating)}<span className="text-stone-200">{"★".repeat(5 - review.rating)}</span></div>
              <p className="mt-4 text-sm leading-6 text-stone-600">“{review.comment || "Todo llegó perfecto y delicioso."}”</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-primary-dull">{review.customerName}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-primary-dull/18 bg-white/45 p-7 text-center">
          <p className="font-display text-xl font-bold text-cocoa">Todavía estamos reuniendo reseñas.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            Después de entregar cada pedido, el panel de vendedor puede enviar un enlace de reseña por WhatsApp.
          </p>
          <Link to="/products" className="btn-primary mt-5 px-6 py-3 text-sm">Probar algo dulce</Link>
        </div>
      )}
    </section>
  );
};

export default ReviewsSection;
