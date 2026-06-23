import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { saveReview } from "../lib/businessTools";

const Review = () => {
  const [params] = useSearchParams();
  const [rating, setRating] = useState(5);
  const [customerName, setCustomerName] = useState((params.get("name") || "").slice(0, 100));
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const orderId = (params.get("order") || "").slice(0, 120);

  const submit = (event) => {
    event.preventDefault();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      toast.error("Elige una calificación válida");
      return;
    }
    saveReview({ rating, customerName, comment, orderId });
    setSaved(true);
    toast.success("Gracias por tu reseña");
  };

  if (saved) {
    return (
      <section className="mx-auto mb-20 mt-10 max-w-xl text-center">
        <span className="section-kicker">Gracias</span>
        <h1 className="section-title mx-auto">Tu opinión ayuda a mejorar</h1>
        <p className="mt-4 text-sm leading-6 text-stone-500">Gracias por tomarte el tiempo de contar cómo fue tu experiencia.</p>
        <Link to="/products" className="btn-primary mt-7 px-7 py-3">Volver a la vitrina</Link>
      </section>
    );
  }

  return (
    <section className="customer-flow mx-auto mb-20 mt-10 max-w-xl animate-fade-in">
      <span className="section-kicker">Tu experiencia</span>
      <h1 className="section-title">¿Cómo estuvo tu pedido?</h1>
      <form onSubmit={submit} className="glass-card mt-8 space-y-5 rounded-[2rem] p-6 md:p-8">
        <div>
          <label className="mb-2 block text-sm">Calificación</label>
          <div className="flex gap-2 text-3xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" aria-label={`Calificar con ${star} ${star === 1 ? "estrella" : "estrellas"}`} aria-pressed={rating === star} onClick={() => setRating(star)} className={star <= rating ? "text-[#d99b4f]" : "text-stone-200"}>★</button>
            ))}
          </div>
        </div>
        <input maxLength={100} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tu nombre" className="w-full rounded-xl px-4 py-3" />
        <textarea maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario opcional" className="min-h-32 w-full rounded-xl px-4 py-3" />
        {orderId && <p className="text-xs text-stone-400">Pedido: {orderId}</p>}
        <button className="btn-primary w-full py-3">Enviar reseña</button>
      </form>
    </section>
  );
};

export default Review;
