import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import { collection, addDoc, doc, getDocs, query, updateDoc, where, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

/* eslint-disable react-refresh/only-export-components */
export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

    const currency = import.meta.env.VITE_CURRENCY || "$";

    const navigate = useNavigate()
    const [products, setProducts] = useState([])
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
    const firestoreEnabled =
        Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID) &&
        !import.meta.env.VITE_FIREBASE_PROJECT_ID?.startsWith("mock-");
    const localOrdersKey = "amorae_orders";

    // Fetch All Products
    const fetchProducts = async () => {
        setProducts(dummyProducts)
    }

    // Add Product to Cart
    const addToCart = (itemId) => {
        let cartData = structuredClone(cartItems);
        if (cartData[itemId]) {
            cartData[itemId] += 1;
        } else {
            cartData[itemId] = 1;
        }
        setCartItems(cartData);
        localStorage.setItem("amorae_cart", JSON.stringify(cartData));
        toast.success("Se agregó al Carrito")
    }

    // Update Cart Item Quantity
    const updateCartItem = (itemId, quantity) => {
        let cartData = structuredClone(cartItems);
        if (quantity === 0) {
            delete cartData[itemId];
        } else {
            cartData[itemId] = quantity;
        }
        setCartItems(cartData);
        localStorage.setItem("amorae_cart", JSON.stringify(cartData));
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
            localStorage.setItem("amorae_cart", JSON.stringify(cartData));
            toast.success("Artículo Removido");
        }
    }

    // Get Cart Count
    const getCartCount = () => {
        let totalCount = 0;
        for (const items in cartItems) {
            try {
                if (cartItems[items] > 0) {
                    totalCount += cartItems[items];
                }
            } catch (error) {
                console.log(error)
            }
        }
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
        localStorage.setItem(localOrdersKey, JSON.stringify(orders));
    };

    const createLocalOrder = (orderPayload) => {
        const orders = readLocalOrders();
        const id = crypto?.randomUUID?.() || `order_${Date.now()}`;
        const createdAt = new Date().toISOString();
        const order = { ...orderPayload, id, createdAt };
        writeLocalOrders([order, ...orders]);
        return order;
    };

    const createOrder = async (orderPayload) => {
        setOrdersError(null);
        if (!firestoreEnabled) {
            toast("Firebase no configurado. Guardando pedido localmente.", { icon: "⚠️" });
            return createLocalOrder(orderPayload);
        }
        try {
            const docRef = await addDoc(collection(db, "orders"), {
                ...orderPayload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return { ...orderPayload, id: docRef.id, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error("Failed to create order", error);
            toast.error("No se pudo guardar el pedido en línea.");
            setOrdersError(error);
            return createLocalOrder(orderPayload);
        }
    };

    const fetchOrdersByPhone = async (phone) => {
        setOrdersLoading(true);
        setOrdersError(null);
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
            setOrdersLoading(false);
            return [];
        }
        if (!firestoreEnabled) {
            const orders = readLocalOrders().filter((order) => order.phoneNormalized === normalizedPhone);
            setOrdersLoading(false);
            return orders;
        }
        try {
            const ordersQuery = query(
                collection(db, "orders"),
                where("phoneNormalized", "==", normalizedPhone)
            );
            const snapshot = await getDocs(ordersQuery);
            const orders = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setOrdersLoading(false);
            return orders;
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error("No se pudieron cargar tus pedidos.");
            setOrdersError(error);
            setOrdersLoading(false);
            return readLocalOrders().filter((order) => order.phoneNormalized === normalizedPhone);
        }
    };

    const fetchAllOrders = async () => {
        setOrdersLoading(true);
        setOrdersError(null);
        if (!firestoreEnabled) {
            const orders = readLocalOrders();
            setOrdersLoading(false);
            return orders;
        }
        try {
            const snapshot = await getDocs(collection(db, "orders"));
            const orders = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            setOrdersLoading(false);
            return orders;
        } catch (error) {
            console.error("Failed to fetch all orders", error);
            toast.error("No se pudieron cargar los pedidos.");
            setOrdersError(error);
            setOrdersLoading(false);
            return readLocalOrders();
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        setOrdersError(null);
        if (!firestoreEnabled) {
            const orders = readLocalOrders();
            const updated = orders.map((order) =>
                order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
            );
            writeLocalOrders(updated);
            return;
        }
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to update order status", error);
            toast.error("No se pudo actualizar el estado.");
            setOrdersError(error);
        }
    };

    useEffect(() => {
        fetchProducts()
    }, [])

    const value = {
        navigate, products, currency, addToCart,
        updateCartItem, removeFromCart, cartItems, getCartCount,
        searchQuery, setSearchQuery, clearCart,
        createOrder, fetchOrdersByPhone, fetchAllOrders, updateOrderStatus,
        ordersLoading, ordersError, normalizePhone
    }
    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
}

export const useAppContext = () => {
    return useContext(AppContext)
}
