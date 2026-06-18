import { categories } from '../assets/assets'
import { useAppContext } from '../context/useAppContext'

const Categories = () => {
  const { navigate, setSearchQuery } = useAppContext()

  const openCategory = (category) => {
    setSearchQuery(category.path)
    navigate('/products')
    scrollTo(0, 0)
  }

  return (
    <section className="reveal-on-scroll mt-24">
      <div className="text-center">
        <span className="section-kicker">Elige tu antojo</span>
        <h2 className="section-title mx-auto max-w-[18rem] sm:max-w-xl">Una vitrina para cada momento</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-500 md:text-base">
          Recetas de casa, ingredientes elegidos con cuidado y ese toque especial que se recuerda.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        {categories.map((category, index) => (
          <button
            key={category.path}
            type="button"
            className="product-3d group relative min-h-52 cursor-pointer overflow-hidden rounded-[1.75rem] border border-primary-dull/10 p-4 text-left shadow-[0_15px_35px_rgba(82,43,25,0.08)] md:min-h-72 md:p-6"
            style={{ background: `linear-gradient(145deg, ${category.bgColor}dd, #fffaf2)` }}
            onClick={() => openCategory(category)}
          >
            <span className="absolute right-4 top-4 text-xs font-bold text-primary-dull/45">0{index + 1}</span>
            <div className="flex h-32 items-center justify-center md:h-48">
              <img loading="lazy" src={category.image} alt="" className="product-image max-h-28 max-w-32 object-contain drop-shadow-[0_15px_14px_rgba(66,35,22,0.22)] md:max-h-40 md:max-w-44" />
            </div>
            <div className="relative z-10">
              <p className="font-display text-lg font-bold leading-tight text-cocoa md:text-2xl">{category.text}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-dull opacity-70 transition group-hover:gap-2 group-hover:opacity-100">
                Ver selección <span>→</span>
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

export default Categories
