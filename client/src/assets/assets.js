import amorae_logo from "./amorae_logo.png"
import search_icon from "./search_icon.svg";
import brown_cart from "./brown_cart.png"
import nav_cart_icon from "./nav_cart_icon.svg";
import product_list_icon from "./product_list_icon.svg";
import order_icon from "./order_icon.svg";
import upload_area from "./upload_area.png";
import delivery_truck_icon from "./delivery_truck_icon.svg";
import leaf_icon from "./leaf_icon.svg";
import coin_icon from "./coin_icon.svg";
import trust_icon from "./trust_icon.svg";
import main_banner_bg from "./main_banner_bg.jpg";
import bottom_banner_image from "./bottom_banner_image.jpg";
import brownie_image from "./brownie_image.png";
import rol_image from "./rol_image.png";
import tiramisu_image from "./tiramisu_image.png";
import bakery_image from "./bakery_image.png";
import butter_croissant_image from "./butter_croissant_image.png";
import chocolate_cake_image from "./chocolate_cake_image.png";
import vanilla_muffins_image from "./vanilla_muffins_image.png";
import yellow_star from "./yellow_star.png";
import yellow_star_dull from "./yellow_star_dull.png";


export const assets = {
  amorae_logo,
  brown_cart,
  search_icon,
  nav_cart_icon,
  product_list_icon,
  order_icon,
  upload_area,
  delivery_truck_icon,
  leaf_icon,
  coin_icon,
  trust_icon,
  main_banner_bg,
  bottom_banner_image,
  brownie_image,
  rol_image,
  tiramisu_image,
  yellow_star,
  yellow_star_dull,
};

export const categories = [
  {
    text: "Brownies",
    path: "Brownies",
    image: brownie_image,
    bgColor: "#FEF6DA",
  },
  {
    text: "Roles de Canela",
    path: "Roles",
    image: rol_image,
    bgColor: "#BDB76B",
  },
  {
    text: "Sorpresa...",
    path: "Sorpresa",
    image: bakery_image,
    bgColor: "#FFEFD5",
  },
  {
    text: "Tiramisú",
    path: "Tiramisu",
    image: tiramisu_image,
    bgColor: "#CD853F",
  },
];

export const footerLinks = [
  {
    title: "Explora",
    links: [
      { text: "Inicio", url: "/" },
      { text: "Colección", url: "/products" },
      { text: "Nuestra esencia", url: "/#experiencia" },
      { text: "Mis pedidos", url: "/my-orders" },
    ],
  },
  {
    title: "Pedidos",
    links: [
      { text: "Entregas en Guadalajara", url: "/checkout" },
      { text: "Consultar pedido", url: "/my-orders" },
      { text: "Finalizar compra", url: "/cart" },
    ],
  },
  {
    title: "Síguenos",
    links: [
      { text: "Instagram", url: "https://www.instagram.com/amorae.reposteria" },
    ],
  },
];

export const features = [
  {
    icon: delivery_truck_icon,
    title: "Programa tu Entrega",
    description: "Elige el día que más te convenga",
  },
  {
    icon: leaf_icon,
    title: "Ingredientes de Alta Calidad",
    description: "Utilizamos los mejores ingredientes",
  },
  {
    icon: coin_icon,
    title: "Postres Personalizados",
    description: "Personaliza tus postres",
  },
  {
    icon: trust_icon,
    title: "Amados por Nuestros Clientes",
    description: "Atención cercana en cada pedido",
  },
];

export const dummyProducts = [
  {
    _id: "gd46g23h",
    name: "Brownie de Lotus",
    category: "Brownies",
    price: 70,
    offerPrice: 50,
    image: [brownie_image],
    description: [
      "Chocolate 70% Cacao",
      "Sabor intenso a chocolate real",
      "Decorado con crema Lotus y galleta Lotus crujiente",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 18,
    lowStockThreshold: 5,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd47g34h",
    name: "Rol de Lotus",
    category: "Roles",
    price: 80,
    offerPrice: 75,
    image: [rol_image],
    description: [
      "Rol de canela horneado diariamente",
      "Glaseado suave y cremoso",
      "Cubierto con galleta y salsa Lotus",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 12,
    lowStockThreshold: 4,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd48g45h",
    name: "Tiramisú Tradicional",
    category: "Tiramisu",
    price: 110,
    offerPrice: 90,
    image: [tiramisu_image],
    description: [
      "Café espresso seleccionado",
      "Queso Mascarpone premium",
      "Espolvoreado con cacao belga fino",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 8,
    lowStockThreshold: 3,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd49g56h",
    name: "Brownie Box (6pz)",
    category: "Brownies",
    price: 300,
    offerPrice: 280,
    image: [bakery_image],
    description: [
      "Variedad de nuestros mejores brownies",
      "Perfecto para regalar o compartir",
      "Hecho con cacao de alta calidad",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 6,
    lowStockThreshold: 2,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd50g67h",
    name: "Caja de 4 Roles",
    category: "Roles",
    price: 290,
    offerPrice: 265,
    image: [rol_image],
    description: [
      "Cuatro roles medianos de canela",
      "Suaves, esponjosos y deliciosos",
      "Opción ideal para desayuno o postre",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 9,
    lowStockThreshold: 3,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd51g68h",
    name: "Croissant de Mantequilla",
    category: "Sorpresa",
    price: 55,
    offerPrice: 45,
    image: [butter_croissant_image],
    description: [
      "Hojaldrado y crujiente",
      "Elaborado con 100% mantequilla pura",
      "Ideal para acompañar tu café",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 14,
    lowStockThreshold: 4,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd52g69h",
    name: "Pastel de Chocolate Premium",
    category: "Sorpresa",
    price: 350,
    offerPrice: 325,
    image: [chocolate_cake_image],
    description: [
      "Tres capas de bizcocho húmedo de chocolate",
      "Relleno con fudge artesanal",
      "Decorado de forma elegante",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 4,
    lowStockThreshold: 2,
    trackInventory: true,
    inStock: true,
  },
  {
    _id: "gd53g70h",
    name: "Vanilla Muffins (6pz)",
    category: "Sorpresa",
    price: 110,
    offerPrice: 95,
    image: [vanilla_muffins_image],
    description: [
      "Panquecitos de vainilla suaves y esponjosos",
      "Hechos con extracto natural de vaina de vainilla",
      "Deliciosos solos o para decorar",
    ],
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
    stockQuantity: 10,
    lowStockThreshold: 3,
    trackInventory: true,
    inStock: true,
  },
];

export const dummyAddress = [
  {
    _id: "67b5b9e54ea97f71bbc196a0",
    userId: "67b5880e4d09769c5ca61644",
    firstName: "Great",
    lastName: "Stack",
    email: "user.greatstack@gmail.com",
    street: "Street 123",
    city: "Main City",
    state: "New State",
    zipcode: 123456,
    country: "IN",
    phone: "1234567890",
  },
];

export const dummyOrders = [
  {
    _id: "67e2589a8f87e63366786400",
    userId: "67b5880e4d09769c5ca61644",
    items: [
      {
        product: dummyProducts[3],
        quantity: 2,
        _id: "67e2589a8f87e63366786401",
      },
    ],
    amount: 89,
    address: dummyAddress[0],
    status: "Order Placed",
    paymentType: "Online",
    isPaid: true,
    createdAt: "2025-03-25T07:17:46.018Z",
    updatedAt: "2025-03-25T07:18:13.103Z",
  },
  {
    _id: "67e258798f87e633667863f2",
    userId: "67b5880e4d09769c5ca61644",
    items: [
      {
        product: dummyProducts[0],
        quantity: 1,
        _id: "67e258798f87e633667863f3",
      },
      {
        product: dummyProducts[1],
        quantity: 1,
        _id: "67e258798f87e633667863f4",
      },
    ],
    amount: 43,
    address: dummyAddress[0],
    status: "Order Placed",
    paymentType: "COD",
    isPaid: false,
    createdAt: "2025-03-25T07:17:13.068Z",
    updatedAt: "2025-03-25T07:17:13.068Z",
  },
];
