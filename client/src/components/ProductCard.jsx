import { assets } from "../assets/assets";
import { useAppContext } from "../context/useAppContext";

const ProductCard = ({ product }) => {
  const { currency, addToCart, removeFromCart, cartItems, navigate } = useAppContext()
  const quantity = cartItems[product._id] || 0
  const discount = product.price > product.offerPrice
    ? Math.round(((product.price - product.offerPrice) / product.price) * 100)
    : 0

  return product && (
    <article
      onClick={() => navigate(`/product/${product._id}`)}
      className="product-3d group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.6rem] border border-primary-dull/10 bg-[#fffdf9] p-3 shadow-[0_12px_35px_rgba(78,40,24,0.07)] md:p-4"
    >
      {discount > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-cocoa px-2.5 py-1 text-[10px] font-bold text-white">
          -{discount}%
        </span>
      )}
      <div className="relative flex aspect-[1.1] items-center justify-center overflow-hidden rounded-[1.2rem] bg-[radial-gradient(circle_at_50%_35%,#fff,#f6e8d4)] px-4">
        <div className="absolute inset-x-8 bottom-4 h-5 rounded-[50%] bg-cocoa/10 blur-md" />
        <img
          loading="lazy"
          decoding="async"
          className="product-image relative z-10 h-[78%] w-[86%] object-contain drop-shadow-[0_14px_12px_rgba(64,33,22,0.15)]"
          src={product.image?.[0] || "/circle_logo.png"}
          alt={product.name}
        />
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">{product.category}</p>
        <h3 className="font-display mt-1 line-clamp-2 text-base font-bold leading-tight text-cocoa md:text-xl">{product.name}</h3>
        <div className="mt-2 flex items-center gap-1">
          <div className="hidden sm:flex">
            {Array(5).fill('').map((_, i) => (
              <img key={i} className="h-3 w-3" src={assets.yellow_star} alt="" />
            ))}
          </div>
          <span className="rounded-full bg-[#fff5dd] px-2 py-1 text-[10px] font-semibold text-stone-500 sm:bg-transparent sm:px-0 sm:py-0 sm:font-normal sm:text-stone-400">
            {!product.inStock
              ? "Agotado"
              : product.trackInventory && product.stockQuantity <= product.lowStockThreshold
                ? `Últimas ${product.stockQuantity}`
                : "Hecho hoy"}
          </span>
        </div>

        <div className="mt-auto pt-5">
          <div className="min-w-0">
            <p className="text-2xl font-extrabold leading-none text-primary-dull md:text-xl">{currency}{product.offerPrice}</p>
            {discount > 0 && <p className="mt-1 text-xs text-stone-400 line-through">{currency}{product.price}</p>}
          </div>

          <div className="mt-3 flex justify-end" onClick={(event) => event.stopPropagation()}>
            {!product.inStock ? (
              <span className="rounded-full bg-stone-100 px-3 py-2 text-[10px] font-bold text-stone-400">Agotado</span>
            ) : !quantity ? (
              <button
                type="button"
                aria-label={`Añadir ${product.name}`}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-cocoa text-lg text-white shadow-md transition hover:-translate-y-1 hover:bg-primary-dull md:w-auto md:px-4"
                onClick={() => addToCart(product._id)}
              >
                <span className="md:hidden">+</span>
                <span className="hidden text-xs font-bold md:block">Añadir +</span>
              </button>
            ) : (
              <div className="flex h-9 max-w-full items-center rounded-full bg-[#f3e4d0] p-0.5 text-primary-dull shadow-sm md:h-10 md:p-1">
                <button type="button" aria-label={`Quitar ${product.name}`} onClick={() => removeFromCart(product._id)} className="h-7 w-7 cursor-pointer rounded-full bg-white text-sm font-bold shadow-sm md:h-8 md:w-8">−</button>
                <span className="w-5 text-center text-xs font-bold md:w-7 md:text-sm">{quantity}</span>
                <button type="button" aria-label={`Añadir otro ${product.name}`} onClick={() => addToCart(product._id)} className="h-7 w-7 cursor-pointer rounded-full bg-primary-dull text-sm font-bold text-white shadow-sm md:h-8 md:w-8">+</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
