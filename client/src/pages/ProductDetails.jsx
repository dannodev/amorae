import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/useAppContext";
import { assets } from "../assets/assets";

const setProductMeta = (property, content) => {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, productsLoaded, currency, addToCart, cartItems, removeFromCart } = useAppContext();
  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");

  useEffect(() => {
    const found = products.find((candidate) => candidate._id === id) || null;
    setProduct(found);
    setMainImage(found?.image?.[0] || "");
  }, [id, products]);

  useEffect(() => {
    if (!product) {
      if (productsLoaded) {
        document.title = "Producto no encontrado | Amorae Repostería";
        document.head.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex, nofollow");
      }
      return undefined;
    }

    const description = Array.isArray(product.description)
      ? product.description.join(". ")
      : product.description;
    document.title = `${product.name} | Amorae Repostería`;

    const descriptionMeta = document.head.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute("content", description);
    document.head.querySelector('meta[name="robots"]')?.setAttribute("content", "index, follow");
    const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}/product/${product._id}`;
    const productImage = product.image?.[0]
      ? new URL(product.image[0], siteUrl).href
      : `${siteUrl}/amorae-social.jpg`;
    const metaValues = {
      'meta[property="og:title"]': product.name,
      'meta[property="og:type"]': "product",
      'meta[property="og:description"]': description,
      'meta[property="og:url"]': canonicalUrl,
      'meta[property="og:image"]': productImage,
      'meta[name="twitter:title"]': product.name,
      'meta[name="twitter:description"]': description,
      'meta[name="twitter:image"]': productImage,
    };
    Object.entries(metaValues).forEach(([selector, content]) => {
      document.head.querySelector(selector)?.setAttribute("content", content);
    });
    setProductMeta("product:price:amount", String(product.offerPrice));
    setProductMeta("product:price:currency", "MXN");

    let productSchema = document.head.querySelector("#amorae-product-schema");
    if (!productSchema) {
      productSchema = document.createElement("script");
      productSchema.id = "amorae-product-schema";
      productSchema.type = "application/ld+json";
      document.head.appendChild(productSchema);
    }
    productSchema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: product.image?.[0],
      description,
      category: product.category,
      sku: product._id,
      brand: { "@type": "Brand", name: "Amorae" },
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        priceCurrency: "MXN",
        price: product.offerPrice,
        availability: product.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    });

    return () => productSchema?.remove();
  }, [product, productsLoaded]);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-cocoa">
          {productsLoaded ? "No encontramos este producto" : "Cargando producto..."}
        </h1>
        <p className="mb-5 mt-2 text-gray-500">
          {productsLoaded ? "Puede que ya no esté disponible o que el enlace haya cambiado." : "Estamos preparando la vitrina."}
        </p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2 bg-primary text-white rounded-lg cursor-pointer"
        >
          Volver a Catálogo
        </button>
      </div>
    );
  }

  const quantityInCart = cartItems[product._id] || 0;
  const descriptionList = Array.isArray(product.description)
    ? product.description.filter(Boolean)
    : [product.description].filter(Boolean);
  const galleryImages = Array.isArray(product.image) ? product.image.filter(Boolean) : [];

  return (
    <div className="mb-20 mt-8 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6 cursor-pointer"
      >
        <span className="text-xl">&larr;</span> Volver
      </button>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left Column - Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative flex h-[360px] items-center justify-center overflow-hidden rounded-[2rem] border border-primary-dull/10 bg-[radial-gradient(circle_at_50%_35%,#fff,#f0dfc9)] p-8 shadow-[0_22px_60px_rgba(74,38,24,0.1)] md:h-[520px]">
            <div className="absolute bottom-12 h-8 w-1/2 rounded-[50%] bg-cocoa/10 blur-lg" />
            <img
              src={mainImage}
              alt={product.name}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="float-slow relative z-10 max-h-[85%] max-w-[88%] object-contain drop-shadow-[0_26px_20px_rgba(68,34,22,0.25)]"
            />
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryImages.map((img, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setMainImage(img)}
                  aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                  className={`flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl border bg-white p-2 transition-all ${
                    mainImage === img ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img loading="lazy" decoding="async" src={img} alt="" className="max-h-full max-w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product details */}
        <div className="flex flex-col justify-start">
          <span className="section-kicker">{product.category}</span>
          <h1 className="font-display mt-3 text-4xl font-bold leading-tight text-cocoa md:text-5xl">{product.name}</h1>

          {/* Ratings */}
          <div className="mb-6 mt-4 flex items-center gap-1.5">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <img
                  key={i}
                  className="w-4 h-4"
                  src={i < 5 ? assets.yellow_star : assets.yellow_star_dull}
                  alt=""
                />
              ))}
            <p className="text-gray-500 text-sm ml-2">Calidad artesanal</p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl font-bold text-primary-dull">
              {currency}{product.offerPrice}
            </span>
            {product.price > product.offerPrice && (
              <span className="text-gray-400 text-lg line-through">
                {currency}{product.price}
              </span>
            )}
          </div>

          <div className="my-6 border-t border-primary-dull/10"></div>

          {/* Highlights / Description list */}
          <div className="mb-8">
            <h3 className="font-display mb-3 text-xl font-bold text-cocoa">Lo que hace especial esta creación</h3>
            <ul className="space-y-3 text-stone-600">
              {descriptionList.map((desc, index) => (
                <li key={index} className="flex items-start gap-3"><span className="mt-1 text-primary">✦</span>{desc}</li>
              ))}
            </ul>
          </div>

          {/* In Stock & Quantity Control */}
          {product.inStock ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {product.trackInventory && product.stockQuantity <= product.lowStockThreshold
                  ? `Solo ${product.stockQuantity} disponibles`
                  : "Disponible hoy"}
              </span>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                {quantityInCart === 0 ? (
                  <button
                    onClick={() => addToCart(product._id)}
                    className="btn-primary flex-1 cursor-pointer px-8 py-3.5 text-center sm:flex-initial"
                  >
                    Añadir al Carrito
                  </button>
                ) : (
                  <div className="flex items-center gap-4 border border-primary/30 rounded-xl px-4 py-2 bg-primary/5">
                    <button
                      onClick={() => removeFromCart(product._id)}
                      className="text-xl font-bold text-primary-dull hover:text-primary transition-colors cursor-pointer px-2"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold text-gray-800 w-8 text-center">{quantityInCart}</span>
                    <button
                      onClick={() => addToCart(product._id)}
                      className="text-xl font-bold text-primary-dull hover:text-primary transition-colors cursor-pointer px-2"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full self-start">
              Agotado temporalmente
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
