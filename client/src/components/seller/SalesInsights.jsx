import { useMemo } from "react";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const PAYMENT_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  whatsapp: "WhatsApp",
  other: "Otro",
};
const parseBusinessDate = (value) =>
  new Date(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);

const startOfWeek = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
};

const periodDuration = (periodStart) => {
  const now = new Date();
  if (periodStart.getTime() === 0) return null;
  return Math.max(1, now.getTime() - periodStart.getTime());
};

const SalesInsights = ({ orders, expenses, products, periodStart, currency }) => {
  const analytics = useMemo(() => {
    const delivered = orders.filter((order) => order.status === "Entregado");
    const currentOrders = delivered.filter((order) => new Date(order.createdAt || 0) >= periodStart);
    const duration = periodDuration(periodStart);
    const previousStart = duration ? new Date(periodStart.getTime() - duration) : null;
    const previousOrders = duration
      ? delivered.filter((order) => {
          const date = new Date(order.createdAt || 0);
          return date >= previousStart && date < periodStart;
        })
      : [];

    const revenueOf = (list) => list.reduce((total, order) => total + Number(order.amount || 0), 0);
    const currentRevenue = revenueOf(currentOrders);
    const previousRevenue = revenueOf(previousOrders);
    const growth = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : currentRevenue > 0 ? 100 : 0;

    const productMap = new Map(products.map((product) => [product._id, {
      id: product._id,
      name: product.name,
      image: product.image?.[0],
      category: product.category,
      units: 0,
      revenue: 0,
    }]));
    const categoryMap = new Map();
    const paymentMap = new Map();
    const weekdayMap = DAY_LABELS.map((label) => ({ label, revenue: 0, orders: 0 }));
    const weekMap = new Map();

    currentOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const weekStart = startOfWeek(orderDate);
      const weekKey = weekStart.toISOString().slice(0, 10);
      const week = weekMap.get(weekKey) || { start: weekStart, revenue: 0, orders: 0 };
      week.revenue += Number(order.amount || 0);
      week.orders += 1;
      weekMap.set(weekKey, week);

      const weekday = weekdayMap[orderDate.getDay()];
      weekday.revenue += Number(order.amount || 0);
      weekday.orders += 1;

      const payment = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod || "Otro";
      paymentMap.set(payment, (paymentMap.get(payment) || 0) + Number(order.amount || 0));

      (order.items || []).forEach((item) => {
        const quantity = Number(item.quantity || 0);
        const revenue = quantity * Number(item.offerPrice || item.product?.offerPrice || 0);
        const current = productMap.get(item.productId) || {
          id: item.productId,
          name: item.name || item.product?.name || "Producto",
          image: item.image || item.product?.image?.[0],
          category: item.category || item.product?.category || "Otro",
          units: 0,
          revenue: 0,
        };
        current.units += quantity;
        current.revenue += revenue;
        productMap.set(item.productId, current);
        categoryMap.set(current.category, (categoryMap.get(current.category) || 0) + revenue);
      });
    });

    const productRanking = [...productMap.values()].sort((a, b) =>
      b.units - a.units || b.revenue - a.revenue
    );
    const weeks = [...weekMap.values()].sort((a, b) => a.start - b.start);
    const activeWeeks = weeks.filter((week) => week.orders > 0);
    const bestWeek = [...activeWeeks].sort((a, b) => b.revenue - a.revenue)[0];
    const worstWeek = [...activeWeeks].sort((a, b) => a.revenue - b.revenue)[0];
    const maxWeekdayRevenue = Math.max(...weekdayMap.map((day) => day.revenue), 1);
    const periodExpenses = expenses
      .map((expense) => ({ expense, date: parseBusinessDate(expense.incurredAt) }))
      .filter(({ date }) => date && !Number.isNaN(date.getTime()) && date >= periodStart)
      .map(({ expense }) => expense);
    const expenseCategories = periodExpenses
      .reduce((map, expense) => {
        map.set(expense.category, (map.get(expense.category) || 0) + Number(expense.amount || 0));
        return map;
      }, new Map());

    return {
      currentOrders,
      growth,
      comparisonAvailable: Boolean(duration && previousOrders.length),
      bestSeller: productRanking.find((product) => product.units > 0),
      slowestSeller: [...productRanking].reverse()[0],
      productRanking,
      bestWeek,
      worstWeek: activeWeeks.length > 1 ? worstWeek : null,
      weekdayMap,
      maxWeekdayRevenue,
      categoryMix: [...categoryMap.entries()].sort((a, b) => b[1] - a[1]),
      paymentMix: [...paymentMap.entries()].sort((a, b) => b[1] - a[1]),
      expenseMix: [...expenseCategories.entries()].sort((a, b) => b[1] - a[1]),
      currentRevenue,
    };
  }, [expenses, orders, periodStart, products]);

  const money = (value) =>
    `${currency}${Number(value || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
  const weekLabel = (week) => week
    ? `${week.start.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`
    : "Sin datos";

  if (!analytics.currentOrders.length) {
    return (
      <section className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Inteligencia de ventas</span>
        <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Conoce qué impulsa el negocio</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
          Cuando registres ventas entregadas, aquí aparecerán productos líderes, semanas fuertes, métodos de pago y oportunidades de mejora.
        </p>
      </section>
    );
  }

  const insightCards = [
    {
      label: "Más vendido",
      value: analytics.bestSeller?.name || "Sin datos",
      note: `${analytics.bestSeller?.units || 0} unidades · ${money(analytics.bestSeller?.revenue)}`,
      image: analytics.bestSeller?.image,
      tone: "bg-green-50 text-green-800",
    },
    {
      label: "Menor rotación",
      value: analytics.slowestSeller?.name || "Sin datos",
      note: `${analytics.slowestSeller?.units || 0} unidades en el periodo`,
      image: analytics.slowestSeller?.image,
      tone: "bg-amber-50 text-amber-800",
    },
    {
      label: "Mejor semana",
      value: weekLabel(analytics.bestWeek),
      note: `${money(analytics.bestWeek?.revenue)} · ${analytics.bestWeek?.orders || 0} ventas`,
      tone: "bg-[#edf5ed] text-green-800",
    },
    {
      label: "Semana más baja",
      value: analytics.worstWeek ? weekLabel(analytics.worstWeek) : "Faltan semanas",
      note: analytics.worstWeek
        ? `${money(analytics.worstWeek.revenue)} · ${analytics.worstWeek.orders} ventas`
        : "Se necesitan al menos 2 semanas activas",
      tone: "bg-[#fbf2e3] text-amber-800",
    },
  ];

  const mixBlock = (title, entries, total, emptyText) => (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-[.12em] text-stone-500">{title}</h4>
      <div className="mt-4 space-y-3">
        {entries.length === 0 && <p className="text-sm text-stone-400">{emptyText}</p>}
        {entries.slice(0, 5).map(([label, value]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-cocoa">{label}</span>
              <span className="text-stone-500">{money(value)} · {total > 0 ? ((value / total) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-primary-dull" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Inteligencia de ventas</span>
          <h3 className="font-display mt-1 text-2xl font-bold text-cocoa">Qué está funcionando</h3>
        </div>
        {analytics.comparisonAvailable ? (
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${analytics.growth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {analytics.growth >= 0 ? "↑" : "↓"} {Math.abs(analytics.growth).toFixed(1)}% vs. periodo anterior
          </span>
        ) : (
          <span className="w-fit rounded-full bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-500">Sin comparativo suficiente</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {insightCards.map((card) => (
          <div key={card.label} className="seller-card-3d seller-glass min-w-0 rounded-[1.5rem] p-4">
            <div className="flex items-start gap-3">
              {card.image && (
                <div className="hidden h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#fbf6ef] p-1.5 sm:flex">
                  <img loading="lazy" src={card.image} alt="" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div className="min-w-0">
                <span className={`inline-block rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${card.tone}`}>{card.label}</span>
                <strong className="font-display mt-2 block truncate text-base text-cocoa sm:text-lg">{card.value}</strong>
                <span className="mt-1 block text-[11px] leading-4 text-stone-400">{card.note}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
          <h4 className="font-display text-xl font-bold text-cocoa">Ritmo semanal</h4>
          <p className="mt-1 text-xs text-stone-400">Ingresos y pedidos por día de la semana.</p>
          <div className="mt-6 grid grid-cols-7 items-end gap-2">
            {analytics.weekdayMap.map((day) => (
              <div key={day.label} className="text-center">
                <span className="mb-2 block truncate text-[9px] font-semibold text-stone-400 sm:text-[10px]">{day.revenue ? money(day.revenue) : "—"}</span>
                <div className="flex h-32 items-end rounded-xl bg-[#fbf6ef] p-1.5">
                  <div
                    className="w-full rounded-lg bg-[linear-gradient(180deg,#d99b63,#8b4a2b)] transition-all"
                    style={{ height: `${Math.max(day.revenue ? 10 : 2, (day.revenue / analytics.maxWeekdayRevenue) * 100)}%` }}
                    title={`${day.orders} ventas`}
                  />
                </div>
                <span className="mt-2 block text-[10px] font-bold text-stone-500">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
          <h4 className="font-display text-xl font-bold text-cocoa">Ranking de productos</h4>
          <p className="mt-1 text-xs text-stone-400">Unidades vendidas en el periodo.</p>
          <div className="mt-4 space-y-2">
            {analytics.productRanking.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 rounded-xl bg-[#fbf6ef] px-3 py-2.5">
                <span className="font-display flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white text-sm font-bold text-primary-dull">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cocoa">{product.name}</span>
                <span className="text-right text-xs font-bold text-stone-500">{product.units} u.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="seller-glass grid gap-7 rounded-[1.75rem] p-5 md:grid-cols-3 md:p-6">
        {mixBlock("Ventas por categoría", analytics.categoryMix, analytics.currentRevenue, "Sin categorías vendidas.")}
        {mixBlock("Métodos de pago", analytics.paymentMix, analytics.currentRevenue, "Sin pagos registrados.")}
        {mixBlock(
          "Gastos por categoría",
          analytics.expenseMix,
          analytics.expenseMix.reduce((total, [, value]) => total + value, 0),
          "Sin gastos en el periodo."
        )}
      </div>
    </section>
  );
};

export default SalesInsights;
