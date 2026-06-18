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

export const readReviews = () => readJson(REVIEWS_KEY, []);

export const saveReview = (reviewData) => {
  const review = {
    id: crypto.randomUUID?.() || `review_${Date.now()}`,
    rating: Number(reviewData.rating),
    comment: reviewData.comment?.trim() || "",
    customerName: reviewData.customerName?.trim() || "Cliente Amorae",
    orderId: reviewData.orderId?.trim() || "",
    createdAt: new Date().toISOString(),
    approved: true,
  };
  const next = [review, ...readReviews()].slice(0, 80);
  writeJson(REVIEWS_KEY, next);
  return review;
};

export const readCustomOrders = () => readJson(CUSTOM_ORDERS_KEY, []);

export const saveCustomOrder = (requestData) => {
  const request = {
    id: crypto.randomUUID?.() || `custom_${Date.now()}`,
    status: "Nuevo",
    name: requestData.name?.trim() || "",
    phone: requestData.phone?.trim() || "",
    eventDate: requestData.eventDate || "",
    servings: requestData.servings || "",
    dessertType: requestData.dessertType || "",
    budget: requestData.budget || "",
    details: requestData.details?.trim() || "",
    createdAt: new Date().toISOString(),
  };
  const next = [request, ...readCustomOrders()].slice(0, 120);
  writeJson(CUSTOM_ORDERS_KEY, next);
  return request;
};

export const updateCustomOrderStatus = (requestId, status) => {
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

export const readChecklist = (dateKey) =>
  readJson(checklistKeyForDate(dateKey), defaultChecklistItems.map((text, index) => ({
    id: `default_${index}`,
    text,
    done: false,
  })));

export const saveChecklist = (dateKey, items) => {
  writeJson(checklistKeyForDate(dateKey), items);
  return items;
};

export const buildCsv = (rows) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","))].join("\n");
};

export const downloadCsv = (filename, rows) => {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
