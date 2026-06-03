import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dummyProducts } from "../assets/assets";
import toast from "react-hot-toast";
import { auth } from "../config/firebase";
import { onAuthStateChanged } from "firebase/auth";

/* eslint-disable react-refresh/only-export-components */
export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {

    const currency = import.meta.env.VITE_CURRENCY || "$";

    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [isSeller, setIsSeller] = useState(false)
    const [showUserLogin, setShowUserLogin] = useState(false)
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

    useEffect(() => {
        fetchProducts()

        // Sync Firebase auth state
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // If user uses @amorae.com email, give seller privileges
                setIsSeller(firebaseUser.email?.endsWith("@amorae.com") || false);
            } else {
                setIsSeller(false);
            }
        });

        return () => unsubscribe();
    }, [])

    const value = {
        navigate, user, setUser, setIsSeller, isSeller,
        showUserLogin, setShowUserLogin, products, currency, addToCart,
        updateCartItem, removeFromCart, cartItems, getCartCount,
        searchQuery, setSearchQuery
    }
    return <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
}

export const useAppContext = () => {
    return useContext(AppContext)
}
