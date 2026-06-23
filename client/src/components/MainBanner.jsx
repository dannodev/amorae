import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const MainBanner = () => {
  return (
    <section className="relative mt-5 md:mt-7 min-h-[500px] md:min-h-[520px] overflow-hidden rounded-[2rem] md:rounded-[2.75rem] bg-[#f2d8b5] shadow-[0_30px_80px_rgba(87,48,29,0.16)] isolate">
      <img
        src={assets.main_banner_bg}
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
      />
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,248,237,0.98)_0%,rgba(255,244,227,0.88)_47%,rgba(87,44,28,0.04)_75%)]" />
      <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full border border-white/60 bg-white/25 blur-sm" />
      <div className="absolute left-[48%] top-8 hidden h-28 w-28 rounded-full border border-primary-dull/10 md:block" />

      <div className="relative z-10 grid min-h-[500px] md:min-h-[520px] grid-cols-1 items-center md:grid-cols-[1.05fr_.95fr]">
        <div className="px-7 pb-44 pt-9 sm:px-10 sm:pb-56 md:px-14 md:py-12 lg:px-20">
          <span className="section-kicker">Repostería artesanal</span>
          <h1 className="font-display mt-3 max-w-xl text-[2.3rem] font-bold leading-[.98] tracking-[-0.045em] text-cocoa sm:text-5xl lg:text-6xl">
            Dulces momentos,
            <span className="block italic text-primary-dull">recién horneados.</span>
          </h1>
          <p className="mt-5 max-w-[19rem] text-sm leading-6 text-stone-600 sm:max-w-md md:text-base">
            Brownies, roles y postres artesanales para celebrar cualquier día.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/products" className="btn-primary px-7 py-3">
              Descubrir sabores
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/my-orders" className="hidden rounded-full border border-primary-dull/20 bg-white/60 px-6 py-3 text-sm font-bold text-primary-dull backdrop-blur transition hover:bg-white sm:inline-flex">
              Seguir mi pedido
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 right-[-2rem] h-[235px] w-[105%] md:relative md:bottom-auto md:right-auto md:h-full md:w-full [perspective:1000px]">
          <div className="absolute bottom-[-8rem] right-[-4rem] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff7e8,#d59a63_72%)] shadow-[inset_-30px_-35px_60px_rgba(101,50,26,0.18),0_30px_70px_rgba(94,48,27,0.22)] sm:right-[2%] md:bottom-[-5rem] md:right-[-8%] md:h-[450px] md:w-[450px]" />
          <div className="absolute bottom-8 right-[8%] h-12 w-[60%] rounded-[50%] bg-cocoa/25 blur-xl md:bottom-16 md:right-[1%]" />

          <img decoding="async" src={assets.brownie_image} alt="Brownie artesanal" className="float-slow absolute bottom-12 right-[6%] z-20 w-36 drop-shadow-[0_30px_22px_rgba(55,25,15,0.34)] sm:right-[18%] sm:w-44 md:bottom-[25%] md:right-[12%] md:w-60 lg:w-68" />
          <img decoding="async" src={assets.rol_image} alt="Rol de canela" className="float-delayed absolute bottom-3 right-[54%] z-10 w-28 -rotate-12 drop-shadow-[0_24px_18px_rgba(55,25,15,0.28)] sm:right-[55%] sm:w-32 md:bottom-[8%] md:right-[59%] md:w-40" />
          <img decoding="async" src={assets.tiramisu_image} alt="Tiramisú artesanal" className="float-slow absolute bottom-3 right-[31%] z-30 w-24 rotate-6 drop-shadow-[0_24px_18px_rgba(55,25,15,0.28)] sm:right-[38%] sm:w-28 md:bottom-[8%] md:right-[38%] md:w-36" />

          <div className="absolute bottom-40 right-[48%] z-40 hidden rounded-2xl border border-white/50 bg-white/82 px-3 py-2 shadow-xl backdrop-blur-md sm:block sm:right-[58%] md:bottom-[72%] md:right-[8%]">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Favorito</p>
            <p className="font-display text-sm font-bold text-cocoa">Brownie Lotus</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MainBanner
