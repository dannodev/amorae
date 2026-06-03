import React, { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { assets, categories as originalCategories } from "../assets/assets";
import toast from "react-hot-toast";

const Seller = () => {
  const { products, currency } = useAppContext();
  const [activeTab, setActiveTab] = useState("add-product"); // 'add-product', 'list-products', 'orders'
  
  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Brownies",
    price: "",
    offerPrice: "",
    description1: "",
    description2: "",
    description3: "",
  });
  const [imageFile, setImageFile] = useState(null);

  const handleInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    toast.success("¡Producto agregado exitosamente (Simulado)!");
    setNewProduct({
      name: "",
      category: "Brownies",
      price: "",
      offerPrice: "",
      description1: "",
      description2: "",
      description3: "",
    });
    setImageFile(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 animate-fade-in">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <img src={assets.amorae_logo} alt="logo" className="h-10" />
          <span className="font-semibold text-lg text-primary-dull">Panel Chef</span>
        </div>

        <nav className="flex-grow p-4 space-y-1">
          <button
            onClick={() => setActiveTab("add-product")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "add-product"
                ? "bg-primary/10 text-primary-dull"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <img src={assets.add_icon} alt="add" className="w-4 h-4 opacity-75" />
            Agregar Producto
          </button>

          <button
            onClick={() => setActiveTab("list-products")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "list-products"
                ? "bg-primary/10 text-primary-dull"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <img src={assets.product_list_icon} alt="list" className="w-4 h-4 opacity-75" />
            Lista de Productos
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-primary/10 text-primary-dull"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <img src={assets.order_icon} alt="orders" className="w-4 h-4 opacity-75" />
            Gestionar Pedidos
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          Amorae Chef Admin Dashboard
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow overflow-y-auto p-8">
        {activeTab === "add-product" && (
          <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Subir Nuevo Postre</h2>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {/* Image Upload Box */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Producto</label>
                <div className="flex items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary transition-colors bg-gray-55 cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {imageFile ? (
                    <img src={imageFile} alt="preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-4">
                      <img src={assets.upload_area} alt="upload" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <span className="text-xs text-gray-400">Subir imagen</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Postre</label>
                <input
                  type="text"
                  name="name"
                  value={newProduct.name}
                  onChange={handleInputChange}
                  placeholder="Ej. Brownie Triple Chocolate"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    name="category"
                    value={newProduct.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary text-sm cursor-pointer"
                  >
                    {originalCategories.map((c) => (
                      <option key={c.text} value={c.text}>
                        {c.text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Regular ($)</label>
                  <input
                    type="number"
                    name="price"
                    value={newProduct.price}
                    onChange={handleInputChange}
                    placeholder="90"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Oferta ($)</label>
                  <input
                    type="number"
                    name="offerPrice"
                    value={newProduct.offerPrice}
                    onChange={handleInputChange}
                    placeholder="75"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  />
                </div>
              </div>

              {/* Description Bulletpoints */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Detalles y Atributos (Hasta 3 bullets)</label>
                <input
                  type="text"
                  name="description1"
                  value={newProduct.description1}
                  onChange={handleInputChange}
                  placeholder="Detalle 1: Con cocoa premium 100% natural"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
                <input
                  type="text"
                  name="description2"
                  value={newProduct.description2}
                  onChange={handleInputChange}
                  placeholder="Detalle 2: Elaborado sin conservadores"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <input
                  type="text"
                  name="description3"
                  value={newProduct.description3}
                  onChange={handleInputChange}
                  placeholder="Detalle 3: Horneado el mismo día de entrega"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-primary hover:bg-primary-dull text-white font-medium rounded-lg shadow-md cursor-pointer transition-all"
              >
                Agregar Producto
              </button>
            </form>
          </div>
        )}

        {activeTab === "list-products" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Todos los Postres</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p._id} className="border border-gray-200 rounded-xl p-4 flex gap-4 bg-gray-50">
                  <img src={p.image[0]} alt={p.name} className="w-16 h-16 object-contain rounded bg-white p-1 border" />
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{p.name}</h3>
                    <p className="text-xs text-gray-400 mb-1">{p.category}</p>
                    <p className="text-primary-dull font-bold text-sm">
                      {currency}${p.offerPrice} <span className="text-xs line-through text-gray-400 font-normal">{currency}${p.price}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => toast.success(`Eliminación simulada de: ${p.name}`)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold self-start p-1 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pedidos Recibidos</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-400 uppercase font-semibold">
                    <th className="pb-3">ID Pedido</th>
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Dirección (Gdl, Jal)</th>
                    <th className="pb-3">Monto</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-700">67e2589a8f87e63366786400</td>
                    <td className="py-4">Juan Pérez</td>
                    <td className="py-4 truncate max-w-xs">Av. Vallarta 1234, Americana</td>
                    <td className="py-4 font-semibold text-primary-dull">{currency}$280</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        Recibido
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <select
                        onChange={(e) => toast.success(`Estado actualizado a: ${e.target.value}`)}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white cursor-pointer outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Placed">Recibido</option>
                        <option value="Preparing">Preparando</option>
                        <option value="Delivery">En camino</option>
                        <option value="Delivered">Entregado</option>
                      </select>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-700">67e258798f87e633667863f2</td>
                    <td className="py-4">María Gómez</td>
                    <td className="py-4 truncate max-w-xs">Av. Chapultepec 89, Moderna</td>
                    <td className="py-4 font-semibold text-primary-dull">{currency}$125</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Entregado
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <select
                        defaultValue="Delivered"
                        onChange={(e) => toast.success(`Estado actualizado a: ${e.target.value}`)}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs bg-white cursor-pointer outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Placed">Recibido</option>
                        <option value="Preparing">Preparando</option>
                        <option value="Delivery">En camino</option>
                        <option value="Delivered">Entregado</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Seller;
