import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import SalesInsights from "./SalesInsights";
import { downloadCsv } from "../../lib/businessTools";

const CATEGORIES = ["Empaque", "Envíos", "Servicios", "Renta", "Marketing", "Equipo", "Nómina", "Impuestos", "Otro"];
const localDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
const parseBusinessDate = (value) =>
  new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);

const FinancePanel = ({
  orders,
  expenses,
  products,
  rawMaterials = [],
  productRecipes = {},
  currency,
  addExpense,
  deleteExpense,
  createOrder,
  onSaleCreated,
}) => {
  const [period, setPeriod] = useState("month");
  const [openForm, setOpenForm] = useState(null);
  const [salePending, setSalePending] = useState(false);
  const [form, setForm] = useState({
    category: "Empaque",
    description: "",
    amount: "",
    incurredAt: localDateValue(),
  });
  const [sale, setSale] = useState({
    customerName: "",
    paymentMethod: "cash",
    notes: "",
    items: {},
  });

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "year") return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }, [period]);

  const report = useMemo(() => {
    const periodOrders = orders.filter((order) => {
      const date = new Date(order.createdAt || 0);
      return date >= periodStart && order.status === "Entregado";
    });
    const periodExpenses = expenses.filter((expense) => {
      const date = expense?.incurredAt ? parseBusinessDate(expense.incurredAt) : null;
      return date && !Number.isNaN(date.getTime()) && date >= periodStart;
    });
    const productRevenue = periodOrders.reduce((total, order) => total + Number(order.amount || 0), 0);
    const deliveryCollected = periodOrders.reduce((total, order) => total + (Number(order.deliveryFee) || 0), 0);
    const revenue = productRevenue + deliveryCollected;
    const cogs = periodOrders.reduce((total, order) => total + Number(order.cogs || 0), 0);
    const operatingExpenses = periodExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const averageTicket = periodOrders.length ? revenue / periodOrders.length : 0;
    return {
      periodOrders,
      periodExpenses,
      productRevenue,
      deliveryCollected,
      revenue,
      cogs,
      operatingExpenses,
      grossProfit,
      netProfit,
      margin,
      averageTicket,
    };
  }, [expenses, orders, periodStart]);

  const submitExpense = async (event) => {
    event.preventDefault();
    try {
      await addExpense(form);
      toast.success("Gasto registrado");
      setForm({ category: "Empaque", description: "", amount: "", incurredAt: localDateValue() });
      setOpenForm(null);
    } catch (error) {
      toast.error(error.message || "No se pudo registrar el gasto");
    }
  };

  const selectedSaleItems = products
    .filter((product) => Number(sale.items[product._id] || 0) > 0)
    .map((product) => ({
      product,
      quantity: Number(sale.items[product._id]),
    }));
  const saleTotal = selectedSaleItems.reduce(
    (total, item) => total + Number(item.product.offerPrice || 0) * item.quantity,
    0
  );

  const updateSaleQuantity = (product, quantity) => {
    const numericQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    const safeQuantity = product.trackInventory
      ? Math.min(numericQuantity, product.stockQuantity)
      : numericQuantity;
    setSale((current) => ({
      ...current,
      items: { ...current.items, [product._id]: safeQuantity },
    }));
  };

  const submitSale = async (event) => {
    event.preventDefault();
    if (!selectedSaleItems.length) {
      toast.error("Agrega al menos un producto");
      return;
    }
    setSalePending(true);
    try {
      const order = await createOrder({
        status: "Entregado",
        isPaid: true,
        amount: saleTotal,
        phone: "Venta manual",
        phoneNormalized: "0000000000",
        paymentMethod: sale.paymentMethod,
        customer: {
          firstName: sale.customerName.trim() || "Venta",
          lastName: "manual",
          phone: "Venta presencial",
        },
        address: {
          street: "Venta presencial",
          colonia: "",
          city: "",
          state: "",
          notes: sale.notes.trim(),
        },
        items: selectedSaleItems.map(({ product, quantity }) => ({
          productId: product._id,
          name: product.name,
          category: product.category,
          image: product.image?.[0],
          offerPrice: product.offerPrice,
          quantity,
        })),
      });
      onSaleCreated(order);
      setSale({ customerName: "", paymentMethod: "cash", notes: "", items: {} });
      setOpenForm(null);
      toast.success("Venta registrada e inventario actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo registrar la venta");
    } finally {
      setSalePending(false);
    }
  };

  const money = (value) => {
    const amount = Number(value);
    const formatted = Math.abs(amount).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${amount < 0 ? "−" : ""}${currency}${formatted}`;
  };
  const cards = [
    { label: "Ingresos", value: money(report.revenue), note: `${report.periodOrders.length} ventas entregadas`, accent: "#5E8062" },
    { label: "Envíos cobrados", value: money(report.deliveryCollected), note: "Tarifa de entrega a domicilio", accent: "#7A6A9E" },
    { label: "Costo de venta", value: money(report.cogs), note: "Ingredientes y costo directo", accent: "#C49735" },
    { label: "Utilidad real", value: money(report.netProfit), note: `${report.margin.toFixed(1)}% de margen neto`, accent: report.netProfit >= 0 ? "#5E8062" : "#B85C4A" },
  ];
  const ingredientUsage = useMemo(() => {
    const materialMap = new Map(rawMaterials.map((material) => [material.id, material]));
    const usage = new Map();
    report.periodOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const recipe = productRecipes[item.productId] || [];
        recipe.forEach((ingredient) => {
          const material = materialMap.get(ingredient.materialId);
          const quantity = Number(ingredient.quantity || 0) * Number(item.quantity || 0);
          const current = usage.get(ingredient.materialId) || {
            id: ingredient.materialId,
            name: material?.name || "Ingrediente",
            unit: material?.unit || "",
            quantity: 0,
            cost: 0,
          };
          current.quantity += quantity;
          current.cost += quantity * Number(material?.costPerUnit || 0);
          usage.set(ingredient.materialId, current);
        });
      });
    });
    return [...usage.values()].sort((a, b) => b.cost - a.cost);
  }, [productRecipes, rawMaterials, report.periodOrders]);

  const exportOrders = () => {
    downloadCsv("amorae-ordenes.csv", report.periodOrders.map((order) => ({
      id: order.id,
      fecha: order.createdAt,
      cliente: `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
      telefono: order.customer?.phone || order.phone,
      estado: order.status,
      subtotal: Number(order.amount || 0).toFixed(2),
      envio: Number(order.deliveryFee || 0).toFixed(2),
      cogs: Number(order.cogs || 0).toFixed(2),
      total: (Number(order.amount || 0) + Number(order.deliveryFee || 0)).toFixed(2),
    })));
  };

  const exportFinance = () => {
    downloadCsv("amorae-finanzas.csv", [
      { concepto: "Ventas productos", monto: report.productRevenue.toFixed(2) },
      { concepto: "Envíos cobrados", monto: report.deliveryCollected.toFixed(2) },
      { concepto: "Ingresos totales", monto: report.revenue.toFixed(2) },
      { concepto: "Costo de venta", monto: report.cogs.toFixed(2) },
      { concepto: "Gastos operativos", monto: report.operatingExpenses.toFixed(2) },
      { concepto: "Utilidad neta", monto: report.netProfit.toFixed(2) },
      { concepto: "Margen neto", monto: `${report.margin.toFixed(1)}%` },
    ]);
  };

  const cashMovements = [
    ...report.periodOrders.flatMap((order) => {
      const fee = Number(order.deliveryFee) || 0;
      const subtotal = Number(order.amount || 0);
      const movements = [{
        id: `order_${order.id}`,
        type: "income",
        title: `Venta · ${order.customer?.firstName || "Cliente"}`,
        category: "Ingreso",
        amount: subtotal,
        date: order.createdAt,
      }];
      if (fee > 0) {
        movements.push({
          id: `delivery_${order.id}`,
          type: "income",
          title: `Envío · ${order.customer?.firstName || "Cliente"}`,
          category: "Envío a domicilio",
          amount: fee,
          date: order.createdAt,
        });
      }
      return movements;
    }),
    ...report.periodExpenses.map((expense) => ({
      id: `expense_${expense.id}`,
      type: "expense",
      title: expense.description,
      category: expense.category,
      amount: Number(expense.amount),
      date: expense.incurredAt,
      expenseId: expense.id,
    })),
  ].sort((a, b) => parseBusinessDate(b.date) - parseBusinessDate(a.date));

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-[2rem] bg-cocoa px-6 py-7 text-white shadow-[0_22px_55px_rgba(61,32,21,.2)] md:px-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[48px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e5b27d]">Control financiero</span>
            <h2 className="font-display mt-2 text-3xl font-bold">Finanzas del negocio</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">Ventas menos ingredientes y gastos operativos: esta es tu utilidad real.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-full border border-white/10 bg-white/10 px-4 py-2.5 text-xs font-bold text-white outline-none [&>option]:text-cocoa">
              <option value="month">Este mes</option>
              <option value="year">Este año</option>
              <option value="all">Todo</option>
            </select>
            <button type="button" onClick={() => setOpenForm(openForm === "sale" ? null : "sale")} className="cursor-pointer rounded-full bg-[#e5b27d] px-4 py-2.5 text-xs font-bold text-cocoa">+ Nueva venta</button>
            <button type="button" onClick={() => setOpenForm(openForm === "expense" ? null : "expense")} className="cursor-pointer rounded-full bg-white px-4 py-2.5 text-xs font-bold text-cocoa">+ Registrar gasto</button>
            <button type="button" onClick={exportOrders} className="cursor-pointer rounded-full border border-white/15 px-4 py-2.5 text-xs font-bold text-white">CSV órdenes</button>
            <button type="button" onClick={exportFinance} className="cursor-pointer rounded-full border border-white/15 px-4 py-2.5 text-xs font-bold text-white">CSV finanzas</button>
          </div>
        </div>
      </div>

      {openForm === "sale" && (
        <form onSubmit={submitSale} className="seller-glass rounded-[1.75rem] p-5 md:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-green-700">Venta presencial</span>
              <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Registrar nueva venta</h3>
              <p className="mt-1 text-xs text-stone-500">Se descontarán productos e ingredientes y se calculará la utilidad automáticamente.</p>
            </div>
            <div className="rounded-2xl bg-[#edf5ed] px-5 py-3 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-green-700">Total</span>
              <strong className="font-display text-2xl text-green-800">{money(saleTotal)}</strong>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const quantity = Number(sale.items[product._id] || 0);
              return (
                <div key={product._id} className={`rounded-2xl border p-3 transition ${quantity > 0 ? "border-green-300 bg-green-50/60" : "border-primary-dull/8 bg-[#fbf6ef]"}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5">
                      <img loading="lazy" decoding="async" src={product.image?.[0]} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-cocoa">{product.name}</p>
                      <p className="text-xs text-stone-400">{money(product.offerPrice)} · {product.stockQuantity} disponibles</p>
                    </div>
                    <input
                      aria-label={`Cantidad de ${product.name}`}
                      type="number"
                      min="0"
                      max={product.trackInventory ? product.stockQuantity : undefined}
                      value={quantity || ""}
                      onChange={(event) => updateSaleQuantity(product, event.target.value)}
                      placeholder="0"
                      className="seller-input h-10 w-16 rounded-xl px-2 text-center text-sm font-bold"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_auto]">
            <input value={sale.customerName} onChange={(event) => setSale({ ...sale, customerName: event.target.value })} placeholder="Cliente (opcional)" className="seller-input rounded-xl px-4 py-3 text-sm" />
            <select value={sale.paymentMethod} onChange={(event) => setSale({ ...sale, paymentMethod: event.target.value })} className="seller-input rounded-xl px-3 py-3 text-sm">
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="other">Otro</option>
            </select>
            <input value={sale.notes} onChange={(event) => setSale({ ...sale, notes: event.target.value })} placeholder="Nota de la venta (opcional)" className="seller-input rounded-xl px-4 py-3 text-sm" />
            <button disabled={salePending || !selectedSaleItems.length} className="btn-primary px-6 py-3 text-xs disabled:cursor-not-allowed disabled:opacity-50">
              {salePending ? "Registrando..." : "Registrar venta"}
            </button>
          </div>
        </form>
      )}

      {openForm === "expense" && (
        <form onSubmit={submitExpense} className="seller-glass rounded-[1.75rem] p-5 md:p-7">
          <h3 className="font-display text-2xl font-bold text-cocoa">Registrar salida de dinero</h3>
          <p className="mt-1 text-xs text-stone-500">Las compras de ingredientes se registran en Materias primas y pasan a costo conforme se venden.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_auto]">
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="seller-input rounded-xl px-3 py-3 text-sm">
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
            <input required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descripción del gasto" className="seller-input rounded-xl px-4 py-3 text-sm" />
            <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Monto" className="seller-input rounded-xl px-4 py-3 text-sm" />
            <input required type="date" value={form.incurredAt} onChange={(event) => setForm({ ...form, incurredAt: event.target.value })} className="seller-input rounded-xl px-3 py-3 text-sm" />
            <button className="btn-primary cursor-pointer px-5 py-3 text-xs">Guardar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="seller-card-3d seller-glass relative overflow-hidden rounded-[1.6rem] p-5">
            <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-10" style={{ backgroundColor: card.accent }} />
            <span className="mb-5 block h-1 w-8 rounded-full" style={{ backgroundColor: card.accent }} />
            <strong className="font-display block text-xl text-cocoa sm:text-3xl">{card.value}</strong>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] text-stone-500 sm:text-xs">{card.label}</span>
            <span className="mt-2 block text-[11px] text-stone-400">{card.note}</span>
          </div>
        ))}
      </div>

      <SalesInsights
        orders={orders}
        expenses={expenses}
        products={products}
        periodStart={periodStart}
        currency={currency}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
          <h3 className="font-display text-xl font-bold text-cocoa">Estado de resultados</h3>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Ventas (productos)</span><strong className="text-green-700">{money(report.productRevenue)}</strong></div>
            <div className="flex justify-between"><span className="text-stone-500">+ Envíos cobrados</span><strong className="text-green-700">{money(report.deliveryCollected)}</strong></div>
            <div className="flex justify-between border-t border-primary-dull/8 pt-3"><span className="text-stone-500">Ingresos totales</span><strong>{money(report.revenue)}</strong></div>
            <div className="flex justify-between"><span className="text-stone-500">− Costo de ingredientes</span><strong>{money(report.cogs)}</strong></div>
            <div className="flex justify-between border-t border-primary-dull/8 pt-3"><span className="font-semibold text-cocoa">Utilidad bruta</span><strong>{money(report.grossProfit)}</strong></div>
            <div className="flex justify-between"><span className="text-stone-500">− Gastos operativos</span><strong>{money(report.operatingExpenses)}</strong></div>
            <div className="flex justify-between rounded-2xl bg-[#f4e8d8] p-4"><span className="font-bold text-cocoa">Utilidad neta</span><strong className={report.netProfit >= 0 ? "text-green-700" : "text-red-600"}>{money(report.netProfit)}</strong></div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#fbf6ef] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Ticket promedio</span>
              <strong className="font-display mt-2 block text-xl text-cocoa">{money(report.averageTicket)}</strong>
            </div>
            <div className="rounded-2xl bg-[#fbf6ef] p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Margen neto</span>
              <strong className="font-display mt-2 block text-xl text-cocoa">{report.margin.toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
          <h3 className="font-display text-xl font-bold text-cocoa">Flujo de dinero</h3>
          <p className="mt-1 text-xs text-stone-400">Ingresos entregados y salidas registradas.</p>
          <div className="mt-4 max-h-[420px] divide-y divide-primary-dull/8 overflow-y-auto pr-1">
            {cashMovements.length === 0 && <p className="py-12 text-center text-sm text-stone-400">Aún no hay movimientos en este periodo.</p>}
            {cashMovements.map((movement) => (
              <div key={movement.id} className="flex items-center gap-3 py-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                  movement.type === "income"
                    ? movement.category === "Envío a domicilio"
                      ? "bg-[#efeafc] text-[#5E4B8B]"
                      : "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {movement.type === "income" ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cocoa">{movement.title}</p>
                  <p className="text-xs text-stone-400">{movement.category} · {parseBusinessDate(movement.date).toLocaleDateString("es-MX")}</p>
                </div>
                <strong className={
                  movement.type === "income"
                    ? movement.category === "Envío a domicilio"
                      ? "text-[#5E4B8B]"
                      : "text-green-700"
                    : "text-red-600"
                }>{movement.type === "income" ? "+" : "−"}{money(movement.amount)}</strong>
                {movement.expenseId && (
                  <button type="button" onClick={async () => {
                    try {
                      await deleteExpense(movement.expenseId);
                      toast.success("Gasto eliminado");
                    } catch {
                      toast.error("No se pudo eliminar");
                    }
                  }} aria-label={`Eliminar ${movement.title}`} className="cursor-pointer text-lg text-stone-300 transition hover:text-red-500">&times;</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <h3 className="font-display text-xl font-bold text-cocoa">Reporte mensual e ingredientes usados</h3>
        <p className="mt-1 text-xs text-stone-400">Basado en ventas entregadas del periodo seleccionado.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ingredientUsage.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#fbf6ef] p-4">
              <p className="truncate text-sm font-bold text-cocoa">{item.name}</p>
              <p className="mt-1 text-xs text-stone-500">{item.quantity.toLocaleString("es-MX", { maximumFractionDigits: 2 })} {item.unit}</p>
              <p className="mt-2 text-sm font-bold text-primary-dull">{money(item.cost)}</p>
            </div>
          ))}
          {!ingredientUsage.length && <p className="text-sm text-stone-400 md:col-span-3">Agrega recetas a tus productos para ver consumo de materias primas.</p>}
        </div>
      </div>
    </div>
  );
};

export default FinancePanel;
