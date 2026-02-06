import { NavLink } from 'react-router-dom'
import { assets } from '../assets/assets'
import React from 'react'
import { useAppContext } from '../context/AppContext'

const Navbar = () => {
    const [open, setOpen] = React.useState(false)
    const {user, setUser, setShowUserLogin, navigate} = useAppContext();
    const logout = async ()=>{
        setUser(null);
        navigate("/")
    }

  return (
    
    <nav className="flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b border-gray-300 bg-white relative transition-all">

            <NavLink to="/" onClick={()=> setOpen(false)}>
                <img className='h-15' src={assets.amorae_logo} alt='logo'/>
            </NavLink>

            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-8">
                <NavLink to="/" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Inicio</NavLink>
                <NavLink to="/products" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Nuestros Productos</NavLink>
                <NavLink to="/" className="hover:text-primary transition-colors hover:scale-110 transition-transform">Contacto</NavLink>

                <div className="hidden lg:flex items-center text-sm gap-2 border border-gray-300 px-3 rounded-full">
                    <input className="py-1.5 w-full bg-transparent outline-none placeholder-gray-500" type="text" placeholder="Encuentra tu postre" />
                    <img src={assets.search_icon} alt="search" className='w-4 h-4' />
                </div>

                <div onClick={()=> navigate("/cart")} className="relative cursor-pointer">
                    <img src={assets.nav_cart_icon} alt="cart" className='w-6 opacity-80' />
                    <button className="absolute -top-2 -right-3 text-xs text-white bg-primary w-[18px] h-[18px] rounded-full">3</button>
                </div>

                {!user ? ( <button onClick={()=> setShowUserLogin(true)} className="cursor-pointer px-5 py-2 bg-primary hover:bg-primary-dull transition text-white rounded-full">
                    Iniciar Sesión
                </button>)
                :
                (
                    <div className='relative group'>
                        <img src={assets.profile_icon} className='w-10' alt="foto de perfil"/>
                        <ul className='hidden group-hover:block absolute top-10 right-0 bg-white shadow border border-gray-200 py-2.5 w-30 rounded-md text-sm z-40'>
                            <li onClick={()=> navigate("my-orders")} className='p-1.5 pl-3 hover:bg-primary/10 cursor-pointer'>Pedidos</li>
                            <li onClick={logout} className='p-1.5 pl-3 hover:bg-primary/10 cursor-pointer'>Cerrar Sesión</li>
                        </ul>
                    </div>
                )}
            </div>

            <button onClick={() => open ? setOpen(false) : setOpen(true)} aria-label="Menu" className="sm:hidden">
                {/* Menu Icon SVG */}
                <img src={assets.menu_icon} alt="menu" className='cursor-pointer'/>
            </button>

            {/* Mobile Menu */}
            { open && (
                <div className={`${open ? 'flex' : 'hidden'} absolute top-[60px] left-0 w-full bg-white shadow-md py-4 flex-col items-start gap-2 px-5 text-sm md:hidden`}>
                    <NavLink to="/" onClick={()=> setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Inicio</NavLink>
                    <NavLink to="/products" onClick={()=> setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Nuestros Productos</NavLink>
                    {user &&
                    <NavLink to="/products" onClick={()=> setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Pedidos</NavLink>
                    }
                    <NavLink to="/" onClick={()=> setOpen(false)} className="hover:text-primary transition-colors hover:scale-110 transition-transform">Contacto</NavLink>
                    {!user ? (
                        <button onClick={()=>{
                            setOpen(false);
                            setShowUserLogin(true);
                        }} className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm">
                            Iniciar Sesión
                        </button>

                    ) : (
                        <button onClick={logout}className="cursor-pointer px-6 py-2 mt-2 bg-primary hover:bg-primary-dull transition text-white rounded-full text-sm">
                        Cerrar Sesión
                        </button>
                    )}
                </div>
            )}

        </nav>
  )
}

export default Navbar