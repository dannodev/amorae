import { NavLink, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import React from 'react'
import { useAppContext } from '../context/AppContext'

const Navbar = () => {
    const [open, setOpen] = React.useState(false)
    const { navigate, getCartCount, searchQuery, setSearchQuery } = useAppContext();
    const location = useLocation();
    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchQuery(value);
        if (value.trim() && location.pathname !== "/products") {
            navigate("/products");
        }
    };

    return (

        <nav className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-300 bg-white relative transition-all">

            <NavLink to="/" onClick={() => setOpen(false)}>
                <img className='h-15' src={assets.amorae_logo} alt='logo' />
            </NavLink>

            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-8">
                <NavLink to="/" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Inicio</NavLink>
                <NavLink to="/products" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Nuestros Productos</NavLink>
                <NavLink to="/" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Contacto</NavLink>
                <NavLink to="/my-orders" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Mis Pedidos</NavLink>

                <div className="hidden lg:flex items-center text-sm gap-2 border border-gray-300 px-3 rounded-full">
                    <input
                        className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500"
                        type="text"
                        placeholder="Encuentra tu postre"
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    <img src={assets.search_icon} alt="search" className='w-4 h-4' />
                </div>

                <div onClick={() => navigate("/cart")} className="relative cursor-pointer">
                    <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">{getCartCount()}</button>
                </div>

            </div>

            <button onClick={() => open ? setOpen(false) : setOpen(true)} aria-label="Menu" className="sm:hidden">
                {/* Menu Icon SVG */}
                <img src={assets.menu_icon} alt="menu" className='cursor-pointer' />
            </button>

            {/* Mobile Menu */}
            <div className={`absolute top-[60px] left-0 w-full bg-white shadow-md py-4 flex-col items-start gap-2 px-5 text-sm md:hidden transition-all duration-300 ${open ? 'flex opacity-100 translate-y-0' : 'hidden opacity-0 -translate-y-2'}`}>
                <NavLink to="/" onClick={() => setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Inicio</NavLink>
                <NavLink to="/products" onClick={() => setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Nuestros Productos</NavLink>
                <NavLink to="/my-orders" onClick={() => setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Mis Pedidos</NavLink>
                <NavLink to="/" onClick={() => setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Contacto</NavLink>
            </div>

        </nav>
    )
}

export default Navbar
