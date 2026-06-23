import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import supabase from "../config/supabase";
import { AppContext } from "./AppContextCore";

const asArray = (value) => Array.isArray(value) ? value : [];
const asObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const finiteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};
const ORDER_STATUSES = new Set(["Recibido", "Preparando", "En Camino", "Listo para recoger", "Entregado"]);
const MAX_DELIVERY_FEE = 1_000_000;
const MAX_SELLER_NOTE_LENGTH = 1000;
const MAX_DELIVERY_REASON_LENGTH = 200;
const MAX_BUSINESS_AMOUNT = 1_000_000_000;
const MAX_RECIPE_QUANTITY = 1_000_000;
const compactOrderImage = (value) => {
    const image = String(value || "");
    return image.startsWith("data:") ? "" : image.slice(0, 1000);
};
const normalizeCart = (value) => Object.fromEntries(
    Object.entries(asObject(value))
        .map(([id, quantity]) => [id, Math.min(999, Math.max(0, Math.floor(finiteNumber(quantity))))])
        .filter(([id, quantity]) => id && quantity > 0)
);
const normalizeRecipeMap = (value) => Object.fromEntries(
    Object.entries(asObject(value)).map(([productId, recipe]) => [productId, asArray(recipe)
        .map((ingredient) => ({ materialId: String(ingredient?.materialId || ""), quantity: finiteNumber(ingredient?.quantity) }))
        .filter((ingredient) => ingredient.materialId && ingredient.quantity > 0)])
);
const normalizeOrderItem = (rawItem) => {
    const item = asObject(rawItem);
    const product = asObject(item.product);
    return {
        ...item,
        productId: String(item.productId || item.product_id || product._id || ""),
        name: String(item.name || product.name || "Producto"),
        category: String(item.category || product.category || ""),
        image: typeof item.image === "string" ? item.image : (Array.isArray(product.image) ? product.image[0] : ""),
        offerPrice: Math.max(0, finiteNumber(item.offerPrice ?? product.offerPrice)),
        quantity: Math.min(999, Math.max(0, Math.floor(finiteNumber(item.quantity)))),
        product: Object.keys(product).length ? {
            ...product,
            name: String(product.name || item.name || "Producto"),
            category: String(product.category || item.category || ""),
            offerPrice: Math.max(0, finiteNumber(product.offerPrice ?? item.offerPrice)),
            image: Array.isArray(product.image) ? product.image.filter((image) => typeof image === "string") : [],
        } : undefined,
    };
};

export const AppContextProvider = ({ children }) => {

    const currency = import.meta.env.VITE_CURRENCY || "$";

    const navigate = useNavigate()
    const [products, setProducts] = useState([])
    const [productsLoaded, setProductsLoaded] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [cartItems, setCartItems] = useState(() => {
        try {
            const localData = localStorage.getItem("amorae_cart");
            return normalizeCart(localData ? JSON.parse(localData) : {});
        } catch (error) {
            console.error("Failed to parse cart items", error);
            return {};
        }
    })
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState(null);
    const [inventoryMovements, setInventoryMovements] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [materialMovements, setMaterialMovements] = useState([]);
    const [productRecipes, setProductRecipes] = useState({});
    const [expenses, setExpenses] = useState([]);
    const [businessLoading, setBusinessLoading] = useState(false);
    const supabaseEnabled =
        Boolean(import.meta.env.VITE_SUPABASE_URL) &&
        Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
    const localOrdersKey = "amorae_orders";
    const customProductsKey = "amorae_custom_products";
    const inventoryKey = "amorae_inventory";
    const inventoryMovementsKey = "amorae_inventory_movements";
    const rawMaterialsKey = "amorae_raw_materials";
    const materialMovementsKey = "amorae_material_movements";
    const productRecipesKey = "amorae_product_recipes";
    const expensesKey = "amorae_expenses";

    const readLocalValue = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : fallback;
            return Array.isArray(fallback) ? asArray(parsed) : asObject(parsed);
        } catch {
            return fallback;
        }
    };

    const writeLocalValue = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* skip */ }
    };

    const normalizeProduct = (product, inventory = {}) => {
        const stockQuantity = Math.max(0, finiteNumber(inventory.stockQuantity ?? product.stockQuantity));
        const lowStockThreshold = Math.max(0, finiteNumber(inventory.lowStockThreshold ?? product.lowStockThreshold, 3));
        const trackInventory = inventory.trackInventory ?? product.trackInventory ?? true;
        return {
            ...product,
            _id: String(product._id || ""),
            name: String(product.name || "Producto sin nombre"),
            category: String(product.category || "Otro"),
            price: Math.max(0, finiteNumber(product.price)),
            offerPrice: Math.max(0, finiteNumber(product.offerPrice)),
            image: Array.isArray(product.image) ? product.image.filter((image) => typeof image === "string" && image) : [],
            description: (Array.isArray(product.description) ? product.description : [product.description])
                .filter((description) => typeof description === "string" || typeof description === "number")
                .map(String)
                .filter(Boolean),
            stockQuantity,
            lowStockThreshold,
            trackInventory,
            manualCost: Math.max(0, finiteNumber(product.manualCost)),
            inStock: trackInventory ? stockQuantity > 0 : (inventory.inStock ?? product.inStock ?? true),
        };
    };

    const readLocalInventory = () => {
        try {
            const raw = localStorage.getItem(inventoryKey);
            return asObject(raw ? JSON.parse(raw) : {});
        } catch {
            return {};
        }
    };

    const writeLocalInventory = (inventory) => {
        try { localStorage.setItem(inventoryKey, JSON.stringify(inventory)); } catch { /* skip */ }
    };

    const readLocalMovements = () => {
        try {
            const raw = localStorage.getItem(inventoryMovementsKey);
            return asArray(raw ? JSON.parse(raw) : []).filter((movement) => movement && typeof movement === "object").map((movement) => ({
                ...movement,
                quantityChange: finiteNumber(movement.quantityChange),
                reason: String(movement.reason || "Ajuste"),
            }));
        } catch {
            return [];
        }
    };

    const recordLocalMovement = (movement) => {
        const next = [{
            id: crypto.randomUUID?.() || `movement_${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...movement,
        }, ...readLocalMovements()].slice(0, 100);
        try { localStorage.setItem(inventoryMovementsKey, JSON.stringify(next)); } catch { /* skip */ }
        setInventoryMovements(next);
    };

    const normalizeMaterial = (material) => ({
        id: String(material.id || ""),
        name: String(material.name || "Ingrediente"),
        unit: ["g", "kg", "ml", "l", "unit"].includes(material.unit) ? material.unit : "g",
        stockQuantity: Math.max(0, finiteNumber(material.stock_quantity ?? material.stockQuantity)),
        lowStockThreshold: Math.max(0, finiteNumber(material.low_stock_threshold ?? material.lowStockThreshold)),
        costPerUnit: Math.max(0, finiteNumber(material.cost_per_unit ?? material.costPerUnit)),
        supplier: String(material.supplier || ""),
        updatedAt: material.updated_at ?? material.updatedAt,
    });

    const calculateRecipeCost = (recipe = [], materials = rawMaterials) =>
        recipe.reduce((total, ingredient) => {
            const material = materials.find((item) => item.id === ingredient.materialId);
            return total + Number(ingredient.quantity || 0) * Number(material?.costPerUnit || 0);
        }, 0);

    const recordLocalMaterialMovement = (movement) => {
        const next = [{
            id: crypto.randomUUID?.() || `material_movement_${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...movement,
        }, ...readLocalValue(materialMovementsKey, [])].slice(0, 150);
        writeLocalValue(materialMovementsKey, next);
        setMaterialMovements(next);
    };

    const mapOrderFromDatabase = (rawOrder) => {
        const order = asObject(rawOrder);
        const address = asObject(order.address);
        const customer = asObject(order.customer);
        const topLevelDistance = order.delivery_distance_km === null || order.delivery_distance_km === undefined
            ? null
            : finiteNumber(order.delivery_distance_km, null);
        return {
        ...order,
        address,
        customer,
        items: asArray(order.items).filter((item) => item && typeof item === "object").map(normalizeOrderItem).filter((item) => item.productId && item.quantity > 0),
        amount: Math.max(0, finiteNumber(order.amount)),
        cogs: Math.max(0, finiteNumber(order.cogs)),
        // deliveryFee and deliveryDistanceKm can live at the top level (new schema)
        // or fall back to the address JSONB (legacy rows that predate the migration).
        deliveryFee: Math.max(0, finiteNumber(
            order.delivery_fee
            ?? address.deliveryFee
            ?? 0
        )),
        deliveryDistanceKm: topLevelDistance ?? finiteNumber(address.distanceKm, null),
        deliveryStatus: order.delivery_status || address.deliveryStatus || null,
        deliveryNotes: order.delivery_notes || address.deliveryNotes || null,
        fulfillmentType: address.fulfillmentType || order.fulfillmentType || "delivery",
        pickupLocation: address.pickupLocation || order.pickupLocation || null,
        // Seller-only note (never shown to the customer).
        sellerNote: address.sellerNote || order.sellerNote || "",
        phoneNormalized: order.phone_normalized ?? order.phoneNormalized ?? "",
        phone: customer.phone ?? order.phone ?? "",
        paymentMethod: order.payment_method ?? order.paymentMethod ?? "whatsapp",
        isPaid: order.is_paid ?? order.isPaid ?? false,
        createdAt: order.created_at ?? order.createdAt ?? null,
        updatedAt: order.updated_at ?? order.updatedAt ?? null,
        };
    };

    // Fetch All Products (including custom ones from Supabase/localStorage)
    const fetchProducts = async () => {
        const localInventory = readLocalInventory();
        let allProducts = dummyProducts.map((product) => normalizeProduct(product, localInventory[product._id]));
        if (supabaseEnabled) {
            try {
                const [{ data, error }, { data: inventoryData, error: inventoryError }] = await Promise.all([
                    supabase.from("products").select("*"),
                    supabase.from("inventory").select("*"),
                ]);
                if (error) throw error;
                if (inventoryError) throw inventoryError;

                const remoteInventory = Object.fromEntries((inventoryData || []).map((item) => [
                    item.product_id,
                    {
                        stockQuantity: item.stock_quantity,
                        lowStockThreshold: item.low_stock_threshold,
                        trackInventory: item.track_inventory,
                    },
                ]));
                allProducts = dummyProducts.map((product) =>
                    normalizeProduct(product, remoteInventory[product._id] || localInventory[product._id])
                );

                if (data) {
                    const mapped = data.map((p) => normalizeProduct({
                        _id: `custom_${p.id}`,
                        name: p.name,
                        category: p.category,
                        price: p.price,
                        offerPrice: p.offerPrice,
                        image: p.image || [""],
                        description: p.description || [],
                        manualCost: p.manualCost,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt,
                        inStock: p.inStock ?? true,
                    }, remoteInventory[`custom_${p.id}`] || localInventory[`custom_${p.id}`]));
                    try { localStorage.setItem(customProductsKey, JSON.stringify(mapped)); } catch { /* skip */ }
                    allProducts = [...allProducts, ...mapped];
                }
            } catch (e) {
                console.error("Failed to fetch custom products", e);
                const local = readLocalCustomProducts();
                allProducts = [
                    ...dummyProducts.map((product) => normalizeProduct(product, localInventory[product._id])),
                    ...local.map((product) => normalizeProduct(product, localInventory[product._id])),
                ];
            }
        } else {
            const local = readLocalCustomProducts();
            allProducts = [...allProducts, ...local.map((product) => normalizeProduct(product, localInventory[product._id]))];
            setInventoryMovements(readLocalMovements());
        }
        setProducts(allProducts);
        setProductsLoaded(true);
    };

    const readLocalCustomProducts = () => {
        try {
            const raw = localStorage.getItem(customProductsKey);
            return asArray(raw ? JSON.parse(raw) : []);
        } catch {
            return [];
        }
    };

    const addProduct = async (productData) => {
        const price = Number(productData.price);
        const offerPrice = Number(productData.offerPrice);
        const stockQuantity = Number(productData.stockQuantity);
        const lowStockThreshold = Number(productData.lowStockThreshold);
        const manualCost = Number(productData.manualCost || 0);
        if (!productData.name?.trim() || !productData.category?.trim()) throw new Error("Nombre y categoría son obligatorios");
        if (!Number.isFinite(price) || price <= 0 || price > MAX_BUSINESS_AMOUNT || !Number.isFinite(offerPrice) || offerPrice <= 0 || offerPrice > price || !Number.isFinite(manualCost) || manualCost < 0 || manualCost > MAX_BUSINESS_AMOUNT) {
            throw new Error("Los precios del producto no son válidos");
        }
        if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1_000_000 || !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1_000_000) {
            throw new Error("La configuración de inventario no es válida");
        }
        const newProduct = {
            _id: `custom_${crypto.randomUUID?.() || Date.now()}`,
            name: productData.name.trim().slice(0, 120),
            category: productData.category.trim().slice(0, 80),
            price,
            offerPrice,
            image: productData.image || [""],
            description: [productData.description1, productData.description2, productData.description3].filter(Boolean),
            manualCost,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stockQuantity,
            lowStockThreshold,
            trackInventory: true,
            inStock: Number(productData.stockQuantity || 0) > 0,
        };
        if (supabaseEnabled) {
            let savedProductId = null;
            try {
                const { data, error } = await supabase.from("products").insert({
                    name: newProduct.name,
                    category: newProduct.category,
                    price: newProduct.price,
                    offerPrice: newProduct.offerPrice,
                    image: newProduct.image,
                    description: newProduct.description,
                    manualCost: newProduct.manualCost,
                    inStock: true,
                }).select().single();
                if (error) throw error;

                savedProductId = data.id;
                newProduct._id = `custom_${savedProductId}`;
                const { error: inventoryError } = await supabase.from("inventory").insert({
                    product_id: newProduct._id,
                    stock_quantity: newProduct.stockQuantity,
                    low_stock_threshold: newProduct.lowStockThreshold,
                    track_inventory: true,
                });
                if (inventoryError) {
                    await supabase.from("products").delete().eq("id", savedProductId);
                    throw inventoryError;
                }
                if (productData.recipe?.length) {
                    const { error: recipeError } = await supabase.from("product_recipes").insert(
                        productData.recipe.map((ingredient) => ({
                            product_id: newProduct._id,
                            material_id: ingredient.materialId,
                            quantity: Number(ingredient.quantity),
                        }))
                    );
                    if (recipeError) {
                        await supabase.from("inventory").delete().eq("product_id", newProduct._id);
                        await supabase.from("products").delete().eq("id", savedProductId);
                        throw recipeError;
                    }
                }
            } catch (e) {
                console.error("Failed to save product to Supabase", e);
                toast.error("No se pudo guardar el producto en línea.");
                throw e;
            }
        }
        const updated = [...readLocalCustomProducts(), newProduct];
        const inventory = readLocalInventory();
        inventory[newProduct._id] = {
            stockQuantity: newProduct.stockQuantity,
            lowStockThreshold: newProduct.lowStockThreshold,
            trackInventory: true,
        };
        writeLocalInventory(inventory);
        if (productData.recipe?.length) {
            const recipes = readLocalValue(productRecipesKey, {});
            recipes[newProduct._id] = productData.recipe.map((ingredient) => ({
                materialId: ingredient.materialId,
                quantity: Number(ingredient.quantity),
            }));
            writeLocalValue(productRecipesKey, recipes);
            setProductRecipes(recipes);
        }
        try { localStorage.setItem(customProductsKey, JSON.stringify(updated)); } catch { /* skip */ }
        setProducts((prev) => [...prev, newProduct]);
        return newProduct;
    };

    const deleteProduct = async (productId) => {
        if (supabaseEnabled && productId.startsWith("custom_")) {
            try {
                const { error: productError } = await supabase
                    .from("product_recipes")
                    .delete()
                    .eq("product_id", productId);
                if (productError) throw productError;

                const { error: inventoryError } = await supabase
                    .from("inventory")
                    .delete()
                    .eq("product_id", productId);
                if (inventoryError) throw inventoryError;

                const { error: deleteProductError } = await supabase
                    .from("products")
                    .delete()
                    .eq("id", productId.replace("custom_", ""));
                if (deleteProductError) throw deleteProductError;
            } catch (e) {
                console.error("Failed to delete product from Supabase", e);
                toast.error("No se pudo eliminar el producto en línea.");
                throw e;
            }
        }
        const updated = readLocalCustomProducts().filter((p) => p._id !== productId);
        const inventory = readLocalInventory();
        delete inventory[productId];
        const recipes = readLocalValue(productRecipesKey, {});
        delete recipes[productId];
        writeLocalInventory(inventory);
        writeLocalValue(productRecipesKey, recipes);
        setProductRecipes(recipes);
        try { localStorage.setItem(customProductsKey, JSON.stringify(updated)); } catch { /* skip */ }
        setProducts((prev) => prev.filter((p) => p._id !== productId));
    };

    const persistCart = (cart) => {
        try { localStorage.setItem("amorae_cart", JSON.stringify(cart)); } catch (error) { console.error("Failed to save cart", error); }
        return cart;
    };

    // Add Product to Cart
    const addToCart = (itemId) => {
        const product = products.find((item) => item._id === itemId);
        if (!product?.inStock) {
            toast.error("Este producto está agotado");
            return;
        }
        const currentQuantity = finiteNumber(cartItems[itemId]);
        if (product.trackInventory && currentQuantity >= product.stockQuantity) {
            toast.error(`Solo hay ${product.stockQuantity} disponibles`);
            return;
        }
        setCartItems((current) => {
            const cartData = normalizeCart(current);
            const latestQuantity = finiteNumber(cartData[itemId]);
            const limit = product.trackInventory ? product.stockQuantity : 999;
            cartData[itemId] = Math.min(limit, latestQuantity + 1);
            return persistCart(cartData);
        });
        toast.success("Se agregó al Carrito")
    }

    // Update Cart Item Quantity
    const updateCartItem = (itemId, quantity) => {
        const product = products.find((item) => item._id === itemId);
        const numericQuantity = Math.floor(Number(quantity));
        const requestedQuantity = Number.isFinite(numericQuantity)
            ? Math.max(0, numericQuantity)
            : 0;
        if (!product) return;
        const safeQuantity = product.trackInventory
            ? Math.min(requestedQuantity, Math.max(0, Number(product.stockQuantity) || 0))
            : Math.min(999, requestedQuantity);
        setCartItems((current) => {
            const cartData = normalizeCart(current);
            if (safeQuantity <= 0) delete cartData[itemId];
            else cartData[itemId] = safeQuantity;
            return persistCart(cartData);
        });
        toast.success("Carrito Actualizado")
    }

    // Remove product from cart
    const removeFromCart = (itemId) => {
        if (!cartItems[itemId]) return;
        setCartItems((current) => {
            const cartData = normalizeCart(current);
            cartData[itemId] = finiteNumber(cartData[itemId]) - 1;
            if (cartData[itemId] <= 0) delete cartData[itemId];
            return persistCart(cartData);
        });
        toast.success("Artículo Removido");
    }

    // Get Cart Count
    const getCartCount = () => {
        let totalCount = 0;
        Object.keys(cartItems).forEach((itemId) => {
            if (cartItems[itemId] > 0) {
                totalCount += finiteNumber(cartItems[itemId]);
            }
        });
        return totalCount;
    }

    const clearCart = () => {
        setCartItems({});
        localStorage.removeItem("amorae_cart");
    };

    const normalizePhone = (value) => value?.toString().replace(/\D/g, "") || "";

    const readLocalOrders = () => {
        try {
            const raw = localStorage.getItem(localOrdersKey);
            return asArray(raw ? JSON.parse(raw) : []);
        } catch (error) {
            console.error("Failed to read local orders", error);
            toast.error("No se pudieron cargar los pedidos locales.");
            return [];
        }
    };

    const writeLocalOrders = (orders) => {
        try { localStorage.setItem(localOrdersKey, JSON.stringify(orders)); } catch (e) { console.error("Failed to save orders", e); }
    };

    const createLocalOrder = (orderPayload) => {
        const orderItems = asArray(orderPayload?.items);
        if (!orderItems.length) throw new Error("El pedido no contiene productos");
        if (orderItems.length > 50) throw new Error("El pedido contiene demasiados productos");
        const invalidItem = orderItems.find((item) => !item?.productId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 999);
        if (invalidItem) throw new Error("El pedido contiene una cantidad inválida");
        if (new Set(orderItems.map((item) => item.productId)).size !== orderItems.length) {
            throw new Error("El pedido contiene productos duplicados");
        }
        const customer = asObject(orderPayload?.customer);
        const address = asObject(orderPayload?.address);
        const fulfillmentType = address.fulfillmentType || orderPayload?.fulfillmentType || "delivery";
        if (!String(customer.firstName || "").trim() || !String(customer.lastName || "").trim()) {
            throw new Error("El pedido no contiene datos completos del cliente");
        }
        if (!["delivery", "pickup"].includes(fulfillmentType)) throw new Error("La modalidad de entrega no es válida");
        if (fulfillmentType === "pickup" && !["Tossa Residencial", "Río Nilo", "Venta presencial"].includes(address.pickupLocation || orderPayload?.pickupLocation)) {
            throw new Error("El punto de recolección no es válido");
        }
        const unavailableItem = orderItems.find((item) => {
            const product = products.find((candidate) => candidate._id === item.productId);
            return !product || (product.trackInventory && product.stockQuantity < item.quantity);
        });
        if (unavailableItem) {
            throw new Error(`Stock insuficiente para ${unavailableItem.name}`);
        }

        const canonicalItems = orderItems.map((item) => {
            const product = products.find((candidate) => candidate._id === item.productId);
            const quantity = Number(item.quantity);
            if (!product || Number(item.offerPrice) !== Number(product.offerPrice)) {
                throw new Error(`El precio de ${item.name || "un producto"} cambió. Actualiza tu carrito.`);
            }
            return {
                ...item,
                name: product.name,
                category: product.category,
                image: compactOrderImage(product.image?.[0] || item.image),
                offerPrice: product.offerPrice,
                quantity,
            };
        });
        const canonicalAmount = canonicalItems.reduce((total, item) => total + item.offerPrice * item.quantity, 0);

        const materialRequirements = {};
        let orderCogs = 0;
        orderItems.forEach((item) => {
            const product = products.find((candidate) => candidate._id === item.productId);
            const recipe = productRecipes[item.productId] || [];
            if (recipe.length) {
                orderCogs += calculateRecipeCost(recipe) * item.quantity;
                recipe.forEach((ingredient) => {
                    materialRequirements[ingredient.materialId] =
                        (materialRequirements[ingredient.materialId] || 0) +
                        Number(ingredient.quantity) * item.quantity;
                });
            } else {
                orderCogs += Number(product?.manualCost || 0) * item.quantity;
            }
        });
        const unavailableMaterial = Object.entries(materialRequirements).find(([materialId, quantity]) => {
            const material = rawMaterials.find((candidate) => candidate.id === materialId);
            return !material || material.stockQuantity < quantity;
        });
        if (unavailableMaterial) {
            const material = rawMaterials.find((candidate) => candidate.id === unavailableMaterial[0]);
            throw new Error(`Materia prima insuficiente: ${material?.name || "ingrediente"}`);
        }

        const orders = readLocalOrders();
        const id = crypto?.randomUUID?.() || `order_${Date.now()}`;
        const createdAt = new Date().toISOString();
        const order = {
            ...orderPayload,
            amount: canonicalAmount,
            deliveryFee: Math.min(MAX_DELIVERY_FEE, Math.max(0, finiteNumber(orderPayload.deliveryFee))),
            customer: {
                ...customer,
                firstName: String(customer.firstName).trim().slice(0, 80),
                lastName: String(customer.lastName).trim().slice(0, 100),
            },
            address: {
                ...address,
                fulfillmentType,
                notes: String(address.notes || "").trim().slice(0, 500),
            },
            items: canonicalItems,
            id,
            createdAt,
            cogs: orderCogs,
        };
        writeLocalOrders([order, ...orders]);
        const inventory = readLocalInventory();
        const nextProducts = products.map((product) => {
            const item = orderItems.find((candidate) => candidate.productId === product._id);
            if (!item || !product.trackInventory) return product;
            const stockQuantity = Math.max(0, product.stockQuantity - item.quantity);
            inventory[product._id] = {
                stockQuantity,
                lowStockThreshold: product.lowStockThreshold,
                trackInventory: product.trackInventory,
            };
            recordLocalMovement({
                productId: product._id,
                productName: product.name,
                quantityChange: -item.quantity,
                reason: "Venta",
                referenceId: id,
            });
            return { ...product, stockQuantity, inStock: stockQuantity > 0 };
        });
        setProducts(nextProducts);
        writeLocalInventory(inventory);

        if (Object.keys(materialRequirements).length) {
            const nextMaterials = rawMaterials.map((material) => {
                const used = materialRequirements[material.id] || 0;
                if (!used) return material;
                recordLocalMaterialMovement({
                    materialId: material.id,
                    materialName: material.name,
                    quantityChange: -used,
                    reason: "Venta",
                    referenceId: id,
                });
                return { ...material, stockQuantity: material.stockQuantity - used };
            });
            setRawMaterials(nextMaterials);
            writeLocalValue(rawMaterialsKey, nextMaterials);
        }
        return order;
    };

    const createOrder = async (orderPayload) => {
        setOrdersError(null);
        if (!supabaseEnabled) {
            toast("Supabase no configurado. Guardando pedido localmente.", { icon: "⚠️" });
            return createLocalOrder(orderPayload);
        }
        try {
            const { data, error } = await supabase.rpc("create_order_with_inventory", {
                order_payload: orderPayload,
            });
            if (error) throw error;
            await Promise.all([fetchProducts(), fetchBusinessData()]);
            const savedOrder = Array.isArray(data) ? data[0] : data;
            if (!savedOrder) throw new Error("El servidor no devolvió el pedido registrado");
            return mapOrderFromDatabase(savedOrder);
        } catch (error) {
            console.error("Failed to create order", error);
            setOrdersError(error);
            throw error;
        }
    };

    const adjustInventory = async (productId, quantityChange, reason = "Ajuste manual") => {
        const product = products.find((item) => item._id === productId);
        const delta = Number(quantityChange);
        if (!product || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000) return null;

        setInventoryLoading(true);
        try {
            let stockQuantity;
            if (supabaseEnabled) {
                const { data, error } = await supabase.rpc("adjust_inventory", {
                    target_product_id: productId,
                    quantity_delta: delta,
                    movement_reason: String(reason || "Ajuste manual").trim().slice(0, 200),
                });
                if (error) throw error;
                stockQuantity = Number(data);
                await fetchInventoryMovements();
            } else {
                const inventory = readLocalInventory();
                const previousQuantity = Math.max(0, finiteNumber(inventory[productId]?.stockQuantity ?? product.stockQuantity));
                stockQuantity = Math.max(0, previousQuantity + delta);
                const actualChange = stockQuantity - previousQuantity;
                inventory[productId] = {
                    stockQuantity,
                    lowStockThreshold: product.lowStockThreshold,
                    trackInventory: product.trackInventory,
                };
                writeLocalInventory(inventory);
                recordLocalMovement({
                    productId,
                    productName: product.name,
                    quantityChange: actualChange,
                    reason: String(reason || "Ajuste manual").trim().slice(0, 200),
                });
            }
            setProducts((current) => current.map((item) =>
                item._id === productId
                    ? { ...item, stockQuantity, inStock: item.trackInventory ? stockQuantity > 0 : item.inStock }
                    : item
            ));
            return stockQuantity;
        } catch (error) {
            console.error("Failed to adjust inventory", error);
            toast.error("No se pudo actualizar el inventario.");
            return null;
        } finally {
            setInventoryLoading(false);
        }
    };

    const updateInventorySettings = async (productId, settings) => {
        const product = products.find((item) => item._id === productId);
        if (!product) return;
        const next = {
            lowStockThreshold: Math.min(1_000_000, Math.floor(Math.max(0, finiteNumber(settings.lowStockThreshold ?? product.lowStockThreshold, product.lowStockThreshold)))),
            trackInventory: settings.trackInventory ?? product.trackInventory,
        };
        try {
            if (supabaseEnabled) {
                const { error } = await supabase.from("inventory").upsert({
                    product_id: productId,
                    stock_quantity: product.stockQuantity,
                    low_stock_threshold: next.lowStockThreshold,
                    track_inventory: next.trackInventory,
                    updated_at: new Date().toISOString(),
                }, { onConflict: "product_id" });
                if (error) throw error;
            } else {
                const inventory = readLocalInventory();
                inventory[productId] = {
                    stockQuantity: product.stockQuantity,
                    ...next,
                };
                writeLocalInventory(inventory);
            }
            setProducts((current) => current.map((item) =>
                item._id === productId
                    ? {
                        ...item,
                        ...next,
                        inStock: next.trackInventory ? item.stockQuantity > 0 : true,
                    }
                    : item
            ));
            toast.success("Configuración de inventario actualizada");
        } catch (error) {
            console.error("Failed to update inventory settings", error);
            toast.error("No se pudo guardar la configuración.");
        }
    };

    const fetchInventoryMovements = async () => {
        if (!supabaseEnabled) {
            const movements = readLocalMovements();
            setInventoryMovements(movements);
            return movements;
        }
        const { data, error } = await supabase
            .from("inventory_movements")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);
        if (error) {
            console.error("Failed to fetch inventory movements", error);
            return [];
        }
        const movements = (data || []).map((movement) => ({
            id: movement.id,
            productId: movement.product_id,
            quantityChange: movement.quantity_change,
            reason: movement.reason,
            referenceId: movement.reference_id,
            createdAt: movement.created_at,
        }));
        setInventoryMovements(movements);
        return movements;
    };

    const fetchBusinessData = async () => {
        setBusinessLoading(true);
        try {
            if (!supabaseEnabled) {
                const materials = readLocalValue(rawMaterialsKey, []).map(normalizeMaterial);
                const recipes = normalizeRecipeMap(readLocalValue(productRecipesKey, {}));
                const localExpenses = readLocalValue(expensesKey, []).filter((expense) => expense && typeof expense === "object").map((expense) => ({
                    ...expense,
                    amount: Math.max(0, finiteNumber(expense.amount)),
                    description: String(expense.description || ""),
                    incurredAt: expense.incurredAt || expense.incurred_at || null,
                    createdAt: expense.createdAt || expense.created_at || null,
                }));
                const movements = readLocalValue(materialMovementsKey, []).filter((movement) => movement && typeof movement === "object").map((movement) => ({
                    ...movement,
                    quantityChange: finiteNumber(movement.quantityChange),
                    reason: String(movement.reason || "Ajuste"),
                }));
                setRawMaterials(materials);
                setProductRecipes(recipes);
                setExpenses(localExpenses);
                setMaterialMovements(movements);
                return { materials, recipes, expenses: localExpenses };
            }

            const [
                { data: materialsData, error: materialsError },
                { data: recipesData, error: recipesError },
                { data: expensesData, error: expensesError },
                { data: movementsData, error: movementsError },
            ] = await Promise.all([
                supabase.from("raw_materials").select("*").order("name"),
                supabase.from("product_recipes").select("*"),
                supabase.from("expenses").select("*").order("incurred_at", { ascending: false }),
                supabase.from("material_movements").select("*").order("created_at", { ascending: false }).limit(100),
            ]);
            if (materialsError) throw materialsError;
            if (recipesError) throw recipesError;
            if (expensesError) throw expensesError;
            if (movementsError) throw movementsError;

            const materials = (materialsData || []).map(normalizeMaterial);
            const recipes = (recipesData || []).reduce((result, ingredient) => {
                const current = result[ingredient.product_id] || [];
                result[ingredient.product_id] = [...current, {
                    materialId: ingredient.material_id,
                    quantity: Number(ingredient.quantity),
                }];
                return result;
            }, {});
            const mappedExpenses = (expensesData || []).map((expense) => ({
                id: expense.id,
                category: expense.category,
                description: expense.description,
                amount: Number(expense.amount),
                incurredAt: expense.incurred_at,
                createdAt: expense.created_at,
            }));
            const mappedMovements = (movementsData || []).map((movement) => ({
                id: movement.id,
                materialId: movement.material_id,
                quantityChange: Number(movement.quantity_change),
                reason: movement.reason,
                supplier: movement.supplier || "",
                batchCode: movement.batch_code || "",
                referenceId: movement.reference_id,
                createdAt: movement.created_at,
            }));
            setRawMaterials(materials);
            setProductRecipes(recipes);
            setExpenses(mappedExpenses);
            setMaterialMovements(mappedMovements);
            return { materials, recipes, expenses: mappedExpenses };
        } catch (error) {
            console.error("Failed to fetch business data", error);
            toast.error("No se pudieron cargar costos y materias primas.");
            return null;
        } finally {
            setBusinessLoading(false);
        }
    };

    const addRawMaterial = async (materialData) => {
        const purchaseQuantity = Number(materialData.purchaseQuantity);
        const purchaseCost = Number(materialData.purchaseCost);
        const lowStockThreshold = Number(materialData.lowStockThreshold || 0);
        if (!materialData.name?.trim()) throw new Error("El nombre del ingrediente es obligatorio");
        if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0 || purchaseQuantity > MAX_BUSINESS_AMOUNT || !Number.isFinite(purchaseCost) || purchaseCost < 0 || purchaseCost > MAX_BUSINESS_AMOUNT || !Number.isFinite(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > MAX_BUSINESS_AMOUNT) {
            throw new Error("Datos de compra inválidos");
        }

        const material = normalizeMaterial({
            id: `material_${crypto.randomUUID?.() || Date.now()}`,
            name: materialData.name.trim().slice(0, 120),
            unit: materialData.unit,
            stockQuantity: purchaseQuantity,
            lowStockThreshold,
            costPerUnit: purchaseCost / purchaseQuantity,
            supplier: materialData.supplier?.trim().slice(0, 160) || "",
            updatedAt: new Date().toISOString(),
        });

        if (supabaseEnabled) {
            const { data, error } = await supabase.from("raw_materials").insert({
                name: material.name,
                unit: material.unit,
                stock_quantity: material.stockQuantity,
                low_stock_threshold: material.lowStockThreshold,
                cost_per_unit: material.costPerUnit,
                supplier: material.supplier,
            }).select().single();
            if (error) throw error;
            Object.assign(material, normalizeMaterial(data));
            const { error: movementError } = await supabase.from("material_movements").insert({
                material_id: material.id,
                quantity_change: material.stockQuantity,
                reason: "Compra inicial",
                unit_cost: material.costPerUnit,
                supplier: material.supplier,
            });
            if (movementError) {
                await supabase.from("raw_materials").delete().eq("id", material.id);
                throw movementError;
            }
        } else {
            recordLocalMaterialMovement({
                materialId: material.id,
                materialName: material.name,
                quantityChange: material.stockQuantity,
                reason: "Compra inicial",
                unitCost: material.costPerUnit,
                supplier: material.supplier,
            });
        }
        const next = [...rawMaterials, material].sort((a, b) => a.name.localeCompare(b.name));
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
        return material;
    };

    const restockRawMaterial = async (materialId, quantity, totalCost, reason = "Compra", supplier = "", batchCode = "") => {
        const material = rawMaterials.find((item) => item.id === materialId);
        const addedQuantity = Number(quantity);
        const purchaseCost = Number(totalCost);
        const cleanSupplier = String(supplier || "").trim().slice(0, 160);
        const cleanBatchCode = String(batchCode || "").trim().slice(0, 120);
        if (!material || !Number.isFinite(addedQuantity) || addedQuantity <= 0 || addedQuantity > MAX_BUSINESS_AMOUNT || !Number.isFinite(purchaseCost) || purchaseCost < 0 || purchaseCost > MAX_BUSINESS_AMOUNT) {
            throw new Error("Datos de compra inválidos");
        }

        const storedMaterials = readLocalValue(rawMaterialsKey, []).map(normalizeMaterial);
        const latestMaterials = storedMaterials.length ? storedMaterials : rawMaterials;
        const latestMaterial = latestMaterials.find((item) => item.id === materialId) || material;
        const combinedQuantity = latestMaterial.stockQuantity + addedQuantity;
        const nextUnitCost = combinedQuantity > 0
            ? ((latestMaterial.stockQuantity * latestMaterial.costPerUnit) + purchaseCost) / combinedQuantity
            : 0;
        if (supabaseEnabled) {
            const { data, error } = await supabase.rpc("restock_raw_material", {
                target_material_id: materialId,
                quantity_added: addedQuantity,
                purchase_cost: purchaseCost,
                movement_reason: reason,
                supplier_name: cleanSupplier,
                batch_code: cleanBatchCode,
            });
            if (error) throw error;
            await fetchBusinessData();
            return normalizeMaterial(data);
        }
        const next = latestMaterials.map((item) => item.id === materialId
            ? { ...item, stockQuantity: combinedQuantity, costPerUnit: nextUnitCost, updatedAt: new Date().toISOString() }
            : item);
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
        recordLocalMaterialMovement({
            materialId,
            materialName: material.name,
            quantityChange: addedQuantity,
            reason,
            unitCost: purchaseCost / addedQuantity,
            supplier: cleanSupplier,
            batchCode: cleanBatchCode,
        });
        return next.find((item) => item.id === materialId);
    };

    const adjustRawMaterial = async (materialId, quantityChange, reason = "Ajuste manual") => {
        const material = rawMaterials.find((item) => item.id === materialId);
        const delta = Number(quantityChange);
        if (!material || !Number.isFinite(delta) || delta === 0) return null;
        if (supabaseEnabled) {
            const { data, error } = await supabase.rpc("adjust_raw_material", {
                target_material_id: materialId,
                quantity_delta: delta,
                movement_reason: reason,
            });
            if (error) throw error;
            await fetchBusinessData();
            return Number(data);
        }
        if (Math.abs(delta) > MAX_BUSINESS_AMOUNT) throw new Error("El ajuste es demasiado grande");
        const storedMaterials = readLocalValue(rawMaterialsKey, []).map(normalizeMaterial);
        const latestMaterials = storedMaterials.length ? storedMaterials : rawMaterials;
        const latestMaterial = latestMaterials.find((item) => item.id === materialId) || material;
        const result = Math.max(0, latestMaterial.stockQuantity + delta);
        const actualDelta = result - latestMaterial.stockQuantity;
        const next = latestMaterials.map((item) => item.id === materialId
            ? { ...item, stockQuantity: result, updatedAt: new Date().toISOString() }
            : item);
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
        recordLocalMaterialMovement({
            materialId,
            materialName: material.name,
            quantityChange: actualDelta,
            reason: String(reason || "Ajuste manual").trim().slice(0, 200),
        });
        return result;
    };

    const updateRawMaterial = async (materialId, updates) => {
        const material = rawMaterials.find((item) => item.id === materialId);
        if (!material) return null;
        const nextMaterial = {
            ...material,
            name: updates.name?.trim().slice(0, 120) || material.name,
            unit: ["g", "kg", "ml", "l", "unit"].includes(updates.unit) ? updates.unit : material.unit,
            lowStockThreshold: Math.min(MAX_BUSINESS_AMOUNT, Math.max(0, finiteNumber(updates.lowStockThreshold ?? material.lowStockThreshold, material.lowStockThreshold))),
            supplier: updates.supplier?.trim().slice(0, 160) ?? material.supplier,
            updatedAt: new Date().toISOString(),
        };
        if (supabaseEnabled) {
            const { error } = await supabase.from("raw_materials").update({
                name: nextMaterial.name,
                unit: nextMaterial.unit,
                low_stock_threshold: nextMaterial.lowStockThreshold,
                supplier: nextMaterial.supplier,
                updated_at: nextMaterial.updatedAt,
            }).eq("id", materialId);
            if (error) throw error;
        }
        const next = rawMaterials.map((item) => item.id === materialId ? nextMaterial : item);
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
        return nextMaterial;
    };

    const deleteRawMaterial = async (materialId) => {
        const isUsed = Object.values(productRecipes).some((recipe) =>
            recipe.some((ingredient) => ingredient.materialId === materialId)
        );
        if (isUsed) throw new Error("Esta materia prima forma parte de una receta");
        if (supabaseEnabled) {
            const { error } = await supabase.from("raw_materials").delete().eq("id", materialId);
            if (error) throw error;
        }
        const next = rawMaterials.filter((item) => item.id !== materialId);
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
    };

    const saveProductRecipe = async (productId, recipe) => {
        const cleanRecipe = asArray(recipe)
            .map((ingredient) => ({
                materialId: ingredient.materialId,
                quantity: Number(ingredient.quantity),
            }))
            .filter((ingredient) => ingredient.materialId && ingredient.quantity > 0);
        if (!products.some((product) => product._id === productId)) throw new Error("El producto ya no existe");
        if (cleanRecipe.some((ingredient) => !Number.isFinite(ingredient.quantity) || ingredient.quantity > MAX_RECIPE_QUANTITY)) {
            throw new Error("La cantidad de un ingrediente no es válida");
        }
        if (cleanRecipe.some((ingredient) => !rawMaterials.some((material) => material.id === ingredient.materialId))) {
            throw new Error("La receta contiene una materia prima inexistente");
        }
        if (new Set(cleanRecipe.map((ingredient) => ingredient.materialId)).size !== cleanRecipe.length) {
            throw new Error("Cada ingrediente solo puede aparecer una vez en la receta");
        }
        if (supabaseEnabled) {
            const previousRecipe = asArray(productRecipes[productId]);
            const { error: deleteError } = await supabase.from("product_recipes").delete().eq("product_id", productId);
            if (deleteError) throw deleteError;
            if (cleanRecipe.length) {
                const { error } = await supabase.from("product_recipes").insert(
                    cleanRecipe.map((ingredient) => ({
                        product_id: productId,
                        material_id: ingredient.materialId,
                        quantity: ingredient.quantity,
                    }))
                );
                if (error) {
                    if (previousRecipe.length) {
                        await supabase.from("product_recipes").insert(previousRecipe.map((ingredient) => ({
                            product_id: productId,
                            material_id: ingredient.materialId,
                            quantity: ingredient.quantity,
                        })));
                    }
                    throw error;
                }
            }
        }
        const next = { ...productRecipes, [productId]: cleanRecipe };
        setProductRecipes(next);
        writeLocalValue(productRecipesKey, next);
        return calculateRecipeCost(cleanRecipe);
    };

    const addExpense = async (expenseData) => {
        const expense = {
            id: crypto.randomUUID?.() || `expense_${Date.now()}`,
            category: String(expenseData.category || "Otro").slice(0, 80),
            description: expenseData.description?.trim().slice(0, 300) || "",
            amount: Number(expenseData.amount),
            incurredAt: expenseData.incurredAt || new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
        };
        if (!expense.description) throw new Error("La descripción del gasto es obligatoria");
        if (!Number.isFinite(expense.amount) || expense.amount <= 0 || expense.amount > MAX_BUSINESS_AMOUNT) throw new Error("El gasto debe ser mayor a cero y estar dentro del límite permitido");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.incurredAt) || Number.isNaN(new Date(`${expense.incurredAt}T12:00:00`).getTime())) {
            throw new Error("La fecha del gasto no es válida");
        }
        if (supabaseEnabled) {
            const { data, error } = await supabase.from("expenses").insert({
                category: expense.category,
                description: expense.description,
                amount: expense.amount,
                incurred_at: expense.incurredAt,
            }).select().single();
            if (error) throw error;
            expense.id = data.id;
            expense.createdAt = data.created_at;
        }
        const next = [expense, ...expenses];
        setExpenses(next);
        writeLocalValue(expensesKey, next);
        return expense;
    };

    const deleteExpense = async (expenseId) => {
        if (supabaseEnabled) {
            const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
            if (error) throw error;
        }
        const next = expenses.filter((expense) => expense.id !== expenseId);
        setExpenses(next);
        writeLocalValue(expensesKey, next);
    };

    const fetchOrdersByPhone = async (phone) => {
        setOrdersLoading(true);
        setOrdersError(null);
        const normalizedPhone = normalizePhone(phone);
        if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
            setOrdersLoading(false);
            return [];
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders().map(mapOrderFromDatabase).filter((order) => order.phoneNormalized === normalizedPhone);
            setOrdersLoading(false);
            return orders;
        }
        try {
            const { data, error } = await supabase.rpc("get_orders_by_phone", {
                requested_phone: normalizedPhone,
            });
            if (error) throw error;
            setOrdersLoading(false);
            return (data || []).map(mapOrderFromDatabase);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("No se pudieron cargar tus pedidos.");
            setOrdersError(error);
            setOrdersLoading(false);
            return [];
        }
    };

    const fetchAllOrders = async () => {
        setOrdersLoading(true);
        setOrdersError(null);
        if (!supabaseEnabled) {
            const orders = readLocalOrders().map(mapOrderFromDatabase);
            setOrdersLoading(false);
            return orders;
        }
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setOrdersLoading(false);
            return (data || []).map(mapOrderFromDatabase);
        } catch (error) {
            console.error("Failed to fetch all orders", error);
            toast.error("No se pudieron cargar los pedidos.");
            setOrdersError(error);
            setOrdersLoading(false);
            return null;
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        setOrdersError(null);
        if (!ORDER_STATUSES.has(status)) {
            toast.error("El estado seleccionado no es válido.");
            return false;
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
            if (!orders.some((order) => order.id === orderId)) return false;
            const updated = orders.map((order) =>
                order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
            );
            writeLocalOrders(updated);
            return true;
        }
        try {
            const { data, error } = await supabase
                .from("orders")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", orderId)
                .select("id");
            if (error) throw error;
            if (!data?.length) throw new Error("El pedido ya no existe");
            return true;
        } catch (error) {
            console.error("Failed to update order status", error);
            toast.error("No se pudo actualizar el estado.");
            setOrdersError(error);
            return false;
        }
    };

    const updateOrderSellerNote = async (orderId, note) => {
        const trimmed = (note || "").trim();
        if (trimmed.length > MAX_SELLER_NOTE_LENGTH) {
            toast.error(`La nota interna no puede superar ${MAX_SELLER_NOTE_LENGTH} caracteres.`);
            return false;
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
            if (!orders.some((order) => order.id === orderId)) return false;
            const updated = orders.map((order) => {
                if (order.id !== orderId) return order;
                const nextAddress = { ...(order.address || {}), sellerNote: trimmed };
                return { ...order, address: nextAddress, sellerNote: trimmed, updatedAt: new Date().toISOString() };
            });
            writeLocalOrders(updated);
            return true;
        }
        try {
            // sellerNote is a seller-only field that lives inside the `address`
            // JSONB. The customer-facing notes column is left untouched.
            const { data, error: readError } = await supabase
                .from("orders")
                .select("id, address")
                .eq("id", orderId)
                .single();
            if (readError) throw readError;
            const previousAddress = asObject(data?.address);
            const nextAddress = { ...previousAddress, sellerNote: trimmed };
            const { error: updateError } = await supabase
                .from("orders")
                .update({ address: nextAddress, updated_at: new Date().toISOString() })
                .eq("id", orderId);
            if (updateError) throw updateError;
            return true;
        } catch (error) {
            console.error("Failed to update seller note", error);
            toast.error("No se pudo guardar la nota interna.");
            return false;
        }
    };

    const updateOrderDeliveryFee = async (orderId, fee, reason = "Ajuste manual del envío") => {
        const numericFee = Number(fee);
        const trimmedReason = String(reason || "Ajuste manual del envío").trim().slice(0, MAX_DELIVERY_REASON_LENGTH);
        if (!Number.isFinite(numericFee) || numericFee < 0 || numericFee > MAX_DELIVERY_FEE) {
            toast.error("Ingresa un monto válido");
            return false;
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
            if (!orders.some((order) => order.id === orderId)) return false;
            const updated = orders.map((order) => {
                if (order.id !== orderId) return order;
                // order.amount stores the product subtotal only; the delivery fee is stored
                // separately. Keep the products subtotal untouched and just swap the fee.
                return {
                    ...order,
                    deliveryFee: numericFee,
                    deliveryStatus: "manual",
                    deliveryNotes: trimmedReason,
                    updatedAt: new Date().toISOString(),
                };
            });
            writeLocalOrders(updated);
            return true;
        }
        try {
            const { data, error } = await supabase
                .from("orders")
                .select("id, amount, address")
                .eq("id", orderId)
                .single();
            if (error) throw error;
            const previousAddress = asObject(data?.address);
            const nextAddress = { ...previousAddress, deliveryFee: numericFee, deliveryStatus: "manual", deliveryNotes: trimmedReason };
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    // Top-level column is the source of truth after the delivery migration.
                    delivery_fee: numericFee,
                    delivery_status: "manual",
                    delivery_notes: trimmedReason,
                    // Keep the address JSONB in sync so any legacy reader still works.
                    address: nextAddress,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);
            if (updateError) throw updateError;
            return true;
        } catch (error) {
            console.error("Failed to update delivery fee", error);
            toast.error("No se pudo actualizar el envío.");
            return false;
        }
    };

    useEffect(() => {
        fetchProducts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!productsLoaded) return;
        setCartItems((current) => {
            const next = {};
            products.forEach((product) => {
                const requested = finiteNumber(current[product._id]);
                const available = product.trackInventory ? Math.max(0, finiteNumber(product.stockQuantity)) : 999;
                const quantity = Math.min(requested, available);
                if (product.inStock && quantity > 0) next[product._id] = quantity;
            });
            if (JSON.stringify(next) === JSON.stringify(current)) return current;
            return persistCart(next);
        });
    }, [products, productsLoaded]);

    const value = {
        navigate, products, productsLoaded, currency, addToCart,
        updateCartItem, removeFromCart, cartItems, getCartCount,
        searchQuery, setSearchQuery, clearCart,
        createOrder, fetchOrdersByPhone, fetchAllOrders, updateOrderStatus,
        updateOrderDeliveryFee,
        updateOrderSellerNote,
        ordersLoading, ordersError, normalizePhone,
        addProduct, deleteProduct,
        adjustInventory, updateInventorySettings, fetchInventoryMovements,
        inventoryMovements, inventoryLoading,
        rawMaterials, materialMovements, productRecipes, expenses, businessLoading,
        fetchBusinessData, addRawMaterial, restockRawMaterial, adjustRawMaterial,
        updateRawMaterial, deleteRawMaterial, saveProductRecipe, calculateRecipeCost,
        addExpense, deleteExpense,
    }
    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
}
