import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/useAppContext";
import toast from "react-hot-toast";
import DeliveryMapPicker from "../components/DeliveryMapPicker";
import {
  computeQuote,
  formatFee,
  getStoreConfig,
  getWhatsAppNumber,
  lookupPostalCode,
} from "../lib/delivery";

const DEBOUNCE_MS = 700;
const DELIVERY_AREA_LABEL = "Guadalajara, Jalisco y zona metropolitana";
const DELIVERY_AREA_WARNING =
  "Por ahora solo entregamos en Guadalajara, Jalisco y zona metropolitana.";
const PICKUP_LOCATIONS = ["Tossa Residencial", "Río Nilo"];
const localDateValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const buildAddressQuery = (form) => ({
  street: form.street,
  colonia: form.colonia,
  zipcode: form.zipcode,
  city: form.city,
  state: form.state,
});

const Checkout = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    products,
    productsLoaded,
    currency,
    getCartCount,
    createOrder,
    clearCart,
    normalizePhone,
  } = useAppContext();
  const {
    storeCoordinates,
    freeOrderMinMxn,
    freeOrderMaxKm,
  } = getStoreConfig();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    street: "",
    colonia: "",
    zipcode: "",
    phone: "",
    notes: "",
    preferredDate: "",
    preferredTime: "",
    state: "Jalisco",
    city: "Guadalajara",
  });

  const [submitting, setSubmitting] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState("delivery");
  const [pickupLocation, setPickupLocation] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [postalLookupLoading, setPostalLookupLoading] = useState(false);
  const [postalOptions, setPostalOptions] = useState([]);
  const [postalLookupError, setPostalLookupError] = useState("");
  const [postalDeliveryStatus, setPostalDeliveryStatus] = useState({
    checked: false,
    allowed: true,
    message: "",
  });
  const [selectedDeliveryLocation, setSelectedDeliveryLocation] = useState(null);
  const [addressAutofillNotice, setAddressAutofillNotice] = useState("");
  const debounceRef = useRef(null);
  const postalDebounceRef = useRef(null);
  const lastQueriedRef = useRef("");
  const submitLockRef = useRef(false);
  const quoteRequestRef = useRef(0);
  const postalRequestRef = useRef(0);

  const cartProducts = products.filter((p) => cartItems[p._id] > 0);
  const subtotal = cartProducts.reduce(
    (sum, p) => sum + p.offerPrice * cartItems[p._id],
    0
  );
  const isPickup = fulfillmentType === "pickup";
  const deliveryFee = !isPickup && quote?.status === "ok" ? Math.ceil(quote.feeMxn) : 0;
  const deliveryStatus = quoteLoading ? "loading" : quote?.status || "idle";
  const total = Math.ceil(subtotal + deliveryFee);
  const isPostalOutOfArea = postalDeliveryStatus.checked && !postalDeliveryStatus.allowed;
  const freeDeliveryRemaining = Math.max(0, Number(freeOrderMinMxn || 0) - subtotal);
  const hasFreeDeliveryPromo = Number(freeOrderMinMxn || 0) > 0 && subtotal >= Number(freeOrderMinMxn || 0);

  const buildDeliveryInput = (form = formData) => buildAddressQuery(form);

  useEffect(() => {
    const requestId = ++quoteRequestRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (isPickup) {
      setQuote(null);
      setQuoteLoading(false);
      return undefined;
    }
    const query = buildDeliveryInput();
    const isComplete =
      formData.zipcode.trim().length === 5 &&
      formData.street.trim().length >= 4 &&
      formData.colonia.trim().length >= 2;
    if (!isComplete) {
      setQuote(null);
      return undefined;
    }
    const signature = JSON.stringify({ ...query, subtotal });
    if (signature === lastQueriedRef.current) return undefined;
    debounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const next = await computeQuote(query, subtotal);
        if (requestId !== quoteRequestRef.current) return;
        lastQueriedRef.current = signature;
        setQuote(next);
      } catch (error) {
        if (requestId !== quoteRequestRef.current) return;
        console.error("Delivery quote failed", error);
        setQuote({ status: "error", message: "No pudimos calcular el envío." });
      } finally {
        if (requestId === quoteRequestRef.current) setQuoteLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // formData is the canonical source for the address snapshot above; we intentionally
    // depend on the individual fields to avoid re-running the effect for unrelated inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.street, formData.colonia, formData.zipcode, formData.city, formData.state, subtotal, isPickup]);

  useEffect(() => {
    const requestId = ++postalRequestRef.current;
    if (postalDebounceRef.current) clearTimeout(postalDebounceRef.current);
    if (isPickup) {
      setPostalLookupLoading(false);
      return undefined;
    }
    const postalCode = formData.zipcode.replace(/\D/g, "");
    if (postalCode.length !== 5) {
      setPostalOptions([]);
      setPostalLookupError("");
      setPostalDeliveryStatus({ checked: false, allowed: true, message: "" });
      setPostalLookupLoading(false);
      return undefined;
    }

    postalDebounceRef.current = setTimeout(async () => {
      setPostalLookupLoading(true);
      setPostalLookupError("");
      try {
        const result = await lookupPostalCode(postalCode);
        if (requestId !== postalRequestRef.current) return;
        const places = result?.places || [];
        const deliveryAvailable = result?.deliveryAvailable !== false;
        setPostalOptions(deliveryAvailable ? places : []);
        setPostalDeliveryStatus({
          checked: true,
          allowed: deliveryAvailable,
          message: deliveryAvailable ? "" : result?.serviceAreaMessage || DELIVERY_AREA_WARNING,
        });
        if (result?.state) {
          setFormData((current) => ({
            ...current,
            state: result.state,
            city: result.primaryMunicipality || current.city || "Guadalajara",
            colonia: deliveryAvailable ? current.colonia : "",
          }));
        }
        if (!deliveryAvailable) {
          setPostalLookupError(result?.serviceAreaMessage || DELIVERY_AREA_WARNING);
        } else if (!places.length) {
          setPostalLookupError("No encontramos colonias para este código postal.");
        }
      } catch (error) {
        if (requestId !== postalRequestRef.current) return;
        console.error("Postal code lookup failed", error);
        setPostalLookupError("No pudimos consultar las colonias. Puedes escribirla manualmente.");
        setPostalDeliveryStatus({ checked: false, allowed: true, message: "" });
      } finally {
        if (requestId === postalRequestRef.current) setPostalLookupLoading(false);
      }
    }, 350);

    return () => {
      if (postalDebounceRef.current) clearTimeout(postalDebounceRef.current);
    };
  }, [formData.zipcode, isPickup]);

  if (!productsLoaded) {
    return <div className="py-24 text-center text-stone-500">Cargando tu pedido...</div>;
  }

  if (cartProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Tu carrito está vacío</h2>
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
    const { name, value } = e.target;
    if (name === "zipcode") {
      const zipcode = value.replace(/\D/g, "").slice(0, 5);
      setFormData((current) => ({
        ...current,
        zipcode,
        colonia: zipcode === current.zipcode ? current.colonia : "",
      }));
      if (zipcode !== formData.zipcode) {
        setSelectedDeliveryLocation(null);
      }
      return;
    }
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleMapSelect = async (location) => {
    lastQueriedRef.current = "";
    setSelectedDeliveryLocation(location);
    if (!location) {
      setAddressAutofillNotice("");
      return;
    }

    setAddressAutofillNotice("Pin guardado para ayudarnos a ubicar la entrega. La dirección escrita sigue siendo la referencia principal.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      toast.error("Por favor completa tus datos de contacto");
      return;
    }

    if (isPickup && !pickupLocation) {
      toast.error("Elige dónde recogerás tu pedido");
      return;
    }

    if (!isPickup && (!formData.street || !formData.colonia || !formData.zipcode)) {
      toast.error("Por favor completa los campos de dirección requeridos");
      return;
    }

    if (!isPickup && (formData.zipcode.replace(/\D/g, "").length !== 5 || isPostalOutOfArea)) {
      toast.error(DELIVERY_AREA_WARNING);
      return;
    }

    if (submitLockRef.current || submitting) return;

    const unavailableProduct = cartProducts.find((product) =>
      !product.inStock ||
      (product.trackInventory && cartItems[product._id] > product.stockQuantity)
    );
    if (unavailableProduct) {
      toast.error(`Revisa la disponibilidad de ${unavailableProduct.name}`);
      return;
    }

    const normalizedPhone = normalizePhone(formData.phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      toast.error("Ingresa un teléfono válido de 10 a 15 dígitos");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);

    let activeQuote = isPickup ? { status: "pickup", feeMxn: 0, distanceKm: null } : quote;
    if (!isPickup && (!activeQuote || activeQuote.status === "idle" || activeQuote.status === "loading")) {
      try {
        setQuoteLoading(true);
        activeQuote = await computeQuote(buildDeliveryInput(formData), subtotal);
        setQuote(activeQuote);
        lastQueriedRef.current = JSON.stringify({ ...buildDeliveryInput(formData), subtotal });
      } catch (error) {
        console.error("Delivery quote failed at submit", error);
        activeQuote = { status: "error", feeMxn: 0, distanceKm: null };
      } finally {
        setQuoteLoading(false);
      }
    }

    const finalFee = activeQuote?.status === "ok" ? Math.ceil(activeQuote.feeMxn) : 0;
    const finalDistance = Number.isFinite(activeQuote?.distanceKm) ? activeQuote.distanceKm : null;

    toast.loading("Registrando pedido...");
    const orderPayload = {
      status: "Recibido",
      isPaid: false,
      amount: subtotal,
      fulfillmentType,
      pickupLocation: isPickup ? pickupLocation : null,
      deliveryFee: finalFee,
      deliveryDistanceKm: finalDistance,
      deliveryStatus: activeQuote?.status || "unresolved",
      phone: formData.phone,
      phoneNormalized: normalizedPhone,
      paymentMethod: "whatsapp",
      customer: {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
      },
      address: {
        fulfillmentType,
        pickupLocation: isPickup ? pickupLocation : null,
        street: isPickup ? "" : formData.street.trim(),
        colonia: isPickup ? "" : formData.colonia.trim(),
        zipcode: isPickup ? "" : formData.zipcode,
        city: isPickup ? "" : formData.city,
        state: isPickup ? "" : formData.state,
        notes: formData.notes.trim(),
        distanceKm: isPickup ? null : finalDistance,
        deliveryCoordinates: isPickup ? null : selectedDeliveryLocation,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
      },
      items: cartProducts.map((product) => ({
        productId: product._id,
        name: product.name,
        category: product.category,
        image: Array.isArray(product.image) && !String(product.image[0] || "").startsWith("data:") ? product.image[0] : undefined,
        offerPrice: product.offerPrice,
        quantity: cartItems[product._id],
      })),
    };

    let order;
    try {
      order = await createOrder(orderPayload);
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || "No se pudo registrar el pedido");
      submitLockRef.current = false;
      setSubmitting(false);
      return;
    }
    try { localStorage.setItem("amorae_last_phone", normalizedPhone); } catch { /* continue without convenience persistence */ }
    clearCart();

    toast.dismiss();

    const whatsappNumber = getWhatsAppNumber();
    let message = `*¡Hola Amorae! 🥐🍰*\n`;
    message += `Quiero finalizar mi pedido con los siguientes productos:\n\n`;

    cartProducts.forEach((p) => {
      const qty = cartItems[p._id];
      message += `• *${qty}x* ${p.name} - ${currency}${p.offerPrice * qty} MXN\n`;
    });

    message += `\n*Subtotal:* ${currency}${subtotal} MXN`;
    if (isPickup) {
      message += `\n*Entrega:* Recolección sin costo`;
    } else if (finalFee > 0) {
      message += `\n*Envío:* ${formatFee(finalFee)}`;
    } else if (Number.isFinite(finalDistance)) {
      message += `\n*Envío:* Gratis`;
    } else {
      message += `\n*Envío:* A confirmar según tu dirección`;
    }
    message += `\n*Total a pagar:* ${currency}${Math.ceil(subtotal + finalFee)} MXN\n\n`;
    message += isPickup ? `*Datos de Recolección:*\n` : `*Datos de Entrega (Guadalajara, Jal):*\n`;
    message += `• *Cliente:* ${formData.firstName} ${formData.lastName}\n`;
    if (isPickup) {
      message += `• *Punto de recolección:* ${pickupLocation}\n`;
      message += `• *Recolección preferida:* ${formData.preferredDate || "Por confirmar"} ${formData.preferredTime || ""}\n`;
    } else {
      message += `• *Dirección:* ${formData.street}, Col. ${formData.colonia}\n`;
      message += `• *C.P.:* ${formData.zipcode}\n`;
      message += `• *Entrega preferida:* ${formData.preferredDate || "Por confirmar"} ${formData.preferredTime || ""}\n`;
    }
    if (!isPickup && selectedDeliveryLocation) {
      message += `• *Pin de entrega:* ${selectedDeliveryLocation.lat.toFixed(5)}, ${selectedDeliveryLocation.lon.toFixed(5)}\n`;
    }
    message += `• *Teléfono:* ${formData.phone}\n`;
    message += `• *Notas:* ${formData.notes || "Ninguna"}\n`;
    if (order?.id) {
      message += `• *ID de Pedido:* ${order.id}\n`;
    }
    message += `\n¿Me confirman disponibilidad y datos de pago? ¡Gracias! ✨`;

    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    toast.success("Pedido registrado");
    navigate("/order-confirmation", {
      state: {
        orderId: order?.id,
        items: orderPayload.items,
        total: Math.ceil(subtotal + finalFee),
        deliveryWindow: {
          date: formData.preferredDate,
          time: formData.preferredTime,
        },
        fulfillmentType,
        pickupLocation: isPickup ? pickupLocation : null,
        whatsappUrl: whatsappURL,
      },
    });
  };

  return (
    <div className="customer-flow mb-20 mt-10 animate-fade-in">
      <span className="section-kicker">Último paso</span>
      <h1 className="section-title mb-3">Preparemos tu pedido</h1>
      <p className="mb-9 max-w-xl text-sm leading-6 text-stone-500">
        Elige cómo quieres recibirlo y confirma tus datos.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="glass-card rounded-[1.75rem] p-6 md:p-8">
            <h2 className="font-display mb-4 text-2xl font-bold text-cocoa">¿Cómo quieres recibirlo?</h2>
            <div className="mb-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de recibir el pedido">
              {[
                ["delivery", "Entrega a domicilio", "Lo llevamos hasta ti"],
                ["pickup", "Pasar a recoger", "Sin costo de envío"],
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={fulfillmentType === value}
                  onClick={() => setFulfillmentType(value)}
                  className={`rounded-2xl border p-4 text-left transition ${fulfillmentType === value ? "border-primary-dull bg-[#fff7eb] ring-2 ring-primary/30" : "border-stone-200 bg-white hover:border-primary/60"}`}
                >
                  <span className="block text-sm font-bold text-cocoa">{title}</span>
                  <span className="mt-1 block text-xs text-stone-500">{description}</span>
                </button>
              ))}
            </div>
            {!isPickup && (
              <div className="mb-5 rounded-2xl border border-[#74866b]/20 bg-[#eef2e9] px-4 py-3 text-sm leading-6 text-green-800">
                Solo realizamos entregas dentro de {DELIVERY_AREA_LABEL}. Verificaremos tu código postal antes de confirmar el pedido.
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Juan"
                    maxLength={80}
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
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              {isPickup && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Punto de recolección *</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PICKUP_LOCATIONS.map((location) => (
                      <button
                        key={location}
                        type="button"
                        onClick={() => setPickupLocation(location)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${pickupLocation === location ? "border-primary-dull bg-[#fff7eb] text-cocoa ring-2 ring-primary/30" : "border-gray-300 bg-white text-gray-700 hover:border-primary"}`}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-stone-500">Te confirmaremos la dirección exacta y el horario por WhatsApp.</p>
                </div>
              )}

              {!isPickup && (<>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="44824"
                    maxLength={5}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {postalLookupLoading
                      ? "Buscando colonias..."
                      : isPostalOutOfArea
                        ? postalDeliveryStatus.message || DELIVERY_AREA_WARNING
                      : postalLookupError && !formData.colonia
                        ? postalLookupError
                        : formData.colonia
                          ? "Colonia/zona lista; puedes corregirla si es necesario."
                          : postalOptions.length
                            ? "Selecciona tu colonia de la lista."
                          : "Primero ingresa tu CP para elegir colonia."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colonia o zona *</label>
                  {postalOptions.length > 0 ? (
                    <select
                      name="colonia"
                      value={formData.colonia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Selecciona tu colonia</option>
                      {postalOptions.map((place, index) => (
                        <option key={`${place.name}-${index}`} value={place.name}>{place.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="colonia"
                      value={formData.colonia}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Villas del Nilo"
                      maxLength={120}
                      required
                    />
                  )}
                </div>
              </div>
              {isPostalOutOfArea && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {postalDeliveryStatus.message || DELIVERY_AREA_WARNING} Si tu dirección está dentro de la zona metropolitana, revisa que el código postal esté escrito correctamente.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Calle y Número *</label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Av. Vallarta 1234, Int 4"
                  maxLength={200}
                  required
                />
              </div>

              </>)}

              {!isPickup && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Móvil *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3312345678"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usaremos este número para enviarte actualizaciones de tu pedido por WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha preferida</label>
                  <input
                    type="date"
                    min={localDateValue()}
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horario preferido</label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Por confirmar</option>
                    <option value="10:00 - 13:00">10:00 - 13:00</option>
                    <option value="13:00 - 16:00">13:00 - 16:00</option>
                    <option value="16:00 - 19:00">16:00 - 19:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas especiales</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                  placeholder={isPickup ? "Ej. Llegaré después de las 4..." : "Ej. Tocar el timbre morado, dejar en recepción..."}
                  maxLength={500}
                ></textarea>
              </div>

              {!isPickup && <div className="space-y-3 rounded-[1.5rem] border border-primary-dull/10 bg-[#fffaf2] p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[.16em] text-primary-dull">Pin opcional</span>
                  <h3 className="font-display mt-1 text-xl font-bold text-cocoa">Ayúdanos a ubicarte en el mapa</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    Después de escribir tu dirección, puedes marcar tu ubicación aproximada. Lo usaremos solo como apoyo para encontrar el lugar de entrega.
                  </p>
                </div>
                <DeliveryMapPicker
                  origin={storeCoordinates}
                  estimatedLocation={quote?.destination}
                  selectedLocation={selectedDeliveryLocation}
                  onSelect={handleMapSelect}
                />
                <p className="text-xs font-medium text-primary-dull">
                  {selectedDeliveryLocation
                    ? addressAutofillNotice || "Pin guardado como referencia."
                    : "Puedes dejarlo vacío si tu dirección escrita es suficiente."}
                </p>
              </div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[1.75rem] p-6 md:sticky md:top-24 md:p-8">
            <h2 className="font-display mb-6 text-2xl font-bold text-cocoa">Finalizar pedido</h2>

            <div className="space-y-3 rounded-2xl border border-[#74866b]/20 bg-[#eef2e9] p-5">
              <h3 className="text-sm font-semibold text-green-800">Confirmación vía WhatsApp</h3>
              <p className="text-sm text-green-700/80 leading-relaxed">
                Al completar tu pedido, podrás abrir WhatsApp con todos los detalles listos. Ahí coordinaremos el pago y {isPickup ? "la recolección" : "la entrega"}.
              </p>
            </div>

            <div className="border-t border-gray-200 my-6 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({getCartCount()} pz)</span>
                <span>{currency}{subtotal}</span>
              </div>
              {!isPickup && <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className={deliveryFee > 0 ? "text-gray-800 font-medium" : "text-green-600 font-medium"}>
                  {deliveryStatus === "ok"
                    ? deliveryFee > 0
                      ? formatFee(deliveryFee)
                      : "¡Gratis!"
                    : deliveryStatus === "loading"
                      ? "Calculando…"
                      : "Por confirmar"}
                </span>
              </div>}
              <div className="flex justify-between font-semibold text-lg text-gray-800">
                <span>Total a Pagar</span>
                <span className="text-primary-dull">{currency}{total}</span>
              </div>
              {!isPickup && Number(freeOrderMinMxn || 0) > 0 && (
                <div className={`rounded-2xl px-4 py-3 text-xs font-semibold leading-5 ${
                  hasFreeDeliveryPromo
                    ? "bg-green-50 text-green-800"
                    : "bg-[#fff5dd] text-primary-dull"
                }`}>
                  {hasFreeDeliveryPromo
                    ? `Tu compra califica para envío gratis hasta ${freeOrderMaxKm} km.`
                    : `Agrega ${currency}${Math.ceil(freeDeliveryRemaining)} más para envío gratis hasta ${freeOrderMaxKm} km.`}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || (!isPickup && isPostalOutOfArea)}
              className="w-full cursor-pointer rounded-full bg-[#4f6f52] py-4 text-center font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#3f5d42] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Registrando..." : "Revisar y confirmar pedido"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
