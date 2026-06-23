import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const UNITS = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "l", label: "Litros (l)" },
  { value: "unit", label: "Unidades" },
];

const formatQuantity = (quantity, unit) =>
  `${Number(quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${unit === "unit" ? "u." : unit}`;

const emptyMaterial = {
  name: "",
  unit: "g",
  purchaseQuantity: "",
  purchaseCost: "",
  lowStockThreshold: "",
  supplier: "",
};

const MaterialsPanel = ({
  materials,
  movements,
  currency,
  loading,
  addRawMaterial,
  restockRawMaterial,
  adjustRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMaterial);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [restock, setRestock] = useState({});
  const [adjustment, setAdjustment] = useState({});

  const metrics = useMemo(() => ({
    value: materials.reduce((total, material) => total + material.stockQuantity * material.costPerUnit, 0),
    low: materials.filter((material) => material.stockQuantity <= material.lowStockThreshold).length,
    suppliers: new Set(materials.map((material) => material.supplier).filter(Boolean)).size,
  }), [materials]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) =>
      !query ||
      material.name.toLowerCase().includes(query) ||
      material.supplier.toLowerCase().includes(query)
    );
  }, [materials, search]);

  const submitMaterial = async (event) => {
    event.preventDefault();
    try {
      await addRawMaterial(form);
      toast.success("Materia prima agregada");
      setForm(emptyMaterial);
      setShowForm(false);
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la materia prima");
    }
  };

  const submitRestock = async (material) => {
    const data = restock[material.id] || {};
    try {
      await restockRawMaterial(
        material.id,
        data.quantity,
        data.cost,
        data.reason || "Compra",
        data.supplier || material.supplier || "",
        data.batchCode || ""
      );
      toast.success("Compra registrada y costo actualizado");
      setRestock((current) => ({ ...current, [material.id]: {} }));
    } catch {
      toast.error("No se pudo registrar la compra");
    }
  };

  const submitAdjustment = async (material) => {
    const data = adjustment[material.id] || {};
    try {
      const result = await adjustRawMaterial(material.id, data.quantity, data.reason || "Ajuste manual");
      if (result !== null) {
        toast.success("Existencia corregida");
        setAdjustment((current) => ({ ...current, [material.id]: {} }));
      }
    } catch {
      toast.error("No se pudo ajustar la existencia");
    }
  };

  const metricCards = [
    { label: "Materias primas", value: materials.length, note: "Ingredientes registrados", accent: "#8B4A2B" },
    { label: "Valor almacenado", value: `${currency}${metrics.value.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`, note: "Costo actual del inventario", accent: "#5E8062" },
    { label: "Stock bajo", value: metrics.low, note: "Requieren compra", accent: "#C49735" },
    { label: "Proveedores", value: metrics.suppliers, note: "Fuentes registradas", accent: "#7A6A9E" },
  ];

  return (
    <div className="space-y-7">
      <div className="relative overflow-hidden rounded-[2rem] bg-cocoa px-6 py-7 text-white shadow-[0_22px_55px_rgba(61,32,21,.2)] md:px-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[48px] border-white/5" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e5b27d]">Costos desde el origen</span>
            <h2 className="font-display mt-2 text-3xl font-bold">Materias primas</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">
              Controla compras, existencias y costo por gramo, mililitro o unidad.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="w-fit cursor-pointer rounded-full bg-white px-5 py-2.5 text-xs font-bold text-cocoa">
            {showForm ? "Cerrar" : "+ Nuevo ingrediente"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submitMaterial} className="seller-glass rounded-[1.75rem] p-5 md:p-7">
          <div className="mb-5">
            <h3 className="font-display text-2xl font-bold text-cocoa">Registrar compra inicial</h3>
            <p className="mt-1 text-sm text-stone-500">El costo unitario se calcula automáticamente: costo total ÷ cantidad comprada.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <label className="xl:col-span-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Ingrediente
              <input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Chocolate 70%" className="seller-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Unidad
              <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="seller-input mt-2 w-full rounded-xl px-3 py-3 text-sm font-normal normal-case tracking-normal">
                {UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Cantidad
              <input required min="0.01" max="1000000000" step="0.01" type="number" value={form.purchaseQuantity} onChange={(event) => setForm({ ...form, purchaseQuantity: event.target.value })} placeholder="1000" className="seller-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Costo total
              <input required min="0" max="1000000000" step="0.01" type="number" value={form.purchaseCost} onChange={(event) => setForm({ ...form, purchaseCost: event.target.value })} placeholder="180" className="seller-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Aviso en
              <input required min="0" max="1000000000" step="0.01" type="number" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} placeholder="200" className="seller-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <label className="sm:col-span-2 xl:col-span-5 text-xs font-bold uppercase tracking-wider text-stone-500">
              Proveedor
              <input maxLength={160} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="Opcional" className="seller-input mt-2 w-full rounded-xl px-4 py-3 text-sm font-normal normal-case tracking-normal" />
            </label>
            <button type="submit" disabled={loading} className="btn-primary cursor-pointer self-end py-3 disabled:cursor-not-allowed disabled:opacity-50">Guardar</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="seller-card-3d seller-glass relative overflow-hidden rounded-[1.6rem] p-5">
            <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-10" style={{ backgroundColor: metric.accent }} />
            <span className="mb-5 block h-1 w-8 rounded-full" style={{ backgroundColor: metric.accent }} />
            <strong className="font-display block text-2xl text-cocoa sm:text-3xl">{metric.value}</strong>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] text-stone-500 sm:text-xs">{metric.label}</span>
            <span className="mt-2 block text-[11px] text-stone-400">{metric.note}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-2xl font-bold text-cocoa">Existencias</h3>
          <p className="mt-1 text-sm text-stone-500">Las nuevas compras recalculan el costo promedio ponderado.</p>
        </div>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ingrediente..." className="seller-input rounded-full px-5 py-2.5 text-sm sm:w-64" />
      </div>

      {filtered.length === 0 ? (
        <div className="seller-glass rounded-[1.75rem] border-dashed py-16 text-center">
          <p className="font-display text-xl font-bold text-cocoa">Aún no hay materias primas</p>
          <p className="mt-2 text-sm text-stone-400">Registra harina, mantequilla, chocolate y tus demás ingredientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((material) => {
            const isLow = material.stockQuantity <= material.lowStockThreshold;
            const isExpanded = expanded === material.id;
            return (
              <div key={material.id} className="seller-glass overflow-hidden rounded-[1.5rem]">
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center md:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-lg font-bold text-cocoa">{material.name}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isLow ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                        {isLow ? "Comprar pronto" : "Disponible"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">{material.supplier || "Sin proveedor"} · {currency}{material.costPerUnit.toFixed(4)} por {material.unit === "unit" ? "unidad" : material.unit}</p>
                    <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${isLow ? "bg-amber-500" : "bg-[#5E8062]"}`} style={{ width: `${Math.min(100, material.stockQuantity / Math.max(material.lowStockThreshold * 3, 1) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <strong className="font-display block text-2xl text-cocoa">{formatQuantity(material.stockQuantity, material.unit)}</strong>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Valor {currency}{(material.stockQuantity * material.costPerUnit).toFixed(2)}</span>
                    </div>
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : material.id)} aria-label={`Gestionar ${material.name}`} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-primary-dull/10 bg-white text-primary-dull">
                      <svg className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-5 border-t border-primary-dull/8 bg-[#fbf6ef] p-4 md:p-5">
                    <div className="grid gap-5 xl:grid-cols-2">
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">Registrar compra</p>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          <input type="number" min="0.01" max="1000000000" step="0.01" value={restock[material.id]?.quantity || ""} onChange={(event) => setRestock({ ...restock, [material.id]: { ...restock[material.id], quantity: event.target.value } })} placeholder={`Cantidad (${material.unit})`} className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <input type="number" min="0" max="1000000000" step="0.01" value={restock[material.id]?.cost || ""} onChange={(event) => setRestock({ ...restock, [material.id]: { ...restock[material.id], cost: event.target.value } })} placeholder="Costo total" className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <input maxLength={160} value={restock[material.id]?.supplier || ""} onChange={(event) => setRestock({ ...restock, [material.id]: { ...restock[material.id], supplier: event.target.value } })} placeholder="Proveedor" className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <input maxLength={120} value={restock[material.id]?.batchCode || ""} onChange={(event) => setRestock({ ...restock, [material.id]: { ...restock[material.id], batchCode: event.target.value } })} placeholder="Lote" className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <button type="button" onClick={() => submitRestock(material)} className="btn-primary cursor-pointer px-4 py-2.5 text-xs">Agregar compra</button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-500">Merma o corrección</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <input type="number" min="-1000000000" max="1000000000" step="0.01" value={adjustment[material.id]?.quantity || ""} onChange={(event) => setAdjustment({ ...adjustment, [material.id]: { ...adjustment[material.id], quantity: event.target.value } })} placeholder="+100 o -50" className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <input maxLength={200} value={adjustment[material.id]?.reason || ""} onChange={(event) => setAdjustment({ ...adjustment, [material.id]: { ...adjustment[material.id], reason: event.target.value } })} placeholder="Motivo" className="seller-input rounded-xl px-3 py-2.5 text-sm" />
                          <button type="button" onClick={() => submitAdjustment(material)} className="cursor-pointer rounded-xl bg-cocoa px-4 py-2.5 text-xs font-bold text-white">Ajustar</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-primary-dull/8 pt-4 sm:flex-row sm:items-end">
                      <label className="flex-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                        Avisar debajo de
                        <input type="number" min="0" max="1000000000" step="0.01" defaultValue={material.lowStockThreshold} onBlur={(event) => updateRawMaterial(material.id, { lowStockThreshold: event.target.value })} className="seller-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-normal normal-case" />
                      </label>
                      <label className="flex-1 text-xs font-bold uppercase tracking-wider text-stone-500">
                        Proveedor
                        <input maxLength={160} defaultValue={material.supplier} onBlur={(event) => updateRawMaterial(material.id, { supplier: event.target.value })} className="seller-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm font-normal normal-case" />
                      </label>
                      <button type="button" onClick={async () => {
                        if (!window.confirm(`¿Eliminar ${material.name}? Esta acción no se puede deshacer.`)) return;
                        try {
                          await deleteRawMaterial(material.id);
                          toast.success("Materia prima eliminada");
                        } catch (error) {
                          toast.error(error.message);
                        }
                      }} className="cursor-pointer rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
        <h3 className="font-display text-xl font-bold text-cocoa">Movimientos recientes</h3>
        <p className="mt-1 text-xs text-stone-400">Compras, consumo por ventas, mermas y correcciones.</p>
        <div className="mt-5 divide-y divide-primary-dull/8">
          {movements.length === 0 && <p className="py-8 text-center text-sm text-stone-400">Los movimientos aparecerán aquí.</p>}
          {movements.slice(0, 12).map((movement) => {
            const material = materials.find((item) => item.id === movement.materialId);
            return (
              <div key={movement.id} className="flex items-center gap-3 py-3">
                <span className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-xs font-bold ${movement.quantityChange >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {movement.quantityChange > 0 ? "+" : ""}{Number(movement.quantityChange).toLocaleString("es-MX", { maximumFractionDigits: 2 })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-cocoa">{material?.name || movement.materialName || "Ingrediente"}</p>
                  <p className="text-xs text-stone-400">
                    {movement.reason}
                    {movement.supplier ? ` · ${movement.supplier}` : ""}
                    {movement.batchCode ? ` · Lote ${movement.batchCode}` : ""}
                  </p>
                </div>
                <time className="text-[11px] text-stone-400">{new Date(movement.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</time>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MaterialsPanel;
