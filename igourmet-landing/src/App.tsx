import { useEffect, useState } from 'react';
import api, { type Company } from './lib/api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Brands from './components/Brands';
import FeaturedMenu from './components/FeaturedMenu';
import Branches from './components/Branches';
import BookingForm from './components/BookingForm';
import Footer from './components/Footer';

function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/public/companies')
      .then((res: any) => setCompanies(res.companies || []))
      .catch((err) => console.error('Lỗi tải thương hiệu:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ink text-cream">
      <Navbar />
      <Hero />
      <Brands companies={companies} loading={loading} />
      <FeaturedMenu companies={companies} />
      <Branches companies={companies} />
      <BookingForm companies={companies} />
      <Footer />
    </div>
  );
}

export default App;
