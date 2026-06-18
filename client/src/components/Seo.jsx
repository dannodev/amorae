import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const siteUrl = (import.meta.env.VITE_SITE_URL || "https://amorae.mx").replace(/\/$/, "");
const socialImage = `${siteUrl}/amorae-social.jpg`;

const routeMeta = {
  "/": {
    title: "Amorae Repostería | Postres artesanales en Guadalajara",
    description: "Brownies, roles de canela y tiramisú artesanal en Guadalajara. Postres frescos preparados con ingredientes de alta calidad.",
  },
  "/products": {
    title: "Postres artesanales | Amorae Repostería",
    description: "Descubre brownies, roles, tiramisú y postres especiales hechos artesanalmente en Guadalajara.",
  },
  "/cart": {
    title: "Tu carrito | Amorae Repostería",
    description: "Revisa tu selección de postres artesanales Amorae.",
    noIndex: true,
  },
  "/checkout": {
    title: "Finalizar pedido | Amorae Repostería",
    description: "Completa los datos para recibir tu pedido Amorae en Guadalajara.",
    noIndex: true,
  },
  "/my-orders": {
    title: "Consulta tu pedido | Amorae Repostería",
    description: "Consulta el estado de tu pedido Amorae.",
    noIndex: true,
  },
  "/delivery-policy": {
    title: "Política de entrega | Amorae Repostería",
    description: "Consulta zona de entrega, horarios preferidos y condiciones para pedidos Amorae en Guadalajara.",
  },
  "/custom-order": {
    title: "Pedido especial | Amorae Repostería",
    description: "Solicita una mesa dulce, caja regalo o postre personalizado con Amorae Repostería.",
  },
  "/review": {
    title: "Reseña de pedido | Amorae Repostería",
    description: "Comparte tu experiencia después de recibir un pedido Amorae.",
    noIndex: true,
  },
  "/order-confirmation": {
    title: "Confirmar pedido | Amorae Repostería",
    description: "Revisa tu pedido Amorae antes de confirmarlo por WhatsApp.",
    noIndex: true,
  },
  "/seller": {
    title: "Administración | Amorae",
    description: "Panel privado de administración Amorae.",
    noIndex: true,
  },
};

const notFoundMeta = {
  title: "Página no encontrada | Amorae Repostería",
  description: "La página que buscas no existe o cambió de dirección.",
  noIndex: true,
};

const setMeta = (selector, attribute, value) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const [key, name] = attribute;
    element.setAttribute(key, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
};

const Seo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isProduct = pathname.startsWith("/product/");
    const meta = isProduct
      ? {
          title: "Postre artesanal | Amorae Repostería",
          description: "Conoce los detalles de este postre artesanal Amorae.",
        }
      : routeMeta[pathname] || notFoundMeta;
    const canonicalUrl = `${siteUrl}${pathname}`;

    document.title = meta.title;
    document.documentElement.lang = "es-MX";
    setMeta('meta[name="description"]', ["name", "description"], meta.description);
    setMeta('meta[name="robots"]', ["name", "robots"], meta.noIndex ? "noindex, nofollow" : "index, follow");
    setMeta('meta[property="og:title"]', ["property", "og:title"], meta.title);
    setMeta('meta[property="og:type"]', ["property", "og:type"], "website");
    setMeta('meta[property="og:description"]', ["property", "og:description"], meta.description);
    setMeta('meta[property="og:url"]', ["property", "og:url"], canonicalUrl);
    setMeta('meta[property="og:image"]', ["property", "og:image"], socialImage);
    setMeta('meta[name="twitter:title"]', ["name", "twitter:title"], meta.title);
    setMeta('meta[name="twitter:description"]', ["name", "twitter:description"], meta.description);
    setMeta('meta[name="twitter:image"]', ["name", "twitter:image"], socialImage);
    document.head.querySelector('meta[property="product:price:amount"]')?.remove();
    document.head.querySelector('meta[property="product:price:currency"]')?.remove();

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
};

export default Seo;
