import { useEffect, useRef, useState } from "react";
import { useAppContext } from "../context/useAppContext";
import toast from "react-hot-toast";

const MyOrders = () => {
  const { currency, fetchOrdersByPhone, ordersLoading, normalizePhone } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [phone, setPhone] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const searchRequestRef = useRef(0);

  const getStatusColor = (status) => {
    switch (status) {
      case "Order Placed":
      case "Recibido":
        return "bg-blue-100 text-blue-800";
      case "Preparing":
      case "Preparando":
        return "bg-yellow-100 text-yellow-800";
      case "Out for Delivery":
      case "En Camino":
        return "bg-orange-100 text-orange-800";
      case "Listo para recoger":
        return "bg-purple-100 text-purple-800";
      case "Delivered":
      case "Entregado":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const translateStatus = (status) => {
    switch (status) {
      case "Order Placed":
        return "Pedido Recibido";
      case "Preparing":
        return "Preparando en Cocina";
      case "Out for Delivery":
        return "En Camino";
      case "Delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  const getOrderDate = (createdAt) => {
    if (!createdAt) return "Pendiente";
    if (typeof createdAt === "string") {
      const date = new Date(createdAt);
      return Number.isNaN(date.getTime()) ? "Pendiente" : date.toLocaleDateString("es-MX");
    }
    if (createdAt?.toDate) return createdAt.toDate().toLocaleDateString("es-MX");
    return "Pendiente";
  };

  const formatDistance = (distanceKm) => {
    const value = Number(distanceKm);
    if (!Number.isFinite(value)) return null;
    return `${value.toLocaleString("es-MX", { maximumFractionDigits: 2 })} km`;
  };

  const formatFee = (feeMxn, currencySymbol) => {
    const value = Number(feeMxn);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${currencySymbol}${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  };

  const sortOrders = (list) =>
    (Array.isArray(list) ? [...list] : []).filter(Boolean).sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });

  const handleSearch = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      toast.error("Ingresa un teléfono válido de 10 a 15 dígitos");
      return;
    }
    try { localStorage.setItem("amorae_last_phone", normalizedPhone); } catch { /* optional convenience */ }
    const requestId = ++searchRequestRef.current;
    const result = await fetchOrdersByPhone(normalizedPhone);
    if (requestId === searchRequestRef.current) {
      setOrders(sortOrders(result));
      setHasSearched(true);
    }
  };

  useEffect(() => {
    let active = true;
    const lastPhone = localStorage.getItem("amorae_last_phone");
    if (lastPhone) {
      setPhone(lastPhone);
      const requestId = ++searchRequestRef.current;
      fetchOrdersByPhone(lastPhone).then((result) => {
        if (!active || requestId !== searchRequestRef.current) return;
        setOrders(sortOrders(result));
        setHasSearched(true);
      });
    }
    return () => {
      active = false;
    };
    // Auto-load the last searched phone only once when the page opens. The
    // context function is recreated as loading state changes, so depending on it
    // can trigger repeated fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="customer-flow mb-20 mt-10 animate-fade-in">
      <span className="section-kicker">Del horno a tu mesa</span>
      <h1 className="section-title mb-3">Sigue tu pedido</h1>
      <p className="mb-8 max-w-xl text-sm leading-6 text-stone-500">Consulta el avance de tus postres con el teléfono que registraste al ordenar.</p>

      <div className="glass-card mb-8 rounded-[1.75rem] p-6 md:p-8">
        <h2 className="font-display mb-2 text-xl font-bold text-cocoa">Encuentra tu orden</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ingresa el teléfono que usaste en la compra para ver el estado de tus pedidos.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 3312345678"
            className="flex-1 rounded-full px-5 py-3 outline-none"
          />
          <button
            type="submit"
            className="btn-primary cursor-pointer px-7 py-3"
          >
            Buscar pedidos
          </button>
        </form>
      </div>

      {ordersLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando pedidos...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id || order._id}
              className="glass-card overflow-hidden rounded-[1.75rem] p-6 transition hover:-translate-y-0.5"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">ID DE ORDEN</p>
                  <p className="text-sm font-semibold text-gray-700">{order.id || order._id}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {translateStatus(order.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.isPaid ? 'bg-green-150 text-green-800' : 'bg-gray-150 text-gray-700'}`}>
                    {order.isPaid ? 'Pagado' : 'Pendiente de Pago'}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {(Array.isArray(order.items) ? order.items : []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={item.product?.image?.[0] || item.image || "/circle_logo.png"}
                        alt={item.product?.name || item.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name || item.name}</p>
                      <p className="text-xs text-gray-400">
                        Cantidad: {item.quantity} | Categoría: {item.product?.category || item.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      {currency}{(item.product?.offerPrice || item.offerPrice) * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100 gap-4">
                <div className="text-xs text-gray-500">
                  <p><strong>Fecha:</strong> {getOrderDate(order.createdAt)}</p>
                  <p className="mt-1">
                    <strong>{(order.fulfillmentType === "pickup" || order.address?.fulfillmentType === "pickup") ? "Recolección en:" : "Entrega en:"}</strong>{" "}
                    {(order.fulfillmentType === "pickup" || order.address?.fulfillmentType === "pickup") ? (order.pickupLocation || order.address?.pickupLocation) : `${order.address?.street}, ${order.address?.colonia}, ${order.address?.city || "Guadalajara"}, Jal.`}
                  </p>
                  {order.fulfillmentType !== "pickup" && order.address?.fulfillmentType !== "pickup" && (() => {
                    const distance = formatDistance(order.deliveryDistanceKm ?? order.address?.distanceKm);
                    const fee = formatFee(order.deliveryFee, currency);
                    if (!distance && !fee) return null;
                    return (
                      <p className="mt-1">
                        <strong>Envío:</strong>{" "}
                        {fee ? <span className="font-semibold text-cocoa">{fee}</span> : <span className="text-green-700 font-semibold">Gratis</span>}
                        {distance && <span className="text-gray-500"> · {distance}</span>}
                      </p>
                    );
                  })()}
                </div>
                <div className="text-right w-full sm:w-auto">
                  <span className="text-xs text-gray-400">Total de Orden</span>
                  <p className="text-xl font-bold text-primary-dull">
                    {currency}{(Number(order.amount || 0) + Number(order.deliveryFee || 0)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="rounded-[2rem] border border-dashed border-primary-dull/20 bg-white/40 py-20 text-center">
          <p className="text-gray-500 text-lg">No tienes órdenes anteriores registradas.</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-primary-dull/20 bg-white/40 py-20 text-center">
          <p className="text-gray-500 text-lg">Ingresa tu teléfono para ver tus pedidos.</p>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
