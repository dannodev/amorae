import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  downloadCsv,
  readChecklist,
  readCustomOrders,
  saveChecklist,
  updateCustomOrderStatus,
} from "../../lib/businessTools";

const todayKey = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const SellerOpsPanel = ({ orders, products, rawMaterials, currency }) => {
  const [dateKey, setDateKey] = useState(todayKey());
  const [items, setItems] = useState(() => readChecklist(todayKey()));
  const [customOrders, setCustomOrders] = useState(() => readCustomOrders());

  const lowStockProducts = products.filter((p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold);
  const lowStockMaterials = rawMaterials.filter((m) => m.stockQuantity <= m.lowStockThreshold);
  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const rawPhone = order.phoneNormalized || order.customer?.phone || order.phone;
      const phone = String(rawPhone || "").replace(/\D/g, "");
      if (!phone || phone === "0000000000") return;
      const current = map.get(phone) || {
        name: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim() || "Cliente",
        phone,
        orders: 0,
        spent: 0,
        lastOrder: order.createdAt,
      };
      current.orders += 1;
      current.spent += Number(order.amount || 0) + Number(order.deliveryFee || 0);
      if (new Date(order.createdAt || 0) > new Date(current.lastOrder || 0)) current.lastOrder = order.createdAt;
      map.set(phone, current);
    });
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [orders]);

  const toggleItem = (id) => {
    const next = items.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    setItems(saveChecklist(dateKey, next));
  };

  const loadDate = (value) => {
    setDateKey(value);
    setItems(readChecklist(value));
  };

  const addItem = () => {
    const text = prompt("Nueva tarea de producción");
    if (!text?.trim()) return;
    const next = [...items, { id: crypto.randomUUID?.() || `task_${Date.now()}`, text: text.trim(), done: false }];
    setItems(saveChecklist(dateKey, next));
  };

  const sendLowStockAlert = async () => {
    const lines = [
      "*Alerta de inventario Amorae*",
      ...lowStockProducts.map((p) => `• ${p.name}: ${p.stockQuantity} unidades`),
      ...lowStockMaterials.map((m) => `• ${m.name}: ${m.stockQuantity} ${m.unit}`),
    ];
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Alerta copiada. Puedes pegarla en WhatsApp o email.");
    } catch {
      toast.error("No se pudo copiar. Revisa los permisos del navegador.");
    }
  };

  const exportCustomers = () => {
    downloadCsv("amorae-clientes.csv", customers.map((customer) => ({
      nombre: customer.name,
      telefono: customer.phone,
      pedidos: customer.orders,
      gastado: customer.spent.toFixed(2),
      ultimo_pedido: customer.lastOrder,
    })));
  };

  const setCustomStatus = (id, status) => {
    setCustomOrders(updateCustomOrderStatus(id, status));
    toast.success("Solicitud actualizada");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Producción diaria</span>
            <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Checklist del obrador</h3>
          </div>
          <input type="date" value={dateKey} onChange={(e) => loadDate(e.target.value)} className="seller-input rounded-xl px-3 py-2 text-sm" />
        </div>
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#fbf6ef] p-3 text-sm">
              <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} />
              <span className={item.done ? "text-stone-400 line-through" : "font-semibold text-cocoa"}>{item.text}</span>
            </label>
          ))}
        </div>
        <button onClick={addItem} className="mt-4 rounded-full bg-[#f4e8d8] px-4 py-2 text-xs font-bold text-primary-dull">+ Agregar tarea</button>
      </section>

      <section className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-red-600">Alertas</span>
        <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Stock bajo</h3>
        <div className="mt-4 max-h-72 space-y-2 overflow-auto">
          {[...lowStockProducts, ...lowStockMaterials].length === 0 && <p className="text-sm text-stone-400">Todo el inventario está en buen nivel.</p>}
          {lowStockProducts.map((p) => <p key={p._id} className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{p.name}: {p.stockQuantity} unidades</p>)}
          {lowStockMaterials.map((m) => <p key={m.id} className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{m.name}: {m.stockQuantity} {m.unit}</p>)}
        </div>
        <button disabled={!lowStockProducts.length && !lowStockMaterials.length} onClick={sendLowStockAlert} className="btn-primary mt-4 px-5 py-2.5 text-xs disabled:opacity-50">Copiar alerta WhatsApp/email</button>
      </section>

      <section className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Clientes</span>
            <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Base de clientes</h3>
          </div>
          <button onClick={exportCustomers} className="rounded-full bg-cocoa px-4 py-2 text-xs font-bold text-white">CSV</button>
        </div>
        <div className="mt-4 max-h-80 divide-y divide-primary-dull/8 overflow-auto">
          {customers.map((customer) => (
            <div key={customer.phone} className="flex justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-bold text-cocoa">{customer.name}</p>
                <p className="text-xs text-stone-400">{customer.phone} · {customer.orders} pedidos</p>
              </div>
              <strong className="text-primary-dull">{currency}{customer.spent.toFixed(0)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Solicitudes</span>
        <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Pedidos especiales</h3>
        <div className="mt-4 max-h-80 space-y-3 overflow-auto">
          {customOrders.length === 0 && <p className="text-sm text-stone-400">Aún no hay solicitudes especiales.</p>}
          {customOrders.map((request) => (
            <article key={request.id} className="rounded-2xl bg-[#fbf6ef] p-4 text-sm">
              <div className="flex justify-between gap-3">
                <strong className="text-cocoa">{request.name}</strong>
                <select value={request.status} onChange={(e) => setCustomStatus(request.id, e.target.value)} className="seller-input rounded-lg px-2 py-1 text-xs">
                  <option>Nuevo</option>
                  <option>Contactado</option>
                  <option>Cotizado</option>
                  <option>Confirmado</option>
                  <option>Cerrado</option>
                </select>
              </div>
              <p className="mt-1 text-stone-500">{request.dessertType} · {request.eventDate || "Sin fecha"} · {request.servings || "Sin porciones"}</p>
              <p className="mt-2 text-xs leading-5 text-stone-500">{request.details}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SellerOpsPanel;
