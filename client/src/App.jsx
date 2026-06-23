import { lazy, Suspense, useLayoutEffect } from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from "react-hot-toast";
import Seo from './components/Seo'
import Footer from './components/Footer'

const Home = lazy(() => import('./pages/Home'))
const Products = lazy(() => import('./pages/Products'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const MyOrders = lazy(() => import('./pages/MyOrders'))
const Seller = lazy(() => import('./pages/Seller'))
const NotFound = lazy(() => import('./pages/NotFound'))
const DeliveryPolicy = lazy(() => import('./pages/DeliveryPolicy'))
const CustomOrder = lazy(() => import('./pages/CustomOrder'))
const Review = lazy(() => import('./pages/Review'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
)

const App = () => {
  const { pathname } = useLocation();
  const isSellerPath = pathname.startsWith("/seller");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return (
    <div className="min-h-screen overflow-x-hidden">
      {isSellerPath ? null : <Navbar/>}
      <Seo />

      <Toaster toastOptions={{
        style: {
          borderRadius: "16px",
          background: "#3B241C",
          color: "#FFF8ED",
          padding: "12px 16px",
        },
      }}/>

      <main className={`${isSellerPath ? "" : "page-shell px-5 sm:px-8 lg:px-14 xl:px-20 pb-24 md:pb-12"}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path='/products' element={<Products/>}/>
            <Route path='/product/:id' element={<ProductDetails/>}/>
            <Route path='/cart' element={<Cart/>}/>
            <Route path='/checkout' element={<Checkout/>}/>
            <Route path='/order-confirmation' element={<OrderConfirmation/>}/>
            <Route path='/my-orders' element={<MyOrders/>}/>
            <Route path='/delivery-policy' element={<DeliveryPolicy/>}/>
            <Route path='/custom-order' element={<CustomOrder/>}/>
            <Route path='/review' element={<Review/>}/>
            <Route path='/seller' element={<Seller/>}/>
            <Route path='*' element={<NotFound/>}/>
          </Routes>
        </Suspense>
      </main>
      {isSellerPath ? null : <Footer />}
    </div>
  )
}

export default App
