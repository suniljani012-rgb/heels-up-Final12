import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import ToastContainer from './components/ToastContainer'

import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Wishlist from './pages/Wishlist'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderTracking from './pages/OrderTracking'
import Admin from './pages/Admin'
import DynamicPage from './pages/DynamicPage'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-[#fcfbf9] text-[#1a1816]">
          <Header />
          <main className="flex-grow">
            <Routes>
              {/* Main storefront routes */}
              <Route path="/" element={<Home />} />
              <Route path="/index.html" element={<Home />} />
              
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop.html" element={<Shop />} />
              
              <Route path="/product" element={<Product />} />
              <Route path="/product.html" element={<Product />} />
              
              <Route path="/cart" element={<Cart />} />
              <Route path="/cart.html" element={<Cart />} />
              
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout.html" element={<Checkout />} />
              
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/wishlist.html" element={<Wishlist />} />
              
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile.html" element={<Profile />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/login.html" element={<Login />} />
              
              <Route path="/register" element={<Register />} />
              <Route path="/register.html" element={<Register />} />
              
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/forgot-password.html" element={<ForgotPassword />} />
              
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/order-tracking" element={<OrderTracking />} />
              <Route path="/order-tracking.html" element={<OrderTracking />} />
              
              {/* Dynamic content & policy pages */}
              <Route path="/privacy" element={<DynamicPage />} />
              <Route path="/privacy.html" element={<DynamicPage />} />
              <Route path="/terms" element={<DynamicPage />} />
              <Route path="/terms.html" element={<DynamicPage />} />
              <Route path="/returns" element={<DynamicPage />} />
              <Route path="/returns.html" element={<DynamicPage />} />
              <Route path="/shipping-info" element={<DynamicPage />} />
              <Route path="/shipping-info.html" element={<DynamicPage />} />
              <Route path="/faq" element={<DynamicPage />} />
              <Route path="/faq.html" element={<DynamicPage />} />
              <Route path="/about" element={<DynamicPage />} />
              <Route path="/about.html" element={<DynamicPage />} />
              <Route path="/size-guide" element={<DynamicPage />} />
              <Route path="/size-guide.html" element={<DynamicPage />} />

              {/* Admin Portal routes */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin.html" element={<Admin />} />
              
              {/* Fallback route */}
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <Footer />
          
          {/* Overlays */}
          <CartDrawer />
          <ToastContainer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
