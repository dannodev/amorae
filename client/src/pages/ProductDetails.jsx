import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { assets } from "../assets/assets";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, currency, addToCart, cartItems, removeFromCart } = useAppContext();
  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");

  useEffect(() => {
    if (products && products.length > 0) {
      const found = products.find((p) => p._id === id);
      if (found) {
        setProduct(found);
        setMainImage(found.image[0]);
      }
    }
  }, [id, products]);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 text-lg mb-4">Cargando producto o no disponible...</p>
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

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-6 cursor-pointer"
      >
        <span className="text-xl">&larr;</span> Volver
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left Column - Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-6 flex justify-center items-center h-[350px] md:h-[450px]">
            <img
              src={mainImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain hover:scale-102 transition-transform duration-300"
            />
          </div>

          {/* Thumbnails */}
          {product.image.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.image.map((img, index) => (
                <div
                  key={index}
                  onClick={() => setMainImage(img)}
                  className={`border rounded-lg p-2 bg-white flex justify-center items-center w-20 h-20 cursor-pointer flex-shrink-0 transition-all ${
                    mainImage === img ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail`} className="max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product details */}
        <div className="flex flex-col justify-start">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">{product.category}</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mt-2 mb-4">{product.name}</h1>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 mb-6">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <img
                  key={i}
                  className="w-4 h-4"
                  src={i < 5 ? assets.yellow_star : assets.yellow_star_dull}
                  alt="star"
                />
              ))}
            <p className="text-gray-500 text-sm ml-2">(12 reseñas de clientes)</p>
          </div>

          {/* Price */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-primary-dull">
              {currency}${product.offerPrice}
            </span>
            {product.price > product.offerPrice && (
              <span className="text-gray-400 text-lg line-through">
                {currency}${product.price}
              </span>
            )}
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          {/* Highlights / Description list */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Detalles de creación:</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
              {product.description.map((desc, index) => (
                <li key={index}>{desc}</li>
              ))}
            </ul>
          </div>

          {/* In Stock & Quantity Control */}
          {product.inStock ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                Disponible hoy
              </span>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                {quantityInCart === 0 ? (
                  <button
                    onClick={() => addToCart(product._id)}
                    className="flex-1 sm:flex-initial px-8 py-3.5 bg-primary hover:bg-primary-dull text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-center"
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
