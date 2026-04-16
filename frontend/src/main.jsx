import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from "react-helmet-async";
import LandingPage from "./pages/LandingPage.jsx";
import CarsPage from "./pages/CarsPage.jsx";
import CarDetails from './pages/CarDetails.jsx';
import Checkout from "./pages/Checkout.jsx";
import CheckoutAccount from "./pages/CheckoutAccount.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Admin from "./pages/Admin.jsx";
import MyReservations from "./pages/MyReservations.jsx";
import Profile from "./pages/Profile.jsx";
import CGL from "./pages/CGL.jsx";
import MentionsLegales from "./pages/MentionsLegales.jsx";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite.jsx";
import Stations from "./pages/Stations.jsx";
import ReservationConfirmation from "./pages/ReservationConfirmation.jsx";
import NotFound from "./pages/NotFound.jsx";
import { AppProvider } from "./context/AppContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./global.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/cars" element={<CarsPage />} />
              <Route path="/cars/:id" element={<CarDetails />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/account" element={<CheckoutAccount />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/my-reservations" element={<MyReservations />} />
              <Route path="/reservation-confirmation" element={<ReservationConfirmation />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/cgl" element={<CGL />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/stations" element={<Stations />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
