import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { dummyOrders } from "../assets/assets";

const MyOrders = () => {
  const { currency } = useAppContext();
  const [orders] = useState(dummyOrders);

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

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Mis Pedidos</h1>

      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="border border-gray-150 rounded-2xl bg-white p-6 shadow-sm overflow-hidden"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-100 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium">ID DE ORDEN</p>
                  <p className="text-sm font-semibold text-gray-700">{order._id}</p>
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
                        src={item.product?.image?.[0]}
                        alt={item.product?.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-400">
                        Cantidad: {item.quantity} | Categoría: {item.product?.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      {currency}${item.product?.offerPrice * item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-100 gap-4">
                <div className="text-xs text-gray-500">
                  <p><strong>Fecha:</strong> {new Date(order.createdAt).toLocaleDateString("es-MX")}</p>
                  <p className="mt-1">
                    <strong>Entrega en:</strong> {order.address.street}, Guadalajara, Jal.
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
      ) : (
        <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-2xl">
          <p className="text-gray-500 text-lg">No tienes órdenes anteriores registradas.</p>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
