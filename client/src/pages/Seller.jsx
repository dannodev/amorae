import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../context/useAppContext";
import { assets, categories as originalCategories } from "../assets/assets";
import supabase from "../config/supabase";
import toast from "react-hot-toast";
import InventoryPanel from "../components/seller/InventoryPanel";
import MaterialsPanel from "../components/seller/MaterialsPanel";
import FinancePanel from "../components/seller/FinancePanel";
import RecipeEditor from "../components/seller/RecipeEditor";
import SellerOpsPanel from "../components/seller/SellerOpsPanel";

const STATUSES = ["Recibido", "Preparando", "En Camino", "Entregado"];

const statusColors = {
  Recibido: "bg-blue-100 text-blue-800 border-blue-200",
  Preparando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "En Camino": "bg-orange-100 text-orange-800 border-orange-200",
  Entregado: "bg-green-100 text-green-800 border-green-200",
};

const statusDot = {
  Recibido: "bg-blue-500",
  Preparando: "bg-yellow-500",
  "En Camino": "bg-orange-500",
  Entregado: "bg-green-500",
};

const LOCAL_AUTH_KEY = "amorae_admin_session";
const LOCAL_AUTH_DURATION = 1000 * 60 * 60 * 4;
const MAX_LOGIN_ATTEMPTS = 5;

const Seller = () => {
  const {
    products, currency, createOrder, fetchAllOrders, updateOrderStatus, updateOrderDeliveryFee, updateOrderSellerNote, normalizePhone,
    addProduct, deleteProduct, adjustInventory, updateInventorySettings,
    fetchInventoryMovements, inventoryMovements, inventoryLoading,
    rawMaterials, materialMovements, productRecipes, expenses, businessLoading,
    fetchBusinessData, addRawMaterial, restockRawMaterial, adjustRawMaterial,
    updateRawMaterial, deleteRawMaterial, saveProductRecipe, addExpense, deleteExpense,
  } = useAppContext();
  const localAdminPassword = import.meta.env.DEV ? import.meta.env.VITE_ADMIN_PASSWORD : "";
  const supabaseAuthEnabled = Boolean(supabase);
  const localAuthEnabled = !supabaseAuthEnabled && Boolean(localAdminPassword);
  const [authLoading, setAuthLoading] = useState(supabaseAuthEnabled);
  const [authenticated, setAuthenticated] = useState(() => {
    if (supabaseAuthEnabled) return false;
    try {
      const expiresAt = Number(sessionStorage.getItem(LOCAL_AUTH_KEY));
      return expiresAt > Date.now();
    } catch {
      return false;
    }
  });
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginPending, setLoginPending] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabaseAuthEnabled) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAuthenticated(Boolean(data.session));
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthenticated(Boolean(session));
      setAuthLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabaseAuthEnabled]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginPending || loginAttempts >= MAX_LOGIN_ATTEMPTS) return;

    setLoginPending(true);
    if (supabaseAuthEnabled) {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });
      setLoginPending(false);
      if (error) {
        setLoginAttempts((attempts) => attempts + 1);
        setPasswordInput("");
        toast.error("Correo o contraseña incorrectos");
      }
      return;
    }

    if (!localAuthEnabled) {
      setLoginPending(false);
      toast.error("El acceso administrativo no está configurado");
      return;
    }

    if (passwordInput === localAdminPassword) {
      setAuthenticated(true);
      sessionStorage.setItem(LOCAL_AUTH_KEY, String(Date.now() + LOCAL_AUTH_DURATION));
      setLoginAttempts(0);
    } else {
      setLoginAttempts((attempts) => attempts + 1);
      setPasswordInput("");
      toast.error("Contraseña incorrecta");
    }
    setLoginPending(false);
  };

  const handleLogout = async () => {
    if (supabaseAuthEnabled) await supabase.auth.signOut();
    setAuthenticated(false);
    sessionStorage.removeItem(LOCAL_AUTH_KEY);
  };

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "Brownies",
    price: "",
    offerPrice: "",
    manualCost: "",
    stockQuantity: "10",
    lowStockThreshold: "3",
    description1: "",
    description2: "",
    description3: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [newProductRecipe, setNewProductRecipe] = useState([]);
  const [editingRecipeProduct, setEditingRecipeProduct] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState([]);

  const handleInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Selecciona un archivo de imagen");
        e.target.value = "";
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error("La imagen no puede superar 8 MB");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const image = new Image();
        image.onload = () => {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          setImageFile(canvas.toDataURL("image/webp", 0.82));
        };
        image.onerror = () => toast.error("No se pudo procesar la imagen");
        image.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const price = Number(newProduct.price);
    const offerPrice = Number(newProduct.offerPrice);
    const manualCost = Number(newProduct.manualCost || 0);
    const stockQuantity = Number(newProduct.stockQuantity);
    const lowStockThreshold = Number(newProduct.lowStockThreshold);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(offerPrice) || offerPrice <= 0) {
      toast.error("Ingresa precios válidos mayores a 0");
      return;
    }
    if (offerPrice > price) {
      toast.error("La oferta no puede ser mayor al precio regular");
      return;
    }
    if (!Number.isFinite(manualCost) || manualCost < 0) {
      toast.error("El costo manual no puede ser negativo");
      return;
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
      toast.error("El stock inicial debe ser un número entero no negativo");
      return;
    }
    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0 || !Number.isInteger(lowStockThreshold)) {
      toast.error("El aviso de inventario debe ser un número entero no negativo");
      return;
    }

    const productData = {
      ...newProduct,
      price,
      offerPrice,
      manualCost,
      stockQuantity,
      lowStockThreshold,
      image: imageFile ? [imageFile] : [],
      recipe: newProductRecipe,
    };
    try {
      await addProduct(productData);
      toast.success("Producto agregado correctamente");
      setNewProduct({ name: "", category: "Brownies", price: "", offerPrice: "", manualCost: "", stockQuantity: "10", lowStockThreshold: "3", description1: "", description2: "", description3: "" });
      setImageFile(null);
      setNewProductRecipe([]);
      setShowAddForm(false);
    } catch {
      // The context already reports the persistence error.
    }
  };

  const formatWhatsAppPhone = (phone) => {
    const digits = normalizePhone(phone);
    if (!digits) return "";
    if (digits.length === 10) return `52${digits}`;
    return digits;
  };

  const buildStatusMessage = (order) => {
    return `Hola ${order?.customer?.firstName || ""}, tu pedido ${order?.id || ""} está: ${order?.status || "Recibido"}. ¡Gracias por comprar en Amorae!`;
  };

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const data = await fetchAllOrders();
    if (Array.isArray(data)) setOrders(data);
    setOrdersLoading(false);
    setOrdersLoaded(true);
  }, [fetchAllOrders]);

  useEffect(() => {
    if (authenticated && !ordersLoaded) loadOrders();
  }, [authenticated, ordersLoaded, loadOrders]);

  useEffect(() => {
    if (authenticated && (activeTab === "orders" || activeTab === "dashboard")) {
      if (!ordersLoaded) loadOrders();
    }
  }, [activeTab, authenticated, ordersLoaded, loadOrders]);

  useEffect(() => {
    if (authenticated && (activeTab === "inventory" || activeTab === "dashboard")) {
      fetchInventoryMovements();
    }
    // Avoid refetching when this call updates movement state in context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authenticated]);

  useEffect(() => {
    if (authenticated) fetchBusinessData();
    // Load seller-only financial and recipe data once after authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleStatusChange = async (orderId, status) => {
    const updated = await updateOrderStatus(orderId, status);
    if (!updated) return;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    toast.success(`Estado: ${status}`);
  };

  const handleDeliveryFeeOverride = async (orderId, fee, reason) => {
    const updated = await updateOrderDeliveryFee(orderId, fee, reason);
    if (!updated) return;
    setOrders((prev) => prev.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        deliveryFee: Number(fee),
        deliveryStatus: "manual",
        deliveryNotes: reason,
      };
    }));
    toast.success("Costo de envío actualizado");
  };

  const handleSellerNoteSave = async (orderId, note) => {
    const updated = await updateOrderSellerNote(orderId, note);
    if (!updated) return;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, sellerNote: note.trim() } : o)));
    toast.success("Nota interna guardada");
  };

  const handleDeleteProduct = async (product) => {
    try {
      await deleteProduct(product._id);
      toast.success(`Eliminado: ${product.name}`);
    } catch {
      // The context reports persistence errors.
    }
  };

  const getOrderDate = (createdAt) => {
    if (!createdAt) return "";
    if (typeof createdAt === "string") return new Date(createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    if (createdAt?.toDate) return createdAt.toDate().toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return "";
  };

  const sortedOrders = !orders || !Array.isArray(orders) ? [] : [...orders].sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return bDate - aDate;
  });

  const statusCounts = {};
  STATUSES.forEach((s) => { statusCounts[s] = 0; });
  orders.forEach((o) => { const st = o.status || "Recibido"; statusCounts[st] = (statusCounts[st] || 0) + 1; });
  const deliveredRevenue = orders
    .filter((order) => order.status === "Entregado")
    .reduce((total, order) => total + Number(order.amount || 0), 0);
  const deliveredDelivery = orders
    .filter((order) => order.status === "Entregado")
    .reduce((total, order) => total + (Number(order.deliveryFee) || 0), 0);
  const deliveredCogs = orders
    .filter((order) => order.status === "Entregado")
    .reduce((total, order) => total + Number(order.cogs || 0), 0);
  const totalExpenses = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const realProfit = deliveredRevenue + deliveredDelivery - deliveredCogs - totalExpenses;
  const trackedProducts = products.filter((product) => product.trackInventory);
  const totalStockUnits = trackedProducts.reduce((total, product) => total + product.stockQuantity, 0);
  const lowStockProducts = trackedProducts.filter((product) =>
    product.stockQuantity <= product.lowStockThreshold
  );

  if (authLoading) {
    return (
      <div className="seller-auth-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authenticated) {
    if (!supabaseAuthEnabled && !localAuthEnabled) {
      return (
        <div className="seller-auth-bg flex min-h-screen items-center justify-center px-6">
          <div className="seller-glass w-full max-w-md rounded-[2rem] p-9 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600">!</div>
            <h1 className="font-display text-2xl font-bold text-cocoa">Acceso no configurado</h1>
            <p className="mt-3 text-sm leading-6 text-stone-500">Configura Supabase Auth para proteger el panel administrativo.</p>
            <p className="mt-4 rounded-xl bg-stone-100 px-4 py-3 font-mono text-xs text-stone-500">VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY</p>
          </div>
        </div>
      );
    }
    return (
      <div className="seller-auth-bg relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
        <div className="absolute left-[4%] top-[12%] h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute bottom-[8%] right-[5%] h-72 w-72 rounded-full bg-[#74866b]/12 blur-3xl" />

        <div className="relative grid w-full max-w-[350px] min-w-0 overflow-hidden rounded-[2.5rem] border border-white/50 bg-[#fffaf2]/75 shadow-[0_35px_100px_rgba(61,32,21,0.2)] backdrop-blur-xl sm:max-w-md md:max-w-5xl md:grid-cols-[1.05fr_.95fr]">
          <div className="relative hidden min-h-[610px] overflow-hidden bg-cocoa p-12 text-white md:flex md:flex-col md:justify-between">
            <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full border-[55px] border-white/5" />
            <div className="absolute bottom-[-5rem] right-[-4rem] h-96 w-96 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f7d9b4,#a8643c_72%)] shadow-[inset_-30px_-35px_60px_rgba(60,28,18,.25)]" />
            <div className="relative z-10">
              <span className="text-xs font-bold uppercase tracking-[.2em] text-[#e7b981]">Amorae Studio</span>
              <h1 className="font-display mt-4 max-w-sm text-5xl font-bold leading-[1.02]">Tu repostería, organizada con detalle.</h1>
            </div>
            <div className="relative z-10 h-64 [perspective:900px]">
              <img src={assets.brownie_image} alt="" className="float-slow absolute bottom-12 right-8 z-20 w-56 drop-shadow-[0_28px_20px_rgba(30,12,7,.38)]" />
              <img src={assets.rol_image} alt="" className="float-delayed absolute bottom-0 left-8 z-10 w-36 drop-shadow-[0_24px_18px_rgba(30,12,7,.35)]" />
              <img src={assets.tiramisu_image} alt="" className="float-slow absolute bottom-0 right-48 z-30 w-28 rotate-6 drop-shadow-[0_22px_16px_rgba(30,12,7,.32)]" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center px-7 py-10 sm:px-12 md:px-14">
            <img src={assets.amorae_logo} alt="Amorae" className="mb-9 h-12 w-auto self-start" />
            <span className="section-kicker">Acceso privado</span>
            <h2 className="font-display mt-3 text-3xl font-bold leading-tight text-cocoa sm:text-4xl">Bienvenida de nuevo</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">Administra pedidos, productos y entregas desde un solo lugar.</p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              {supabaseAuthEnabled && (
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">Correo administrativo</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="admin@amorae.mx"
                    autoComplete="username"
                    className="seller-input w-full rounded-2xl px-5 py-3.5 text-sm"
                    required
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">Contraseña</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  className="seller-input w-full rounded-2xl px-5 py-3.5 text-sm"
                  required
                  autoFocus={!supabaseAuthEnabled}
                />
              </div>
              {loginAttempts >= MAX_LOGIN_ATTEMPTS && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">Demasiados intentos. Recarga la página para volver a intentar.</p>
              )}
              {!supabaseAuthEnabled && (
                <p className="break-words rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Modo local de desarrollo. En producción utiliza Supabase Auth.</p>
              )}
            <button
              type="submit"
                disabled={loginPending || loginAttempts >= MAX_LOGIN_ATTEMPTS}
                className="btn-primary mt-2 w-full cursor-pointer py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loginPending ? "Verificando..." : "Entrar al panel"}
            </button>
          </form>
            <div className="mt-8 flex items-center gap-2 text-xs text-stone-400">
              <svg className="h-4 w-4 text-[#74866b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Sesión protegida y acceso restringido
            </div>
          </div>
        </div>
      </div>
    );
  }

  const TabButton = ({ tab, icon, label }) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
      }}
      className={`relative flex min-w-[76px] flex-none snap-center flex-col items-center gap-1 px-2 py-2 text-[10px] transition-all ${
        activeTab === tab ? "text-primary-dull font-semibold" : "text-gray-400"
      }`}
    >
      {activeTab === tab && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-dull rounded-full" />}
      <span className={activeTab === tab ? "scale-105" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  const SidebarButton = ({ tab, icon, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`relative mx-3 flex w-[calc(100%-1.5rem)] cursor-pointer items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all ${
        activeTab === tab
          ? "bg-white/12 text-[#f4d5af] shadow-[inset_0_1px_rgba(255,255,255,.08)]"
          : "text-white/48 hover:bg-white/6 hover:text-white/80"
      }`}
    >
      {activeTab === tab && <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#e4ac72]" />}
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeTab === tab ? "bg-[#e4ac72]/14" : "bg-white/5"}`}>
        {typeof icon === "string" ? (
          <img src={icon} alt="" className={`h-4 w-4 brightness-0 invert ${activeTab === tab ? "opacity-90" : "opacity-45"}`} />
        ) : (
          <span className={activeTab === tab ? "opacity-90" : "opacity-45"}>{icon}</span>
        )}
      </span>
      {label}
    </button>
  );

  const StatCard = ({ label, count, accent = "#C47A44", note }) => (
    <div className="seller-card-3d seller-glass relative overflow-hidden rounded-[1.6rem] p-5">
      <span className="absolute -right-7 -top-7 h-24 w-24 rounded-full opacity-10" style={{ backgroundColor: accent }} />
      <div className="relative">
        <span className="mb-5 block h-1 w-8 rounded-full" style={{ backgroundColor: accent }} />
        <span className="font-display block text-3xl font-bold text-cocoa">{count}</span>
        <span className="mt-1.5 block text-xs font-bold uppercase tracking-[.1em] text-stone-500">{label}</span>
        {note && <span className="mt-2 block text-[11px] text-stone-400">{note}</span>}
      </div>
    </div>
  );

  const OrderCard = ({ order }) => {
    const whatsappPhone = formatWhatsAppPhone(order?.phone || order?.customer?.phone);
    const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(buildStatusMessage(order))}` : null;
    const reviewUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola ${order?.customer?.firstName || ""}, gracias por comprar en Amorae. ¿Nos ayudas con una reseña rápida? ${window.location.origin}/review?order=${encodeURIComponent(order.id || "")}&name=${encodeURIComponent(order?.customer?.firstName || "")}`)}` : null;
    const currentDeliveryFee = Number(order.deliveryFee) || 0;
    const currentDistance = Number(order.deliveryDistanceKm);
    const isManualFee = order.deliveryStatus === "manual";
    const deliveryCoordinates = order.address?.deliveryCoordinates;
    const hasDeliveryPin =
      Number.isFinite(Number(deliveryCoordinates?.lat)) &&
      Number.isFinite(Number(deliveryCoordinates?.lon));
    const [editingFee, setEditingFee] = useState(false);
    const [feeDraft, setFeeDraft] = useState(currentDeliveryFee.toFixed(2));
    const [feeReason, setFeeReason] = useState(order.deliveryNotes || "");
    const [editingSellerNote, setEditingSellerNote] = useState(false);
    const [sellerNoteDraft, setSellerNoteDraft] = useState(order.sellerNote || "");

    const openEditor = () => {
      setFeeDraft(currentDeliveryFee.toFixed(2));
      setFeeReason(order.deliveryNotes || "");
      setEditingFee(true);
    };

    const cancelEditor = () => setEditingFee(false);

    const submitEditor = async () => {
      const numericFee = Number(feeDraft);
      if (!Number.isFinite(numericFee) || numericFee < 0) {
        toast.error("Ingresa un monto válido");
        return;
      }
      await handleDeliveryFeeOverride(order.id, numericFee, feeReason.trim() || "Ajuste manual");
      setEditingFee(false);
    };

    const openSellerNoteEditor = () => {
      setSellerNoteDraft(order.sellerNote || "");
      setEditingSellerNote(true);
    };
    const cancelSellerNoteEditor = () => setEditingSellerNote(false);
    const submitSellerNoteEditor = async () => {
      await handleSellerNoteSave(order.id, sellerNoteDraft);
      setEditingSellerNote(false);
    };
    const printKitchenTicket = () => {
      const rows = (order.items || []).map((item) => `<li><strong>${item.quantity}x</strong> ${item.product?.name || item.name}</li>`).join("");
      const ticket = window.open("", "_blank", "width=420,height=640");
      if (!ticket) {
        toast.error("Permite ventanas emergentes para imprimir.");
        return;
      }
      ticket.document.write(`
        <html><head><title>Ticket ${order.id}</title>
        <style>body{font-family:Arial,sans-serif;padding:24px;color:#2b1a14}h1{font-size:24px}li{margin:8px 0}.box{border:1px solid #ddd;border-radius:12px;padding:14px;margin:12px 0}</style>
        </head><body>
        <h1>Amorae · Ticket de cocina</h1>
        <p><strong>Pedido:</strong> ${order.id}</p>
        <p><strong>Cliente:</strong> ${order.customer?.firstName || ""} ${order.customer?.lastName || ""}</p>
        <p><strong>Entrega:</strong> ${order.address?.preferredDate || "Por confirmar"} ${order.address?.preferredTime || ""}</p>
        <div class="box"><strong>Productos</strong><ul>${rows}</ul></div>
        <div class="box"><strong>Notas</strong><p>${order.address?.notes || "Sin notas"}</p></div>
        <script>window.print(); window.close();</script>
        </body></html>
      `);
      ticket.document.close();
    };

    return (
      <div className="seller-card-3d seller-glass rounded-[1.6rem] p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Pedido</p>
            <p className="text-sm font-semibold text-gray-800 truncate mt-0.5 font-mono">{order.id}</p>
          </div>
          <span className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[order?.status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[order?.status] || "bg-gray-400"}`} />
            {order?.status || "Recibido"}
          </span>
        </div>

        <div className="mb-4 space-y-2 rounded-2xl border border-primary-dull/6 bg-[#f8f1e7] p-4 text-sm text-stone-600">
          <div className="flex justify-between">
            <span className="text-gray-400">Cliente</span>
            <span className="font-medium text-gray-800">{order.customer?.firstName} {order.customer?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Teléfono</span>
            <span className="font-medium text-gray-800">{order.customer?.phone || order.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Dirección</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%]">{order.address?.street}, {order.address?.colonia}</span>
          </div>
          {hasDeliveryPin && (
            <div className="flex justify-between">
              <span className="text-gray-400">Pin</span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${deliveryCoordinates.lat}&mlon=${deliveryCoordinates.lon}#map=17/${deliveryCoordinates.lat}/${deliveryCoordinates.lon}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-dull underline-offset-4 hover:underline"
              >
                Abrir ubicación
              </a>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Fecha</span>
            <span className="font-medium text-gray-800">{getOrderDate(order.createdAt)}</span>
          </div>
          {order.address?.notes && (
            <div className="flex justify-between">
              <span className="text-gray-400">Notas</span>
              <span className="text-gray-600 text-right max-w-[60%]">{order.address.notes}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Envío</span>
            <span className="font-medium text-gray-800 flex items-center gap-1.5">
              {currentDeliveryFee > 0 ? `${currency}${currentDeliveryFee.toFixed(2)}` : <span className="text-green-700">Gratis</span>}
              {Number.isFinite(currentDistance) && currentDistance > 0 && (
                <span className="text-xs text-gray-400 font-normal"> · {currentDistance.toFixed(2)} km</span>
              )}
              {isManualFee && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E4B8B] bg-[#efeafc] px-1.5 py-0.5 rounded">Manual</span>
              )}
            </span>
          </div>
          {order.deliveryNotes && isManualFee && (
            <p className="text-xs text-stone-500 italic">"{order.deliveryNotes}"</p>
          )}
          {!editingFee ? (
            <button
              type="button"
              onClick={openEditor}
              className="w-full mt-1 cursor-pointer rounded-lg border border-dashed border-primary-dull/30 bg-white/50 py-1.5 text-xs font-semibold text-primary-dull transition hover:bg-white"
            >
              {currentDeliveryFee > 0 ? "Ajustar envío" : "Definir envío"}
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-xl border border-primary-dull/20 bg-white p-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Costo de envío (MXN)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeDraft}
                  onChange={(event) => setFeeDraft(event.target.value)}
                  className="seller-input mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal"
                  autoFocus
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Motivo (opcional)
                <input
                  type="text"
                  value={feeReason}
                  onChange={(event) => setFeeReason(event.target.value)}
                  placeholder="Ej. Envío por paquetería"
                  className="seller-input mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submitEditor}
                  className="flex-1 cursor-pointer rounded-lg bg-primary-dull py-2 text-xs font-bold text-white"
                >
                  Guardar envío
                </button>
                <button
                  type="button"
                  onClick={cancelEditor}
                  className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Seller-only internal note (not shown to the customer). */}
          <div className="flex items-start justify-between gap-2 pt-2 border-t border-dashed border-primary-dull/15">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Nota interna (solo obrador)</p>
              {editingSellerNote ? (
                <textarea
                  value={sellerNoteDraft}
                  onChange={(event) => setSellerNoteDraft(event.target.value)}
                  placeholder="Ej. entregado en recepción con María"
                  className="seller-input mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal h-16 resize-none"
                  autoFocus
                />
              ) : order.sellerNote ? (
                <p className="mt-1 text-xs text-stone-600 italic">"{order.sellerNote}"</p>
              ) : (
                <p className="mt-1 text-xs text-stone-400">Sin notas internas todavía.</p>
              )}
            </div>
            {editingSellerNote ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={submitSellerNoteEditor}
                  className="cursor-pointer rounded-lg bg-primary-dull px-3 py-1.5 text-[11px] font-bold text-white"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={cancelSellerNoteEditor}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-semibold text-stone-500 hover:bg-stone-100"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openSellerNoteEditor}
                className="cursor-pointer rounded-lg border border-dashed border-primary-dull/30 bg-white/50 px-2.5 py-1.5 text-[10px] font-bold text-primary-dull hover:bg-white"
              >
                {order.sellerNote ? "Editar" : "Agregar"}
              </button>
            )}
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Productos</p>
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-[#f8f1e7] px-3 py-2 text-sm">
                <span className="text-gray-700">
                  <span className="font-semibold">{item.quantity}x</span> {item.product?.name || item.name}
                </span>
                <span className="text-gray-500 font-medium">{currency}{item.product?.offerPrice || item.offerPrice} c/u</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            {(() => {
              const productSubtotal = Number(order.amount || 0);
              const fee = currentDeliveryFee;
              const total = productSubtotal + fee;
              return (
                <>
                  <p className="text-xl font-bold text-primary-dull">{currency}{total.toFixed(2)}</p>
                  {fee > 0 && (
                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                      Productos {currency}{productSubtotal.toFixed(2)} · Envío {currency}{fee.toFixed(2)}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={order.status || "Recibido"}
              onChange={(e) => handleStatusChange(order.id, e.target.value)}
              className="seller-input cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#4f6f52] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#3f5d42] hover:shadow-md"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            )}
            <button type="button" onClick={printKitchenTicket} className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary-dull shadow-sm transition-all hover:-translate-y-0.5">
              Ticket
            </button>
            {order.status === "Entregado" && reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl bg-[#f4e8d8] px-3 py-2 text-xs font-semibold text-primary-dull shadow-sm transition-all hover:-translate-y-0.5">
                Reseña
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ordersContent = (
    <div className="space-y-4">
      {ordersLoading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando pedidos...</p>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="seller-glass rounded-[1.6rem] border-dashed py-20 text-center">
          <p className="text-gray-400 text-lg font-medium">Aún no hay pedidos</p>
          <p className="text-gray-400 text-sm mt-1">Los pedidos aparecerán aquí cuando los clientes realicen compras</p>
        </div>
      ) : (
        sortedOrders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col overflow-hidden bg-cocoa md:flex">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border-[45px] border-white/4" />
        <div className="relative flex items-center gap-3 border-b border-white/8 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <img src={assets.amorae_logo} alt="Amorae" className="h-7 brightness-0 invert opacity-90" />
          </div>
          <div>
            <span className="font-display block text-lg font-bold leading-tight text-white">Amorae</span>
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-white/38">Studio Admin</span>
          </div>
        </div>
        <nav className="relative flex-grow space-y-1 py-6">
          <SidebarButton tab="dashboard" icon={assets.trust_icon} label="Dashboard" />
          <SidebarButton tab="orders" icon={assets.order_icon} label="Pedidos" />
          <SidebarButton tab="products" icon={assets.product_list_icon} label="Productos" />
          <SidebarButton tab="inventory" label="Inventario" icon={
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v13H4z" /><path d="M7 4h10l3 3H4l3-3z" /><path d="M9 11h6" /></svg>
          } />
          <SidebarButton tab="materials" label="Materias primas" icon={
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3h8l1 5H7l1-5z" /><path d="M6 8h12l1 13H5L6 8z" /><path d="M9 12h6" /></svg>
          } />
          <SidebarButton tab="finance" label="Finanzas" icon={
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>
          } />
          <SidebarButton tab="ops" label="Operación" icon={
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
          } />
        </nav>
        <div className="relative border-t border-white/8 p-5">
          <button onClick={handleLogout} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white/45 transition-colors hover:bg-white/6 hover:text-white/75">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="seller-shell min-h-screen pb-24 md:ml-72 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-primary-dull/8 bg-[#f8f3eb]/88 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <img src={assets.amorae_logo} alt="logo" className="h-8 md:hidden" />
            <div>
              <h1 className="font-display text-xl font-bold text-cocoa md:text-2xl">
                {activeTab === "dashboard" && "Dashboard"}
                {activeTab === "orders" && "Pedidos"}
                {activeTab === "products" && "Productos"}
                {activeTab === "inventory" && "Inventario"}
                {activeTab === "materials" && "Materias primas"}
                {activeTab === "finance" && "Finanzas"}
                {activeTab === "ops" && "Operación"}
              </h1>
              <p className="text-xs text-gray-400 md:hidden">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === "orders" && (
              <button onClick={loadOrders} className="flex items-center gap-1.5 px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                Recargar
              </button>
            )}
            {activeTab === "products" && !showAddForm && (
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white text-sm rounded-xl font-semibold cursor-pointer hover:bg-primary-dull transition-all shadow-sm hover:shadow-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Nuevo
              </button>
            )}
            <button onClick={handleLogout} className="hidden md:flex items-center gap-1.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Salir
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 lg:p-10">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-[2rem] bg-cocoa px-6 py-7 text-white shadow-[0_22px_55px_rgba(61,32,21,.2)] md:px-8">
                <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border-[55px] border-white/5" />
                <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e5b27d]">Resumen del obrador</span>
                    <h2 className="font-display mt-2 text-3xl font-bold">Todo listo para un gran día.</h2>
                    <p className="mt-2 text-sm text-white/50">Revisa pedidos, prepara entregas y mantén tu vitrina al día.</p>
                  </div>
                  <button onClick={() => setActiveTab("orders")} className="w-fit cursor-pointer rounded-full bg-white px-5 py-2.5 text-xs font-bold text-cocoa shadow-lg transition hover:-translate-y-0.5">Ver pedidos →</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Pedidos" count={orders.length} accent="#8B4A2B" note="Total registrado" />
                <StatCard label="Recibidos" count={statusCounts["Recibido"] || 0} accent="#537DA5" note="Por confirmar" />
                <StatCard label="Preparando" count={statusCounts["Preparando"] || 0} accent="#C49735" note="En cocina" />
                <StatCard label="En camino" count={statusCounts["En Camino"] || 0} accent="#C46D3B" note="En reparto" />
                <StatCard label="Ventas" count={`${currency}${deliveredRevenue.toFixed(0)}`} accent="#5E8062" note="Pedidos entregados (productos)" />
                <StatCard label="Envíos" count={`${currency}${deliveredDelivery.toFixed(0)}`} accent="#7A6A9E" note="Tarifas de entrega cobradas" />
                <StatCard label="Inventario" count={totalStockUnits} accent="#5E8062" note={`${lowStockProducts.length} por revisar`} />
                <StatCard label="Utilidad real" count={`${currency}${realProfit.toFixed(0)}`} accent={realProfit >= 0 ? "#5E8062" : "#B85C4A"} note="Ventas + envíos − costos − gastos" />
              </div>
              {lowStockProducts.length > 0 && (
                <div className="seller-glass rounded-[1.75rem] p-5 md:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-700">Atención de inventario</span>
                      <h3 className="font-display mt-1 text-xl font-bold text-cocoa">{lowStockProducts.length} productos necesitan reposición</h3>
                    </div>
                    <button onClick={() => setActiveTab("inventory")} className="w-fit cursor-pointer rounded-full bg-[#f4e8d8] px-5 py-2.5 text-xs font-bold text-primary-dull transition hover:-translate-y-0.5">
                      Abrir inventario →
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lowStockProducts.slice(0, 3).map((product) => (
                      <div key={product._id} className="flex items-center gap-3 rounded-2xl bg-[#fbf6ef] p-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5">
                          <img src={product.image?.[0]} alt="" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-cocoa">{product.name}</p>
                          <p className={`text-xs font-semibold ${product.stockQuantity === 0 ? "text-red-600" : "text-amber-700"}`}>
                            {product.stockQuantity === 0 ? "Agotado" : `${product.stockQuantity} unidades`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-cocoa">Pedidos recientes</h2>
                  {orders.length > 0 && (
                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary-dull text-xs font-semibold rounded-full">{orders.length} total</span>
                  )}
                </div>
                {ordersContent}
              </div>
            </div>
          )}

          {/* Orders */}
          {activeTab === "orders" && ordersContent}

          {/* Products */}
          {activeTab === "products" && (
            <div className="space-y-6">
              {showAddForm && (
                <div className="seller-glass rounded-[2rem] p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-cocoa">Nuevo postre</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Agrega un nuevo producto al catálogo</p>
                    </div>
                    <button onClick={() => setShowAddForm(false)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer text-lg">&times;</button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del producto</label>
                      <div className="group relative flex h-44 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary-dull/20 bg-[#f8f1e7] transition-colors hover:border-primary">
                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {imageFile ? (
                          <img src={imageFile} alt="preview" className="w-full h-full object-contain p-4" />
                        ) : (
                          <div className="text-center">
                            <img src={assets.upload_area} alt="" className="w-12 h-12 mx-auto mb-2 opacity-40 group-hover:opacity-60 transition-opacity" />
                            <span className="text-sm text-gray-400 group-hover:text-gray-500 transition-colors">Haz clic para subir imagen</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del postre</label>
                      <input type="text" name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Ej. Brownie Triple Chocolate" className="seller-input w-full rounded-xl px-4 py-2.5 text-sm" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
                        <select name="category" value={newProduct.category} onChange={handleInputChange} className="seller-input w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm">
                          {originalCategories.map((c) => <option key={c.path} value={c.path}>{c.text}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio</label>
                        <input type="number" name="price" value={newProduct.price} onChange={handleInputChange} placeholder="90" className="seller-input w-full rounded-xl px-3 py-2.5 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Oferta</label>
                        <input type="number" name="offerPrice" value={newProduct.offerPrice} onChange={handleInputChange} placeholder="75" className="seller-input w-full rounded-xl px-3 py-2.5 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Costo manual</label>
                        <input type="number" min="0" step="0.01" name="manualCost" value={newProduct.manualCost} onChange={handleInputChange} placeholder="Solo sin receta" className="seller-input w-full rounded-xl px-3 py-2.5 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Stock inicial</label>
                        <input type="number" min="0" name="stockQuantity" value={newProduct.stockQuantity} onChange={handleInputChange} placeholder="10" className="seller-input w-full rounded-xl px-3 py-2.5 text-sm" required />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Aviso en</label>
                        <input type="number" min="0" name="lowStockThreshold" value={newProduct.lowStockThreshold} onChange={handleInputChange} placeholder="3" className="seller-input w-full rounded-xl px-3 py-2.5 text-sm" required />
                      </div>
                    </div>
                    <RecipeEditor
                      materials={rawMaterials}
                      recipe={newProductRecipe}
                      onChange={setNewProductRecipe}
                      currency={currency}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Detalles del producto</label>
                      <div className="space-y-2.5">
                        <input type="text" name="description1" value={newProduct.description1} onChange={handleInputChange} placeholder="Ej. Chocolate 70% Cacao" className="seller-input w-full rounded-xl px-4 py-2.5 text-sm" required />
                        <input type="text" name="description2" value={newProduct.description2} onChange={handleInputChange} placeholder="Detalle adicional (opcional)" className="seller-input w-full rounded-xl px-4 py-2.5 text-sm" />
                        <input type="text" name="description3" value={newProduct.description3} onChange={handleInputChange} placeholder="Detalle adicional (opcional)" className="seller-input w-full rounded-xl px-4 py-2.5 text-sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button type="submit" className="btn-primary flex-1 cursor-pointer py-3">Guardar producto</button>
                      <button type="button" onClick={() => setShowAddForm(false)} className="py-3 px-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer text-sm font-medium">Cancelar</button>
                    </div>
                  </form>
                </div>
              )}

              {!showAddForm && (
                <>
                  {editingRecipeProduct && (
                    <div className="seller-glass rounded-[1.75rem] p-5 md:p-7">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-dull">Costeo del producto</span>
                          <h2 className="font-display mt-1 text-2xl font-bold text-cocoa">{editingRecipeProduct.name}</h2>
                        </div>
                        <button type="button" onClick={() => setEditingRecipeProduct(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-lg text-stone-500">&times;</button>
                      </div>
                      <RecipeEditor materials={rawMaterials} recipe={editingRecipe} onChange={setEditingRecipe} currency={currency} />
                      <div className="mt-4 flex justify-end">
                        <button type="button" onClick={async () => {
                          try {
                            await saveProductRecipe(editingRecipeProduct._id, editingRecipe);
                            toast.success("Receta y costo actualizados");
                            setEditingRecipeProduct(null);
                          } catch {
                            toast.error("No se pudo guardar la receta");
                          }
                        }} className="btn-primary px-6 py-3 text-xs">Guardar receta</button>
                      </div>
                    </div>
                  )}
                  {products.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
                      <p className="text-gray-400 text-lg font-medium">No hay productos</p>
                      <p className="text-gray-400 text-sm mt-1">Agrega tu primer producto para empezar a vender</p>
                      <button onClick={() => setShowAddForm(true)} className="mt-4 px-6 py-2.5 bg-primary text-white text-sm rounded-xl font-semibold cursor-pointer hover:bg-primary-dull transition-all shadow-sm">+ Agregar Producto</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                      {products.map((p) => (
                        <div key={p._id} className="seller-card-3d seller-glass group rounded-[1.6rem] p-4">
                          <div className="relative mb-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,#fff,#f0dfc9)] p-3">
                            <div className="absolute bottom-4 h-4 w-1/2 rounded-[50%] bg-cocoa/10 blur-md" />
                            <img loading="lazy" src={p.image?.[0]} alt={p.name} className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_14px_12px_rgba(64,33,22,.16)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" />
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">{p.category}</p>
                          <h3 className="font-display mt-1 truncate text-lg font-bold text-cocoa">{p.name}</h3>
                          <p className="mt-2 text-sm font-bold text-primary-dull">{currency}{p.offerPrice} <span className="ml-1 text-xs font-normal text-stone-400 line-through">{currency}{p.price}</span></p>
                          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f8f1e7] px-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Inventario</span>
                            <span className={`text-xs font-bold ${
                              p.stockQuantity === 0 ? "text-red-600" :
                              p.stockQuantity <= p.lowStockThreshold ? "text-amber-700" : "text-green-700"
                            }`}>
                              {p.trackInventory ? `${p.stockQuantity} unidades` : "Sin límite"}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => setActiveTab("inventory")} className="flex-1 cursor-pointer rounded-xl bg-[#f4e8d8] py-2 text-xs font-semibold text-primary-dull transition hover:bg-[#ecd9c1]">
                              Stock
                            </button>
                            <button onClick={() => {
                              setEditingRecipeProduct(p);
                              setEditingRecipe((productRecipes[p._id] || []).map((ingredient) => ({ ...ingredient })));
                            }} className="flex-1 cursor-pointer rounded-xl bg-cocoa py-2 text-xs font-semibold text-white transition hover:opacity-90">
                              Receta
                            </button>
                            {p._id.startsWith("custom_") && (
                              <button onClick={() => handleDeleteProduct(p)} className="cursor-pointer rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 transition-all hover:bg-red-50" aria-label={`Eliminar ${p.name}`}>
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <InventoryPanel
              products={products}
              currency={currency}
              adjustInventory={adjustInventory}
              updateInventorySettings={updateInventorySettings}
              inventoryMovements={inventoryMovements}
              inventoryLoading={inventoryLoading}
            />
          )}

          {activeTab === "materials" && (
            <MaterialsPanel
              materials={rawMaterials}
              movements={materialMovements}
              currency={currency}
              loading={businessLoading}
              addRawMaterial={addRawMaterial}
              restockRawMaterial={restockRawMaterial}
              adjustRawMaterial={adjustRawMaterial}
              updateRawMaterial={updateRawMaterial}
              deleteRawMaterial={deleteRawMaterial}
            />
          )}

          {activeTab === "finance" && (
            <FinancePanel
              orders={orders}
              expenses={expenses}
              products={products}
              rawMaterials={rawMaterials}
              productRecipes={productRecipes}
              currency={currency}
              addExpense={addExpense}
              deleteExpense={deleteExpense}
              createOrder={createOrder}
              onSaleCreated={(order) => setOrders((current) => [order, ...current])}
            />
          )}

          {activeTab === "ops" && (
            <SellerOpsPanel
              orders={orders}
              products={products}
              rawMaterials={rawMaterials}
              currency={currency}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {mobileMenuOpen && (
        <div className="fixed bottom-[88px] left-3 right-3 z-50 rounded-2xl border border-primary-dull/10 bg-[#fffdf9]/96 p-3 shadow-[0_18px_55px_rgba(74,38,25,.24)] backdrop-blur-xl md:hidden">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.14em] text-stone-400">Administración</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["inventory", "Inventario", <svg key="inventory" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16v13H4z" /><path d="M7 4h10l3 3H4l3-3z" /></svg>],
              ["materials", "Ingredientes", <svg key="materials" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3h8l1 5H7l1-5z" /><path d="M6 8h12l1 13H5L6 8z" /></svg>],
              ["finance", "Finanzas", <svg key="finance" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></svg>],
              ["ops", "Operación", <svg key="ops" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>],
            ].map(([tab, label, icon]) => (
              <button key={tab} type="button" onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }} className={`flex min-w-0 flex-col items-center gap-2 rounded-xl px-2 py-3 text-[10px] font-bold ${activeTab === tab ? "bg-[#f4e8d8] text-primary-dull" : "bg-stone-50 text-stone-500"}`}>
                {icon}
                <span className="max-w-full truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-3 left-3 right-3 z-50 overflow-hidden rounded-2xl border border-primary-dull/10 bg-[#fffdf9]/92 shadow-[0_14px_40px_rgba(74,38,25,.2)] backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="grid grid-cols-4 items-center px-2 py-1">
          <TabButton tab="dashboard" label="Dashboard" icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          } />
          <TabButton tab="orders" label="Pedidos" icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" />
            </svg>
          } />
          <TabButton tab="products" label="Productos" icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          } />
          <button type="button" onClick={() => setMobileMenuOpen((value) => !value)} className={`relative flex min-w-0 flex-col items-center gap-1 px-2 py-2 text-[10px] transition-all ${["inventory", "materials", "finance", "ops"].includes(activeTab) || mobileMenuOpen ? "font-semibold text-primary-dull" : "text-gray-400"}`}>
            {(["inventory", "materials", "finance", "ops"].includes(activeTab) || mobileMenuOpen) && <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-dull" />}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
            <span>Más</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Seller;
