import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Brands from './pages/Brands';
import Booking from './pages/Booking';
import DeliveryMenu from './pages/DeliveryMenu';
import IGoCard from './pages/IGoCard';
import Topup from './pages/Topup';
import ReservationHistory from './pages/ReservationHistory';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import Invoices from './pages/Invoices';
import MyQr from './pages/MyQr';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="brands" element={<Brands />} />
          <Route path="booking" element={<Booking />} />
          <Route path="booking/history" element={<ReservationHistory />} />
          <Route path="delivery/:companyId/:branchId" element={<DeliveryMenu />} />
          <Route path="igo-card" element={<IGoCard />} />
          <Route path="topup" element={<Topup />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="my-qr" element={<MyQr />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
