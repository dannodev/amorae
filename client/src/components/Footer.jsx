import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const getFooterWhatsAppNumber = () => {
  const raw = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || "523330089383";
  return raw.replace(/\D/g, "") || "523330089383";
};

const Footer = () => {
  const whatsappNumber = getFooterWhatsAppNumber();
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const year = new Date().getFullYear();

  return (
    <footer className="page-shell px-5 pb-28 pt-10 sm:px-8 md:pb-10 lg:px-14 xl:px-20">
      <div className="reveal-on-scroll overflow-hidden rounded-[2rem] border border-primary-dull/10 bg-cocoa text-white shadow-[0_24px_70px_rgba(59,36,28,0.18)] md:rounded-[2.75rem]">
        <div className="relative grid gap-10 px-7 py-10 sm:px-10 md:grid-cols-[1.1fr_.9fr_.9fr] md:px-12 md:py-12 lg:px-16">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[52px] border-white/5" />
          <div className="relative">
            <img src={assets.amorae_logo} alt="Amorae Repostería" className="h-12 w-auto brightness-0 invert" />
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              Repostería artesanal en Guadalajara: brownies, roles, tiramisú y detalles dulces preparados con cuidado.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-cocoa transition hover:-translate-y-0.5" href={whatsappUrl} target="_blank" rel="noreferrer">
                Pedir por WhatsApp
              </a>
              <a className="rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white/80 transition hover:-translate-y-0.5 hover:bg-white/8" href="https://www.instagram.com/amorae.reposteria" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          </div>

          <div className="relative">
            <h2 className="font-display text-xl font-bold">Explora</h2>
            <nav className="mt-5 grid gap-3 text-sm text-white/60">
              <Link to="/" className="transition hover:text-white">Inicio</Link>
              <Link to="/products" className="transition hover:text-white">Colección</Link>
              <Link to="/custom-order" className="transition hover:text-white">Pedido especial</Link>
              <a href="/#experiencia" className="transition hover:text-white">Nuestra esencia</a>
              <Link to="/my-orders" className="transition hover:text-white">Mis pedidos</Link>
              <Link to="/delivery-policy" className="transition hover:text-white">Política de entrega</Link>
            </nav>
          </div>

          <div className="relative">
            <h2 className="font-display text-xl font-bold">Contacto</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/60">
              <p>Guadalajara, Jalisco y zona metropolitana.</p>
              <p>
                Instagram:{" "}
                <a className="font-semibold text-[#f4d8b5] hover:text-white" href="https://www.instagram.com/amorae.reposteria" target="_blank" rel="noreferrer">
                  @amorae.reposteria
                </a>
              </p>
              <p>
                WhatsApp:{" "}
                <a className="font-semibold text-[#f4d8b5] hover:text-white" href={whatsappUrl} target="_blank" rel="noreferrer">
                  +{whatsappNumber}
                </a>
              </p>
              <p className="text-xs text-white/38">Pedidos sujetos a disponibilidad y zona de entrega.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-7 py-5 text-xs text-white/40 sm:px-10 md:px-12 lg:px-16">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {year} Amorae Repostería. Todos los derechos reservados.</span>
            <span>Hecho con cariño para vender mejor, sin hacer la web pesada.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
