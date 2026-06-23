import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/useAppContext";
import { assets } from "../assets/assets";

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, products, productsLoaded, currency, addToCart, removeFromCart, updateCartItem } = useAppContext();

  // Filter products that are in the cart
  const cartProducts = products.filter((p) => cartItems[p._id] > 0);

  // Subtotal Calculation
  const subtotal = cartProducts.reduce((sum, product) => {
    const qty = cartItems[product._id];
    return sum + product.offerPrice * qty;
  }, 0);

  if (!productsLoaded) {
    return <div className="py-24 text-center text-stone-500">Cargando tu carrito...</div>;
  }

  if (cartProducts.length === 0) {
    return (
      <div className="glass-card my-12 flex flex-col items-center justify-center rounded-[2.5rem] py-24 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <img src={assets.brown_cart} alt="cart icon" className="w-10 opacity-70" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-500 mb-8 max-w-sm">¡Parece que aún no has agregado ningún postre delicioso a tu orden!</p>
        <button
          onClick={() => navigate("/products")}
          className="btn-primary cursor-pointer px-8 py-3"
        >
          Explorar Productos
        </button>
      </div>
    );
  }

  return (
    <div className="mb-20 mt-10 animate-fade-in">
      <span className="section-kicker">Tu selección</span>
      <h1 className="section-title mb-9">Una caja llena de antojos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-6">
          {cartProducts.map((product) => {
            const qty = cartItems[product._id];
            return (
              <div
                key={product._id}
                className="glass-card flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Product Image */}
                <div
                  className="flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#f5e8d7] p-2"
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  <img loading="lazy" decoding="async" src={product.image?.[0] || "/circle_logo.png"} alt={product.name} className="max-h-full max-w-full object-contain" />
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
                    {currency}{product.offerPrice} <span className="text-xs text-gray-400 font-normal">c/u</span>
                  </p>
                  {product.trackInventory && qty > product.stockQuantity && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Solo quedan {product.stockQuantity}. Ajusta la cantidad.
                    </p>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                    <button
                      onClick={() => removeFromCart(product._id)}
                      aria-label={`Quitar una unidad de ${product.name}`}
                      className="px-3 py-1 font-bold text-gray-500 hover:text-primary-dull cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-gray-800">{qty}</span>
                    <button
                      onClick={() => addToCart(product._id)}
                      aria-label={`Agregar una unidad de ${product.name}`}
                      disabled={product.trackInventory && qty >= product.stockQuantity}
                      className="px-3 py-1 font-bold text-gray-500 hover:text-primary-dull cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
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
        <div className="glass-card h-fit rounded-[1.75rem] p-6 lg:sticky lg:top-24">
          <h2 className="font-display mb-6 text-2xl font-bold text-cocoa">Resumen de orden</h2>

          <div className="space-y-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-800">
                {currency}{subtotal}
              </span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Envío (Guadalajara, Jal.)</span>
              <span className="text-stone-500 font-medium text-right text-xs sm:text-sm">
                Calculado en checkout
              </span>
            </div>

            <div className="border-t border-gray-150 pt-4 my-2">
              <div className="flex justify-between text-lg font-semibold text-gray-800">
                <span>Total</span>
                <span className="text-primary-dull">
                  {currency}{subtotal}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="btn-primary mt-8 block w-full cursor-pointer py-3.5 text-center"
          >
            Proceder al Pago
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
