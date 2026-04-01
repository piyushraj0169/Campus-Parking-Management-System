import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import StaffRoute from './components/StaffRoute';
import PrivateRoute from './components/PrivateRoute';
import GuestRoute from './components/GuestRoute';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import Chatbot from './components/Chatbot';
import GlobalPaymentModal from './components/GlobalPaymentModal';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="min-vh-100 bg-light d-flex flex-column">
        <Navbar />
        <GlobalPaymentModal />
        <div className="flex-grow-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />

            {/* Guest Routes - Only accessible when NOT logged in */}
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            {/* Private Routes - Only accessible when logged in */}
            <Route element={<PrivateRoute />}>
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff-dashboard" element={<StaffRoute />}>
              <Route index element={<StaffDashboard />} />
            </Route>
          </Routes>
        </div>
        <Footer />
        <Chatbot />
      </div>
    </AuthProvider>
  );
}

export default App;
