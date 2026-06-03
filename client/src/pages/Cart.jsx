import React from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, products, currency, addToCart, removeFromCart, updateCartItem } = useAppContext();

  // Filter products that are in the cart
  const cartProducts = products.filter((p) => cartItems[p._id] > 0);

  // Subtotal Calculation
  const subtotal = cartProducts.reduce((sum, product) => {
    const qty = cartItems[product._id];
    return sum + product.offerPrice * qty;
  }, 0);

  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <img src={assets.brown_cart} alt="cart icon" className="w-10 opacity-70" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-500 mb-8 max-w-sm">¡Parece que aún no has agregado ningún postre delicioso a tu orden!</p>
        <button
          onClick={() => navigate("/products")}
          className="px-8 py-3 bg-primary hover:bg-primary-dull text-white font-medium rounded-xl transition-all shadow-md cursor-pointer"
        >
          Explorar Productos
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Tu Carrito de Postres</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-6">
          {cartProducts.map((product) => {
            const qty = cartItems[product._id];
            return (
              <div
                key={product._id}
                className="flex items-center gap-4 p-4 bg-white border border-gray-150 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div
                  className="w-20 h-20 bg-gray-50 rounded-lg p-2 flex items-center justify-center cursor-pointer flex-shrink-0"
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  <img src={product.image[0]} alt={product.name} className="max-h-full max-w-full object-contain" />
                </div>

                {/* Product Info */}
                <div className="flex-grow min-w-0">
                  <h3
                    className="text-lg font-medium text-gray-800 truncate hover:text-primary cursor-pointer"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500">{product.category}</p>
                  <p className="text-primary-dull font-semibold mt-1">
                    {currency}${product.offerPrice} <span className="text-xs text-gray-400 font-normal">c/u</span>
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="px-3 py-1 font-bold text-gray-500 hover:text-primary-dull cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-800">{qty}</span>
                    <button
                      onClick={() => addToCart(product._id)}
                      className="px-3 py-1 font-bold text-gray-500 hover:text-primary-dull cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Completely */}
                  <button
                    onClick={() => updateCartItem(product._id, 0)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium cursor-pointer py-1"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Order Summary */}
        <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Resumen de Orden</h2>

          <div className="space-y-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-800">
                {currency}${subtotal}
              </span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Envío (Guadalajara, Jal.)</span>
              <span className="text-green-600 font-medium">¡Gratis!</span>
            </div>

            <div className="border-t border-gray-150 pt-4 my-2">
              <div className="flex justify-between text-lg font-semibold text-gray-800">
                <span>Total</span>
                <span className="text-primary-dull">
                  {currency}${subtotal}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full py-3.5 mt-8 bg-primary hover:bg-primary-dull text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg text-center block cursor-pointer"
          >
            Proceder al Pago
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
