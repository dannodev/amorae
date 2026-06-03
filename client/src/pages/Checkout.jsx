import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, products, currency, getCartCount } = useAppContext();

  // Address State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    colonia: "",
    zipcode: "",
    phone: "",
    notes: "",
    // Hardcoded and disabled for delivery limitation
    state: "Jalisco",
    city: "Guadalajara",
  });

  const [paymentMethod, setPaymentMethod] = useState("stripe"); // 'stripe' or 'whatsapp'
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });

  const cartProducts = products.filter((p) => cartItems[p._id] > 0);
  const total = cartProducts.reduce((sum, p) => sum + p.offerPrice * cartItems[p._id], 0);

  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">No hay productos en tu carrito</h2>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2 bg-primary text-white rounded-lg cursor-pointer"
        >
          Volver a Catálogo
        </button>
      </div>
    );
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCardChange = (e) => {
    setCardData({ ...cardData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.street || !formData.colonia || !formData.phone) {
      toast.error("Por favor completa los campos de dirección requeridos");
      return;
    }

    if (paymentMethod === "stripe") {
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvv) {
        toast.error("Por favor ingresa todos los campos de tu tarjeta");
        return;
      }
      toast.loading("Procesando pago con Stripe...");
      setTimeout(() => {
        toast.dismiss();
        toast.success("¡Pago exitoso con Stripe!");
        // Mock success routing
        navigate("/my-orders");
      }, 2000);
    } else {
      // WhatsApp ordering integration
      // WhatsApp Mexico phone number (change this to your contact number)
      const whatsappNumber = "523312345678"; 
      
      let message = `*¡Hola Amorae! 🥐🍰*\n`;
      message += `Quiero finalizar mi pedido con los siguientes productos:\n\n`;

      cartProducts.forEach((p) => {
        const qty = cartItems[p._id];
        message += `• *${qty}x* ${p.name} - $${p.offerPrice * qty} MXN\n`;
      });

      message += `\n*Total a pagar:* $${total} MXN\n\n`;
      message += `*Datos de Entrega (Guadalajara, Jal):*\n`;
      message += `• *Cliente:* ${formData.firstName} ${formData.lastName}\n`;
      message += `• *Dirección:* ${formData.street}, Col. ${formData.colonia}\n`;
      message += `• *C.P.:* ${formData.zipcode}\n`;
      message += `• *Teléfono:* ${formData.phone}\n`;
      message += `• *Notas:* ${formData.notes || "Ninguna"}\n\n`;
      message += `¿Me confirman disponibilidad y datos de pago? ¡Gracias! ✨`;

      const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      
      toast.success("Redirigiendo a WhatsApp...");
      setTimeout(() => {
        window.open(whatsappURL, "_blank");
        navigate("/my-orders");
      }, 1000);
    }
  };

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Información de tu Pedido</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Form: Shipping Address */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Detalles de Entrega</h2>
            
            {/* Limit Warning banner */}
            <div className="mb-6 p-4 bg-orange-50 border-l-4 border-primary-dull text-primary-dull rounded-r-lg text-sm font-medium">
              📍 <strong>Atención:</strong> Las entregas están estrictamente limitadas a <strong>Guadalajara, Jalisco</strong>.
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Pérez"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calle y Número *</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Av. Vallarta 1234, Int 4"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colonia *</label>
                  <input
                    type="text"
                    name="colonia"
                    value={formData.colonia}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Americana"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                  <input
                    type="text"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="44160"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Móvil *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3312345678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas especiales para la entrega</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                  placeholder="Ej. Tocar el timbre morado, dejar en recepción..."
                ></textarea>
              </div>
            </form>
          </div>
        </div>

        {/* Right Info: Select Payment + Payment details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Método de Finalización</h2>

            {/* Payment Method Selector Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod("stripe")}
                className={`py-4 px-4 border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === "stripe"
                    ? "border-primary bg-primary/5 text-primary-dull shadow-sm"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
                <span className="text-sm font-semibold">Stripe / Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("whatsapp")}
                className={`py-4 px-4 border rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  paymentMethod === "whatsapp"
                    ? "border-green-500 bg-green-500/5 text-green-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.88 14.15c-.24.67-1.39 1.29-1.9 1.34-.47.05-.93.26-2.99-.59-2.63-1.08-4.32-3.75-4.45-3.92-.13-.17-1.07-1.42-1.07-2.72 0-1.29.68-1.93.92-2.19.24-.26.52-.32.69-.32.17 0 .35.01.5.02.16.01.37-.06.58.44.22.52.75 1.83.82 1.96.07.13.11.29.02.48-.09.18-.13.29-.26.45-.13.16-.27.35-.38.47-.13.13-.26.27-.11.53.15.26.66 1.09 1.41 1.76.97.86 1.79 1.13 2.05 1.26.26.13.41.11.57-.07.16-.18.68-.79.86-1.06.18-.27.37-.23.63-.13.26.1.1.84 1.64.67.75.33 1.12.5.96.63-.16.14-.3.29-.44.42z" />
                </svg>
                <span className="text-sm font-semibold">WhatsApp</span>
              </button>
            </div>

            {/* Dynamic Content based on method */}
            {paymentMethod === "stripe" ? (
              <div className="space-y-4 border border-gray-150 rounded-xl p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Información de Tarjeta (Stripe)</h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre en la tarjeta</label>
                  <input
                    type="text"
                    name="name"
                    value={cardData.name}
                    onChange={handleCardChange}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-1 focus:ring-primary"
                    placeholder="TITULAR DE LA TARJETA"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número de tarjeta</label>
                  <input
                    type="text"
                    name="number"
                    value={cardData.number}
                    onChange={handleCardChange}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-1 focus:ring-primary"
                    placeholder="4000 1234 5678 9010"
                    maxLength="19"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Vencimiento</label>
                    <input
                      type="text"
                      name="expiry"
                      value={cardData.expiry}
                      onChange={handleCardChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-1 focus:ring-primary"
                      placeholder="MM/AA"
                      maxLength="5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CVV</label>
                    <input
                      type="password"
                      name="cvv"
                      value={cardData.cvv}
                      onChange={handleCardChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-1 focus:ring-primary"
                      placeholder="123"
                      maxLength="4"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-green-200 rounded-xl bg-green-50/50 space-y-3">
                <h3 className="text-sm font-semibold text-green-800">Finalizar orden vía WhatsApp</h3>
                <p className="text-sm text-green-700/80 leading-relaxed">
                  Al completar tu pedido, se abrirá un chat directo de WhatsApp con nosotros, con tu mensaje pre-llenado que contiene los detalles del carrito y tu dirección de entrega en Guadalajara. ¡Ahí podremos coordinar el pago y aclarar tus dudas directamente!
                </p>
              </div>
            )}

            {/* Total Summary */}
            <div className="border-t border-gray-200 my-6 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({getCartCount()} pz)</span>
                <span>{currency}${total}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg text-gray-800">
                <span>Total a Pagar</span>
                <span className="text-primary-dull">{currency}${total}</span>
              </div>
            </div>

            {/* Final Action Button */}
            <button
              onClick={handleSubmit}
              className={`w-full py-4 text-center text-white font-medium rounded-xl shadow-md transition-all cursor-pointer ${
                paymentMethod === "stripe"
                  ? "bg-primary hover:bg-primary-dull hover:shadow-lg"
                  : "bg-green-600 hover:bg-green-700 hover:shadow-lg"
              }`}
            >
              {paymentMethod === "stripe" ? "Pagar con Stripe" : "Enviar Pedido por WhatsApp 💬"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
