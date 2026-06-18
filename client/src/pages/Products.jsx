import { useMemo, useState } from "react";
import { useAppContext } from "../context/useAppContext";
import ProductCard from "../components/ProductCard";

const normalizeText = (value) =>
  value
    ?.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") || "";

const Products = () => {
  const { products, searchQuery, setSearchQuery } = useAppContext();
  const [category, setCategory] = useState("all");
  const [sortOption, setSortOption] = useState("default");

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Category
    if (category !== "all") {
      result = result.filter(
        (p) => normalizeText(p.category) === normalizeText(category)
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

    return result;
  }, [products, category, searchQuery, sortOption]);

  const categoriesList = useMemo(
    () => ["all", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  return (
    <div className="mb-20 mt-10 animate-fade-in">
      <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-primary-dull/10 bg-[#f1dfc8] px-6 py-9 shadow-[0_18px_50px_rgba(85,45,27,0.08)] md:px-10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[45px] border-white/30" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <div>
          <span className="section-kicker">Nuestra vitrina</span>
          <h1 className="section-title">Postres para celebrar lo cotidiano</h1>
          <p className="mt-3 text-sm text-stone-600">Elaborados frescos, en pequeños lotes y con mucho detalle.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Buscar postre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bakery-input w-full rounded-full px-5 py-3 text-sm sm:w-60"
          />

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bakery-input cursor-pointer rounded-full px-5 py-3 text-sm text-stone-600"
          >
            <option value="default">Ordenar por</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`cursor-pointer rounded-full px-5 py-2.5 text-xs font-bold transition-all ${
              category === cat
                ? "bg-cocoa text-white shadow-md"
                : "border border-primary-dull/10 bg-white/70 text-stone-600 hover:border-primary/30 hover:bg-white"
            }`}
          >
            {cat === "all" ? "Todos" : cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-[2rem] py-20 text-center">
          <p className="font-display text-xl text-cocoa">No encontramos ese antojo.</p>
          <p className="mt-2 text-sm text-stone-500">Prueba con otro nombre o categoría.</p>
        </div>
      )}
    </div>
  );
};

export default Products;
