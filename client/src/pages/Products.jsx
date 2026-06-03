import React, { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import ProductCard from "../components/ProductCard";

const Products = () => {
  const { products, searchQuery, setSearchQuery } = useAppContext();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [category, setCategory] = useState("all");
  const [sortOption, setSortOption] = useState("default");

  const normalizeText = (value) =>
    value
      ?.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "") || "";

  useEffect(() => {
    let result = [...products];

    // Filter by Category
    if (category !== "all") {
      result = result.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by Search Query
    const normalizedQuery = normalizeText(searchQuery.trim());
    if (normalizedQuery !== "") {
      result = result.filter((p) => {
        const nameMatch = normalizeText(p.name).includes(normalizedQuery);
        const categoryMatch = normalizeText(p.category).includes(normalizedQuery);
        const descriptionMatch = Array.isArray(p.description)
          ? p.description.some((line) =>
              normalizeText(line).includes(normalizedQuery)
            )
          : normalizeText(p.description).includes(normalizedQuery);
        return nameMatch || categoryMatch || descriptionMatch;
      });
    }

    // Sort Products
    if (sortOption === "price-asc") {
      result.sort((a, b) => a.offerPrice - b.offerPrice);
    } else if (sortOption === "price-desc") {
      result.sort((a, b) => b.offerPrice - a.offerPrice);
    }

    setFilteredProducts(result);
  }, [products, category, searchQuery, sortOption]);

  const categoriesList = ["all", "Brownies", "Roles", "Tiramisu", "Sorpresa"];

  return (
    <div className="mt-8 mb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">Nuestros Productos</h1>
          <p className="text-gray-500 mt-1">Repostería fresca elaborada diariamente con amor</p>
        </div>

        {/* Search & Sort controls */}
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Buscar postre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary w-full sm:w-60"
          />

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary cursor-pointer text-gray-700"
          >
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
              category === cat
                ? "bg-primary text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat === "all" ? "Todos" : cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No encontramos productos que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};

export default Products;
