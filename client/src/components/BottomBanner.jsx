import { assets, features } from '../assets/assets'

const BottomBanner = () => {
  return (
    <section id="experiencia" className="reveal-on-scroll relative mt-28 overflow-hidden rounded-[2rem] bg-cocoa text-white shadow-[0_28px_80px_rgba(60,31,20,0.22)] md:rounded-[2.75rem]">
      <img loading="lazy" src={assets.bottom_banner_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-luminosity" />
      <div className="absolute inset-0 bg-gradient-to-r from-cocoa via-cocoa/90 to-cocoa/35" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[55px] border-white/5" />

      <div className="relative grid gap-10 px-7 py-12 sm:px-10 md:grid-cols-[.85fr_1.15fr] md:px-14 md:py-16 lg:px-20">
        <div className="max-w-md">
          <span className="section-kicker !text-[#e8b981]">La experiencia Amorae</span>
          <h2 className="font-display mt-4 text-4xl font-bold leading-tight md:text-5xl">Más que un postre, un detalle que se siente.</h2>
          <p className="mt-5 text-sm leading-7 text-white/65 md:text-base">
            Cada pedido se prepara en pequeños lotes, cuidando textura, sabor y presentación desde el horno hasta tu mesa.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature, index) => (
            <div key={feature.title} className="group rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/12">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4d8b5] shadow-lg">
                  <img src={feature.icon} alt="" className="h-6 w-6" />
                </span>
                <span className="font-display text-2xl text-white/15">0{index + 1}</span>
              </div>
              <h3 className="font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-1 text-xs leading-5 text-white/55">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default BottomBanner
