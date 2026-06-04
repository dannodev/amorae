import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const MyOrders = () => {
  const { currency, fetchOrdersByPhone, ordersLoading, normalizePhone } = useAppContext();
  const [orders, setOrders] = useState([]);
  const [phone, setPhone] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

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
    if (typeof createdAt === "string") return new Date(createdAt).toLocaleDateString("es-MX");
    if (createdAt?.toDate) return createdAt.toDate().toLocaleDateString("es-MX");
    return "Pendiente";
  };

  const sortOrders = (list) =>
    [...list].sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });

  const handleSearch = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      toast.error("Ingresa un teléfono válido");
      return;
    }
    localStorage.setItem("amorae_last_phone", normalizedPhone);
    const result = await fetchOrdersByPhone(normalizedPhone);
    setOrders(sortOrders(result));
    setHasSearched(true);
  };

  useEffect(() => {
    const lastPhone = localStorage.getItem("amorae_last_phone");
    if (lastPhone) {
      setPhone(lastPhone);
      fetchOrdersByPhone(lastPhone).then((result) => {
        setOrders(sortOrders(result));
        setHasSearched(true);
      });
    }
  }, [fetchOrdersByPhone]);

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <h1 className="text-3xl font-semibold text-gray-800 mb-4">Mis Pedidos</h1>

      <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Consulta tu pedido</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ingresa el teléfono que usaste en la compra para ver el estado de tus pedidos.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 3312345678"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-primary hover:bg-primary-dull text-white rounded-lg font-medium cursor-pointer"
          >
            Buscar pedidos
          </button>
        </div>
      </div>

      {ordersLoading ? (
        <div className="text-center py-16 text-gray-500">Cargando pedidos...</div>
      ) : orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id || order._id}
              className="border border-gray-150 rounded-2xl bg-white p-6 shadow-sm overflow-hidden"
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
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg p-1 flex items-center justify-center flex-shrink-0">
                      <img
                        src={item.product?.image?.[0] || item.image}
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
                      {currency}${(item.product?.offerPrice || item.offerPrice) * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100 gap-4">
                <div className="text-xs text-gray-500">
                  <p><strong>Fecha:</strong> {getOrderDate(order.createdAt)}</p>
                  <p className="mt-1">
                    <strong>Entrega en:</strong> {order.address?.street}, Guadalajara, Jal.
                  </p>
                </div>
                <div className="text-right w-full sm:w-auto">
                  <span className="text-xs text-gray-400">Total de Orden</span>
                  <p className="text-xl font-bold text-primary-dull">
                    {currency}${order.amount}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
          <p className="text-gray-500 text-lg">No tienes órdenes anteriores registradas.</p>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
          <p className="text-gray-500 text-lg">Ingresa tu teléfono para ver tus pedidos.</p>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
