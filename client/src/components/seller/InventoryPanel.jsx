import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const stockStatus = (product) => {
  if (!product.trackInventory) {
    return { label: "Sin seguimiento", className: "bg-stone-100 text-stone-600", tone: "#8C7B70" };
  }
  if (product.stockQuantity === 0) {
    return { label: "Agotado", className: "bg-red-50 text-red-700", tone: "#B85C4A" };
  }
  if (product.stockQuantity <= product.lowStockThreshold) {
    return { label: "Stock bajo", className: "bg-amber-50 text-amber-700", tone: "#C49735" };
  }
  return { label: "Disponible", className: "bg-green-50 text-green-700", tone: "#5E8062" };
};

const InventoryPanel = ({
  products,
  currency,
  adjustInventory,
  updateInventorySettings,
  inventoryMovements,
  inventoryLoading,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [adjustments, setAdjustments] = useState({});
  const [reasons, setReasons] = useState({});
  const [expandedProduct, setExpandedProduct] = useState(null);

  const metrics = useMemo(() => {
    const tracked = products.filter((product) => product.trackInventory);
    return {
      units: tracked.reduce((total, product) => total + product.stockQuantity, 0),
      low: tracked.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold).length,
      out: tracked.filter((product) => product.stockQuantity === 0).length,
      value: tracked.reduce((total, product) => total + product.stockQuantity * Number(product.offerPrice || 0), 0),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.category || "").toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "low" && product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold) ||
        (filter === "out" && product.trackInventory && product.stockQuantity === 0) ||
        (filter === "healthy" && (!product.trackInventory || product.stockQuantity > product.lowStockThreshold));
      return matchesSearch && matchesFilter;
    });
  }, [filter, products, search]);

  const movementProduct = (movement) =>
    products.find((product) => product._id === movement.productId);

  const submitAdjustment = async (product) => {
    const quantity = Number(adjustments[product._id]);
    if (!Number.isInteger(quantity) || quantity === 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }
    const result = await adjustInventory(
      product._id,
      quantity,
      reasons[product._id] || (quantity > 0 ? "Entrada de producción" : "Merma")
    );
    if (result !== null) {
      toast.success(`Inventario actualizado: ${result} unidades`);
      setAdjustments((current) => ({ ...current, [product._id]: "" }));
      setReasons((current) => ({ ...current, [product._id]: "" }));
      setExpandedProduct(null);
    }
  };

  const metricCards = [
    { label: "Unidades", value: metrics.units, note: "Stock disponible", accent: "#8B4A2B" },
    { label: "Stock bajo", value: metrics.low, note: "Requieren atención", accent: "#C49735" },
    { label: "Agotados", value: metrics.out, note: "Ocultos de compra", accent: "#B85C4A" },
    { label: "Valor", value: `${currency}${metrics.value.toLocaleString("es-MX")}`, note: "A precio de venta", accent: "#5E8062" },
  ];

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-[2rem] bg-cocoa px-6 py-7 text-white shadow-[0_22px_55px_rgba(61,32,21,.2)] md:px-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[48px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e5b27d]">Control de existencias</span>
            <h2 className="font-display mt-2 text-3xl font-bold">Inventario del obrador</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">
              Registra producción, mermas y ajustes. La disponibilidad se actualiza automáticamente en la tienda.
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold text-white/65">
            {products.length} productos conectados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="seller-card-3d seller-glass relative overflow-hidden rounded-[1.6rem] p-5">
            <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-10" style={{ backgroundColor: metric.accent }} />
            <span className="mb-5 block h-1 w-8 rounded-full" style={{ backgroundColor: metric.accent }} />
            <strong className="font-display block text-3xl text-cocoa">{metric.value}</strong>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[.1em] text-stone-500">{metric.label}</span>
            <span className="mt-2 block text-[11px] text-stone-400">{metric.note}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-cocoa">Existencias por producto</h3>
          <p className="mt-1 text-sm text-stone-500">Los cambios se reflejan inmediatamente en el catálogo.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto..."
            className="seller-input rounded-full px-5 py-2.5 text-sm sm:w-56"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="seller-input cursor-pointer rounded-full px-5 py-2.5 text-sm"
          >
            <option value="all">Todos</option>
            <option value="low">Stock bajo</option>
            <option value="out">Agotados</option>
            <option value="healthy">Disponibles</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const status = stockStatus(product);
          const isExpanded = expandedProduct === product._id;
          const fillPercentage = product.trackInventory
            ? Math.min(100, (product.stockQuantity / Math.max(product.lowStockThreshold * 3, 1)) * 100)
            : 100;

          return (
            <div key={product._id} className="seller-glass overflow-hidden rounded-[1.5rem]">
              <div className="grid items-center gap-4 p-4 sm:grid-cols-[64px_1fr_auto] md:p-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_35%,#fff,#f0dfc9)] p-2">
                  <img loading="lazy" src={product.image?.[0]} alt="" className="max-h-full max-w-full object-contain drop-shadow-md" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display truncate text-lg font-bold text-cocoa">{product.name}</h4>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">{product.category} · Umbral: {product.lowStockThreshold}</p>
                  <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${fillPercentage}%`, backgroundColor: status.tone }} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right">
                    <strong className="font-display block text-3xl text-cocoa">{product.trackInventory ? product.stockQuantity : "∞"}</strong>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">unidades</span>
                  </div>
                  <div className="flex items-center rounded-full bg-[#f4e8d8] p-1">
                    <button
                      type="button"
                      onClick={() => adjustInventory(product._id, -1, "Ajuste rápido")}
                      disabled={inventoryLoading || !product.trackInventory || product.stockQuantity === 0}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white font-bold text-primary-dull shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => adjustInventory(product._id, 1, "Producción rápida")}
                      disabled={inventoryLoading || !product.trackInventory}
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary-dull font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
                    >+</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-primary-dull/10 bg-white text-primary-dull transition hover:bg-[#f8f1e7]"
                    aria-label={`Configurar ${product.name}`}
                  >
                    <svg className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-primary-dull/8 bg-[#fbf6ef] px-4 py-5 md:px-5">
                  <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-stone-500">Registrar movimiento</p>
                      <div className="grid gap-3 sm:grid-cols-[130px_1fr_auto]">
                        <input
                          type="number"
                          value={adjustments[product._id] || ""}
                          onChange={(event) => setAdjustments((current) => ({ ...current, [product._id]: event.target.value }))}
                          placeholder="+10 o -2"
                          className="seller-input rounded-xl px-4 py-2.5 text-sm"
                        />
                        <input
                          type="text"
                          value={reasons[product._id] || ""}
                          onChange={(event) => setReasons((current) => ({ ...current, [product._id]: event.target.value }))}
                          placeholder="Motivo: producción, merma, corrección..."
                          className="seller-input rounded-xl px-4 py-2.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => submitAdjustment(product)}
                          disabled={inventoryLoading}
                          className="btn-primary cursor-pointer px-5 py-2.5 text-xs disabled:opacity-50"
                        >
                          Registrar
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex-1 text-xs font-bold uppercase tracking-[.1em] text-stone-500">
                        Avisar debajo de
                        <input
                          type="number"
                          min="0"
                          defaultValue={product.lowStockThreshold}
                          onBlur={(event) => updateInventorySettings(product._id, { lowStockThreshold: event.target.value })}
                          className="seller-input mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-normal normal-case tracking-normal"
                        />
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary-dull/10 bg-white px-4 py-3 text-xs font-semibold text-stone-600">
                        <input
                          type="checkbox"
                          checked={product.trackInventory}
                          onChange={(event) => updateInventorySettings(product._id, { trackInventory: event.target.checked })}
                          className="accent-[#8B4A2B]"
                        />
                        Controlar stock
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-cocoa">Movimientos recientes</h3>
            <p className="mt-1 text-xs text-stone-400">Entradas, ventas, mermas y correcciones.</p>
          </div>
          <span className="rounded-full bg-[#f4e8d8] px-3 py-1 text-xs font-bold text-primary-dull">{inventoryMovements.length}</span>
        </div>

        {inventoryMovements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary-dull/15 py-10 text-center text-sm text-stone-400">
            Los movimientos aparecerán cuando actualices existencias.
          </div>
        ) : (
          <div className="divide-y divide-primary-dull/8">
            {inventoryMovements.slice(0, 10).map((movement) => {
              const product = movementProduct(movement);
              return (
                <div key={movement.id} className="flex items-center gap-3 py-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    movement.quantityChange > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}>
                    {movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-cocoa">{product?.name || movement.productName || movement.productId}</p>
                    <p className="text-xs text-stone-400">{movement.reason}</p>
                  </div>
                  <time className="text-right text-[11px] text-stone-400">
                    {new Date(movement.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
