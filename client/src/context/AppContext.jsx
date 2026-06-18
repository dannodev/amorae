import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import supabase from "../config/supabase";
import { AppContext } from "./AppContextCore";

export const AppContextProvider = ({ children }) => {

    const currency = import.meta.env.VITE_CURRENCY || "$";

    const navigate = useNavigate()
    const [products, setProducts] = useState([])
    const [productsLoaded, setProductsLoaded] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [cartItems, setCartItems] = useState(() => {
        try {
            const localData = localStorage.getItem("amorae_cart");
            return localData ? JSON.parse(localData) : {};
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
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    };

    const writeLocalValue = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* skip */ }
    };

    const normalizeProduct = (product, inventory = {}) => {
        const stockQuantity = Number(inventory.stockQuantity ?? product.stockQuantity ?? 0);
        const lowStockThreshold = Number(inventory.lowStockThreshold ?? product.lowStockThreshold ?? 3);
        const trackInventory = inventory.trackInventory ?? product.trackInventory ?? true;
        return {
            ...product,
            stockQuantity,
            lowStockThreshold,
            trackInventory,
            manualCost: Number(product.manualCost || 0),
            inStock: trackInventory ? stockQuantity > 0 : (inventory.inStock ?? product.inStock ?? true),
        };
    };

    const readLocalInventory = () => {
        try {
            const raw = localStorage.getItem(inventoryKey);
            return raw ? JSON.parse(raw) : {};
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
            return raw ? JSON.parse(raw) : [];
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
        id: material.id,
        name: material.name,
        unit: material.unit || "g",
        stockQuantity: Number(material.stock_quantity ?? material.stockQuantity ?? 0),
        lowStockThreshold: Number(material.low_stock_threshold ?? material.lowStockThreshold ?? 0),
        costPerUnit: Number(material.cost_per_unit ?? material.costPerUnit ?? 0),
        supplier: material.supplier || "",
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

    const mapOrderFromDatabase = (order) => ({
        ...order,
        amount: Number(order.amount || 0),
        cogs: Number(order.cogs || 0),
        // deliveryFee and deliveryDistanceKm can live at the top level (new schema)
        // or fall back to the address JSONB (legacy rows that predate the migration).
        deliveryFee: Number(
            order.delivery_fee
            ?? order.address?.deliveryFee
            ?? 0
        ),
        deliveryDistanceKm: Number.isFinite(Number(order.delivery_distance_km))
            ? Number(order.delivery_distance_km)
            : Number(order.address?.distanceKm) || null,
        deliveryStatus: order.delivery_status || order.address?.deliveryStatus || null,
        deliveryNotes: order.delivery_notes || order.address?.deliveryNotes || null,
        // Seller-only note (never shown to the customer).
        sellerNote: order.address?.sellerNote || order.sellerNote || "",
        phoneNormalized: order.phone_normalized,
        phone: order.customer?.phone,
        paymentMethod: order.payment_method,
        isPaid: order.is_paid,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
    });

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
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const addProduct = async (productData) => {
        const newProduct = {
            _id: `custom_${crypto.randomUUID?.() || Date.now()}`,
            name: productData.name,
            category: productData.category,
            price: Number(productData.price),
            offerPrice: Number(productData.offerPrice),
            image: productData.image || [""],
            description: [productData.description1, productData.description2, productData.description3].filter(Boolean),
            manualCost: Number(productData.manualCost || 0),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stockQuantity: Number(productData.stockQuantity || 0),
            lowStockThreshold: Number(productData.lowStockThreshold || 3),
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

    // Add Product to Cart
    const addToCart = (itemId) => {
        const product = products.find((item) => item._id === itemId);
        if (!product?.inStock) {
            toast.error("Este producto está agotado");
            return;
        }
        const currentQuantity = cartItems[itemId] || 0;
        if (product.trackInventory && currentQuantity >= product.stockQuantity) {
            toast.error(`Solo hay ${product.stockQuantity} disponibles`);
            return;
        }
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] += 1;
        } else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        try { localStorage.setItem("amorae_cart", JSON.stringify(cartData)); } catch (e) { console.error("Failed to save cart", e); }
        toast.success("Se agregó al Carrito")
    }

    // Update Cart Item Quantity
    const updateCartItem = (itemId, quantity) => {
        const product = products.find((item) => item._id === itemId);
        const numericQuantity = Math.floor(Number(quantity));
        const requestedQuantity = Number.isFinite(numericQuantity)
            ? Math.max(0, numericQuantity)
            : 0;
        const safeQuantity = product?.trackInventory
            ? Math.min(requestedQuantity, Math.max(0, Number(product.stockQuantity) || 0))
            : requestedQuantity;
        let cartData = structuredClone(cartItems);
        if (safeQuantity <= 0) {
            delete cartData[itemId];
        } else {
            cartData[itemId] = safeQuantity;
        }
        setCartItems(cartData);
        try { localStorage.setItem("amorae_cart", JSON.stringify(cartData)); } catch (e) { console.error("Failed to save cart", e); }
        toast.success("Carrito Actualizado")
    }

    // Remove product from cart
    const removeFromCart = (itemId) => {
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] -= 1;
            if (cartData[itemId] === 0) {
                delete cartData[itemId];
            }
            setCartItems(cartData);
            try { localStorage.setItem("amorae_cart", JSON.stringify(cartData)); } catch (e) { console.error("Failed to save cart", e); }
            toast.success("Artículo Removido");
        }
    }

    // Get Cart Count
    const getCartCount = () => {
        let totalCount = 0;
        Object.keys(cartItems).forEach((itemId) => {
            if (cartItems[itemId] > 0) {
                totalCount += cartItems[itemId];
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
            return raw ? JSON.parse(raw) : [];
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
        const unavailableItem = orderPayload.items.find((item) => {
            const product = products.find((candidate) => candidate._id === item.productId);
            return !product || (product.trackInventory && product.stockQuantity < item.quantity);
        });
        if (unavailableItem) {
            throw new Error(`Stock insuficiente para ${unavailableItem.name}`);
        }

        const materialRequirements = {};
        let orderCogs = 0;
        orderPayload.items.forEach((item) => {
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
        const order = { ...orderPayload, id, createdAt, cogs: orderCogs };
        writeLocalOrders([order, ...orders]);
        const inventory = readLocalInventory();
        const nextProducts = products.map((product) => {
            const item = orderPayload.items.find((candidate) => candidate.productId === product._id);
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
            return mapOrderFromDatabase(Array.isArray(data) ? data[0] : data);
        } catch (error) {
            console.error("Failed to create order", error);
            setOrdersError(error);
            throw error;
        }
    };

    const adjustInventory = async (productId, quantityChange, reason = "Ajuste manual") => {
        const product = products.find((item) => item._id === productId);
        if (!product || !Number.isFinite(Number(quantityChange)) || Number(quantityChange) === 0) return null;

        setInventoryLoading(true);
        try {
            let stockQuantity;
            if (supabaseEnabled) {
                const { data, error } = await supabase.rpc("adjust_inventory", {
                    target_product_id: productId,
                    quantity_delta: Number(quantityChange),
                    movement_reason: reason,
                });
                if (error) throw error;
                stockQuantity = Number(data);
                await fetchInventoryMovements();
            } else {
                stockQuantity = Math.max(0, product.stockQuantity + Number(quantityChange));
                const inventory = readLocalInventory();
                inventory[productId] = {
                    stockQuantity,
                    lowStockThreshold: product.lowStockThreshold,
                    trackInventory: product.trackInventory,
                };
                writeLocalInventory(inventory);
                recordLocalMovement({
                    productId,
                    productName: product.name,
                    quantityChange: Number(quantityChange),
                    reason,
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
            lowStockThreshold: Math.max(0, Number(settings.lowStockThreshold ?? product.lowStockThreshold)),
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
                const recipes = readLocalValue(productRecipesKey, {});
                const localExpenses = readLocalValue(expensesKey, []);
                const movements = readLocalValue(materialMovementsKey, []);
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
        if (purchaseQuantity <= 0 || purchaseCost < 0) throw new Error("Datos de compra inválidos");

        const material = normalizeMaterial({
            id: `material_${crypto.randomUUID?.() || Date.now()}`,
            name: materialData.name.trim(),
            unit: materialData.unit,
            stockQuantity: purchaseQuantity,
            lowStockThreshold: Number(materialData.lowStockThreshold || 0),
            costPerUnit: purchaseCost / purchaseQuantity,
            supplier: materialData.supplier?.trim() || "",
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
            if (movementError) throw movementError;
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
        const cleanSupplier = supplier.trim();
        const cleanBatchCode = batchCode.trim();
        if (!material || addedQuantity <= 0 || purchaseCost < 0) return null;

        const combinedQuantity = material.stockQuantity + addedQuantity;
        const nextUnitCost = combinedQuantity > 0
            ? ((material.stockQuantity * material.costPerUnit) + purchaseCost) / combinedQuantity
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
        const next = rawMaterials.map((item) => item.id === materialId
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
        const result = Math.max(0, material.stockQuantity + delta);
        const actualDelta = result - material.stockQuantity;
        const next = rawMaterials.map((item) => item.id === materialId
            ? { ...item, stockQuantity: result, updatedAt: new Date().toISOString() }
            : item);
        setRawMaterials(next);
        writeLocalValue(rawMaterialsKey, next);
        recordLocalMaterialMovement({
            materialId,
            materialName: material.name,
            quantityChange: actualDelta,
            reason,
        });
        return result;
    };

    const updateRawMaterial = async (materialId, updates) => {
        const material = rawMaterials.find((item) => item.id === materialId);
        if (!material) return null;
        const nextMaterial = {
            ...material,
            name: updates.name?.trim() || material.name,
            unit: updates.unit || material.unit,
            lowStockThreshold: Math.max(0, Number(updates.lowStockThreshold ?? material.lowStockThreshold)),
            supplier: updates.supplier?.trim() ?? material.supplier,
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
        const cleanRecipe = recipe
            .map((ingredient) => ({
                materialId: ingredient.materialId,
                quantity: Number(ingredient.quantity),
            }))
            .filter((ingredient) => ingredient.materialId && ingredient.quantity > 0);
        if (supabaseEnabled) {
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
                if (error) throw error;
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
            category: expenseData.category,
            description: expenseData.description.trim(),
            amount: Number(expenseData.amount),
            incurredAt: expenseData.incurredAt || new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
        };
        if (expense.amount <= 0) throw new Error("El gasto debe ser mayor a cero");
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
        if (!normalizedPhone) {
            setOrdersLoading(false);
            return [];
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders().filter((order) => order.phoneNormalized === normalizedPhone);
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
            const orders = readLocalOrders();
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
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
            const updated = orders.map((order) =>
                order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
            );
            writeLocalOrders(updated);
            return true;
        }
        try {
            const { error } = await supabase
                .from("orders")
                .update({ status, updated_at: new Date().toISOString() })
                .eq("id", orderId);
            if (error) throw error;
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
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
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
            const previousAddress = data?.address || {};
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
        if (!Number.isFinite(numericFee) || numericFee < 0) {
            toast.error("Ingresa un monto válido");
            return false;
        }
        if (!supabaseEnabled) {
            const orders = readLocalOrders();
            const updated = orders.map((order) => {
                if (order.id !== orderId) return order;
                // order.amount stores the product subtotal only; the delivery fee is stored
                // separately. Keep the products subtotal untouched and just swap the fee.
                return {
                    ...order,
                    deliveryFee: numericFee,
                    deliveryStatus: "manual",
                    deliveryNotes: reason,
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
            const previousAddress = data?.address || {};
            const nextAddress = { ...previousAddress, deliveryFee: numericFee, deliveryStatus: "manual", deliveryNotes: reason };
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    // Top-level column is the source of truth after the delivery migration.
                    delivery_fee: numericFee,
                    delivery_status: "manual",
                    delivery_notes: reason,
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
