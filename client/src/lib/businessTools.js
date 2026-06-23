const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can fail in private mode; callers still get in-memory result.
  }
};

export const REVIEWS_KEY = "amorae_reviews";
export const CUSTOM_ORDERS_KEY = "amorae_custom_orders";
export const CHECKLIST_KEY = "amorae_daily_checklists";

export const readReviews = () => {
  const value = readJson(REVIEWS_KEY, []);
  return (Array.isArray(value) ? value : [])
    .filter((review) => review && typeof review === "object")
    .map((review, index) => ({
      id: String(review.id || `review_${index}`),
      rating: Math.min(5, Math.max(1, Math.round(Number(review.rating) || 5))),
      comment: String(review.comment || "").slice(0, 1000),
      customerName: String(review.customerName || "Cliente Amorae").slice(0, 100),
      orderId: String(review.orderId || "").slice(0, 120),
      createdAt: review.createdAt || null,
      approved: review.approved === true,
    }));
};

export const saveReview = (reviewData = {}) => {
  const review = {
    id: crypto.randomUUID?.() || `review_${Date.now()}`,
    rating: Math.min(5, Math.max(1, Math.round(Number(reviewData.rating) || 5))),
    comment: String(reviewData.comment || "").trim().slice(0, 1000),
    customerName: String(reviewData.customerName || "").trim().slice(0, 100) || "Cliente Amorae",
    orderId: String(reviewData.orderId || "").trim().slice(0, 120),
    createdAt: new Date().toISOString(),
    approved: true,
  };
  const next = [review, ...readReviews()].slice(0, 80);
  writeJson(REVIEWS_KEY, next);
  return review;
};

export const readCustomOrders = () => {
  const value = readJson(CUSTOM_ORDERS_KEY, []);
  const allowedStatuses = new Set(["Nuevo", "Contactado", "Cotizado", "Confirmado", "Cerrado"]);
  return (Array.isArray(value) ? value : [])
    .filter((request) => request && typeof request === "object")
    .map((request, index) => ({
      ...request,
      id: String(request.id || `custom_${index}`),
      status: allowedStatuses.has(request.status) ? request.status : "Nuevo",
      name: String(request.name || "").slice(0, 100),
      phone: String(request.phone || "").slice(0, 20),
      eventDate: String(request.eventDate || "").slice(0, 10),
      servings: String(request.servings || "").slice(0, 80),
      dessertType: String(request.dessertType || "Otro").slice(0, 80),
      budget: String(request.budget || "").slice(0, 80),
      details: String(request.details || "").slice(0, 1500),
    }));
};

export const saveCustomOrder = (requestData = {}) => {
  const request = {
    id: crypto.randomUUID?.() || `custom_${Date.now()}`,
    status: "Nuevo",
    name: String(requestData.name || "").trim().slice(0, 100),
    phone: String(requestData.phone || "").trim().slice(0, 20),
    eventDate: String(requestData.eventDate || "").slice(0, 10),
    servings: String(requestData.servings || "").trim().slice(0, 80),
    dessertType: String(requestData.dessertType || "Otro").slice(0, 80),
    budget: String(requestData.budget || "").trim().slice(0, 80),
    details: String(requestData.details || "").trim().slice(0, 1500),
    createdAt: new Date().toISOString(),
  };
  const next = [request, ...readCustomOrders()].slice(0, 120);
  writeJson(CUSTOM_ORDERS_KEY, next);
  return request;
};

export const updateCustomOrderStatus = (requestId, status) => {
  const allowedStatuses = new Set(["Nuevo", "Contactado", "Cotizado", "Confirmado", "Cerrado"]);
  if (!allowedStatuses.has(status)) return readCustomOrders();
  const next = readCustomOrders().map((request) =>
    request.id === requestId ? { ...request, status, updatedAt: new Date().toISOString() } : request
  );
  writeJson(CUSTOM_ORDERS_KEY, next);
  return next;
};

const checklistKeyForDate = (dateKey) => `${CHECKLIST_KEY}:${dateKey}`;

export const defaultChecklistItems = [
  "Revisar pedidos del día",
  "Confirmar pagos pendientes",
  "Preparar mise en place",
  "Hornear producción principal",
  "Empacar pedidos",
  "Actualizar inventario",
  "Enviar mensajes de seguimiento",
];

export const readChecklist = (dateKey) => {
  const fallback = defaultChecklistItems.map((text, index) => ({
    id: `default_${index}`,
    text,
    done: false,
  }));
  const value = readJson(checklistKeyForDate(dateKey), fallback);
  if (!Array.isArray(value)) return fallback;
  return value.filter((item) => item && typeof item === "object" && String(item.text || "").trim()).slice(0, 100).map((item, index) => ({
    id: String(item.id || `task_${index}`),
    text: String(item.text).trim().slice(0, 240),
    done: item.done === true,
  }));
};

export const saveChecklist = (dateKey, items) => {
  const safeItems = (Array.isArray(items) ? items : []).slice(0, 100).map((item, index) => ({
    id: String(item?.id || `task_${index}`),
    text: String(item?.text || "").trim().slice(0, 240),
    done: item?.done === true,
  })).filter((item) => item.text);
  writeJson(checklistKeyForDate(dateKey), safeItems);
  return safeItems;
};

export const buildCsv = (rows) => {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object" && !Array.isArray(row)) : [];
  if (!safeRows.length) return "";
  const headers = Object.keys(safeRows[0]);
  const escapeCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...safeRows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
};

export const downloadCsv = (filename, rows) => {
  const csv = buildCsv(rows);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
