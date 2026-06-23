import { NavLink, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/useAppContext'

const Navbar = () => {
    const { navigate, getCartCount, searchQuery, setSearchQuery } = useAppContext();
    const location = useLocation();

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchQuery(value);
        if (value.trim() && location.pathname !== "/products") {
            navigate("/products");
        }
    };

    const isActive = (path) => location.pathname === path ? "text-primary-dull" : "text-stone-500";

    return (
        <>
            <nav className="sticky top-0 z-40 border-b border-primary-dull/10 bg-[#fffaf2]/88 backdrop-blur-xl">
              <div className="page-shell flex items-center justify-between px-5 sm:px-8 lg:px-14 xl:px-20 py-3.5">
                <NavLink to="/" className="flex items-center">
                    <img className='h-11 sm:h-13 w-auto' src={assets.amorae_logo} alt='Amorae repostería' />
                </NavLink>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-stone-600">
                    <NavLink to="/" className={({isActive}) => `${isActive ? "text-primary-dull" : ""} hover:text-primary-dull transition-colors`}>Inicio</NavLink>
                    <NavLink to="/products" className={({isActive}) => `${isActive ? "text-primary-dull" : ""} hover:text-primary-dull transition-colors`}>Colección</NavLink>
                    <NavLink to="/custom-order" className={({isActive}) => `${isActive ? "text-primary-dull" : ""} hover:text-primary-dull transition-colors`}>Pedido especial</NavLink>
                    <a href="/#experiencia" className="hover:text-primary-dull transition-colors">Nuestra esencia</a>
                    <NavLink to="/my-orders" className={({isActive}) => `${isActive ? "text-primary-dull" : ""} hover:text-primary-dull transition-colors`}>Mis pedidos</NavLink>

                    <div className="hidden lg:flex items-center text-sm gap-2 bakery-input px-4 rounded-full bg-white/60">
                        <input
                            className="py-2 w-36 xl:w-44 bg-transparent outline-none placeholder-stone-400 font-normal"
                            type="text"
                            placeholder="Encuentra tu postre"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        <img src={assets.search_icon} alt="search" className='w-4 h-4' />
                    </div>

                    <button onClick={() => navigate("/cart")} className="relative cursor-pointer w-11 h-11 rounded-full bg-white border border-primary-dull/10 shadow-sm flex items-center justify-center hover:-translate-y-0.5 hover:shadow-md transition-all" aria-label="Abrir carrito">
                        <img src={assets.nav_cart_icon} alt="" className='w-5 opacity-75' />
                        <span className="absolute -top-1 -right-1 text-[10px] font-bold text-white bg-primary-dull w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-[#fffaf2]">{getCartCount()}</span>
                    </button>
                </div>
              </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <div className="fixed bottom-3 left-3 right-3 bg-[#fffdf9]/92 border border-primary-dull/10 rounded-2xl shadow-[0_14px_40px_rgba(74,38,25,0.18)] backdrop-blur-xl md:hidden z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                <div className="flex items-center justify-around py-2">
                    <NavLink to="/" className={`flex flex-col items-center gap-0.5 text-[11px] ${isActive("/")} hover:text-primary transition-colors`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Inicio</span>
                    </NavLink>

                    <NavLink to="/products" className={`flex flex-col items-center gap-0.5 text-[11px] ${isActive("/products")} hover:text-primary transition-colors`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <span>Buscar</span>
                    </NavLink>

                    <button type="button" onClick={() => navigate("/cart")} aria-label={`Abrir carrito, ${getCartCount()} productos`} className={`flex flex-col items-center gap-0.5 text-[11px] ${isActive("/cart")} hover:text-primary transition-colors relative cursor-pointer`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                        </svg>
                        <span>Carrito</span>
                        {getCartCount() > 0 && (
                            <span className="absolute -top-0.5 -right-1 text-[10px] text-white bg-primary w-[18px] h-[18px] rounded-full flex items-center justify-center font-semibold shadow-sm">
                                {getCartCount()}
                            </span>
                        )}
                    </button>

                    <NavLink to="/my-orders" className={`flex flex-col items-center gap-0.5 text-[11px] ${isActive("/my-orders")} hover:text-primary transition-colors`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                            <path d="M9 14l2 2 4-4" />
                        </svg>
                        <span>Pedidos</span>
                    </NavLink>
                </div>
            </div>
        </>
    )
}

export default Navbar
