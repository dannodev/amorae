import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const SeasonalBanner = () => (
  <section className="reveal-on-scroll mt-24 overflow-hidden rounded-[2rem] border border-primary-dull/10 bg-[#f4dfc5] shadow-[0_20px_60px_rgba(87,48,29,0.1)] md:rounded-[2.75rem]">
    <div className="grid items-center gap-6 p-7 md:grid-cols-[1fr_.8fr] md:p-10">
      <div>
        <span className="section-kicker">Temporada</span>
        <h2 className="font-display mt-3 text-3xl font-bold leading-tight text-cocoa md:text-5xl">
          Cajas especiales para regalos, mesas dulces y celebraciones.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
          Pide una selección personalizada según fecha, cantidad y estilo. Ideal para cumpleaños, reuniones, detalles corporativos y mesas de postres.
        </p>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          <Link to="/custom-order" className="btn-primary px-6 py-3 text-sm">Cotizar pedido especial</Link>
          <Link to="/products" className="inline-flex justify-center rounded-full border border-primary-dull/15 bg-white/55 px-6 py-3 text-sm font-bold text-primary-dull">Ver catálogo</Link>
        </div>
      </div>
      <div className="relative h-64">
        <div className="absolute inset-6 rounded-full bg-white/30 blur-xl" />
        <img loading="lazy" decoding="async" src={assets.brownie_image} alt="" className="float-slow absolute left-4 top-8 w-36 drop-shadow-xl" />
        <img loading="lazy" decoding="async" src={assets.rol_image} alt="" className="float-delayed absolute bottom-2 right-6 w-40 drop-shadow-xl" />
        <img loading="lazy" decoding="async" src={assets.tiramisu_image} alt="" className="float-slow absolute right-24 top-10 w-28 rotate-6 drop-shadow-xl" />
      </div>
    </div>
  </section>
);

export default SeasonalBanner;
