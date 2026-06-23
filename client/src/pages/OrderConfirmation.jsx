import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state;

  const items = Array.isArray(data?.items) ? data.items.filter(Boolean) : [];
  const numericTotal = Number(data?.total);
  const total = Number.isFinite(numericTotal) && numericTotal >= 0 ? numericTotal : 0;
  const whatsappUrl = typeof data?.whatsappUrl === "string" && data.whatsappUrl.startsWith("https://wa.me/") ? data.whatsappUrl : "";
  const deliveryWindow = data?.deliveryWindow;
  const isPickup = data?.fulfillmentType === "pickup";

  const deliveryText = useMemo(() => {
    if (!deliveryWindow?.date) return "Por confirmar";
    return `${deliveryWindow.date}${deliveryWindow.time ? ` · ${deliveryWindow.time}` : ""}`;
  }, [deliveryWindow]);

  if (!data) {
    return (
      <section className="mx-auto mb-20 mt-10 max-w-xl text-center">
        <h1 className="section-title mx-auto">No hay pedido para confirmar</h1>
        <button onClick={() => navigate("/products")} className="btn-primary mt-6 px-7 py-3">Ver productos</button>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-20 mt-10 max-w-2xl animate-fade-in">
      <span className="section-kicker">Pedido registrado</span>
      <h1 className="section-title">Revisa y confirma por WhatsApp</h1>
      <div className="glass-card mt-8 rounded-[2rem] p-6 md:p-8">
        <div className="rounded-2xl bg-green-50 p-4 text-sm leading-6 text-green-800">
          Ya guardamos tu pedido. Falta abrir WhatsApp para confirmar disponibilidad, pago y horario.
        </div>
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={`${item.productId}-${item.name}`} className="flex justify-between gap-4 border-b border-primary-dull/8 pb-3 text-sm">
              <span>{item.quantity}x {item.name}</span>
              <strong>${Number(item.offerPrice || 0) * Number(item.quantity || 0)} MXN</strong>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 rounded-2xl bg-[#fbf6ef] p-4 text-sm">
          <div className="flex justify-between"><span>{isPickup ? "Recolección preferida" : "Entrega preferida"}</span><strong>{deliveryText}</strong></div>
          {isPickup && <div className="flex justify-between"><span>Punto de recolección</span><strong>{data.pickupLocation}</strong></div>}
          <div className="flex justify-between"><span>Total estimado</span><strong>${total} MXN</strong></div>
          <div className="flex justify-between"><span>ID</span><strong className="font-mono text-xs">{data.orderId}</strong></div>
        </div>
        {whatsappUrl ? (
          <a href={whatsappUrl} className="btn-primary mt-6 flex w-full py-3">Confirmar por WhatsApp</a>
        ) : (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">No pudimos preparar el enlace de WhatsApp. Consulta tu pedido con el teléfono registrado.</p>
        )}
        <Link to="/my-orders" className="mt-3 block text-center text-sm font-bold text-primary-dull">Consultar mis pedidos</Link>
      </div>
    </section>
  );
};

export default OrderConfirmation;
