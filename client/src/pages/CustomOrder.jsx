import { useState } from "react";
import toast from "react-hot-toast";
import { saveCustomOrder } from "../lib/businessTools";

const getWhatsAppNumber = () => {
  const raw = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || "523330089383";
  return raw.replace(/\D/g, "") || "523330089383";
};
const localDateValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const CustomOrder = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    eventDate: "",
    servings: "",
    dessertType: "Mesa dulce",
    budget: "",
    details: "",
  });

  const submit = (event) => {
    event.preventDefault();
    const normalizedPhone = form.phone.replace(/\D/g, "");
    if (!form.name.trim() || !form.details.trim() || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      toast.error("Completa nombre, un teléfono válido y los detalles del pedido.");
      return;
    }
    const request = saveCustomOrder(form);
    const message = [
      "*Pedido especial Amorae*",
      `Cliente: ${request.name}`,
      `Teléfono: ${request.phone}`,
      `Fecha: ${request.eventDate || "Por definir"}`,
      `Porciones: ${request.servings || "Por definir"}`,
      `Tipo: ${request.dessertType}`,
      `Presupuesto: ${request.budget || "Por definir"}`,
      `Detalles: ${request.details}`,
      `ID solicitud: ${request.id}`,
    ].join("\n");
    toast.success("Solicitud guardada. Abriendo WhatsApp...");
    window.location.assign(`https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`);
  };

  return (
    <section className="customer-flow mx-auto mb-20 mt-10 max-w-3xl animate-fade-in">
      <span className="section-kicker">Pedido especial</span>
      <h1 className="section-title">Cuéntanos qué quieres crear</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
        Este formulario guarda la solicitud y abre WhatsApp para confirmar detalles, tiempos y cotización.
      </p>
      <form onSubmit={submit} className="glass-card mt-8 grid gap-4 rounded-[2rem] p-6 md:grid-cols-2 md:p-8">
        <input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="rounded-xl px-4 py-3" />
        <input required type="tel" inputMode="tel" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="WhatsApp" className="rounded-xl px-4 py-3" />
        <input type="date" min={localDateValue()} value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="rounded-xl px-4 py-3" />
        <input maxLength={80} value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} placeholder="Porciones o piezas" className="rounded-xl px-4 py-3" />
        <select value={form.dessertType} onChange={(e) => setForm({ ...form, dessertType: e.target.value })} className="rounded-xl px-4 py-3">
          <option>Mesa dulce</option>
          <option>Brownies personalizados</option>
          <option>Roles para evento</option>
          <option>Caja regalo</option>
          <option>Otro</option>
        </select>
        <input maxLength={80} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="Presupuesto aproximado" className="rounded-xl px-4 py-3" />
        <textarea required maxLength={1500} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Describe colores, sabores, ocasión, restricciones, entrega..." className="min-h-36 rounded-xl px-4 py-3 md:col-span-2" />
        <button className="btn-primary py-3 md:col-span-2">Enviar solicitud</button>
      </form>
    </section>
  );
};

export default CustomOrder;
