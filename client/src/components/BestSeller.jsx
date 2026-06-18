import ProductCard from './ProductCard'
import { useAppContext } from '../context/useAppContext'

const BestSeller = () => {
  const { products } = useAppContext()

  return (
    <section className='reveal-on-scroll mt-24'>
      <div className='flex flex-col items-center justify-between gap-3 text-center md:flex-row md:items-end md:text-left'>
        <div>
          <span className="section-kicker">Favoritos de la casa</span>
          <h2 className='section-title'>Los más pedidos</h2>
        </div>
        <p className='max-w-sm text-sm leading-6 text-stone-500'>Pequeños lujos horneados para regalar, compartir o guardar solo para ti.</p>
      </div>
        <div className='mt-9 grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 sm:grid-cols-3 md:gap-6 lg:grid-cols-5'>
          {products.filter((product)=> product.inStock).slice(0,5).map((product)=>(
            <ProductCard key={product._id} product={product}/>
          ))}
        </div>

    </section>
  )
}

export default BestSeller
