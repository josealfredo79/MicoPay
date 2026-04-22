import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useWallet } from "./contexts/AuthContext";
import { LoginScreen } from "./pages/LoginScreen";
import Home from "./pages/mobile/Home";
import DepositMap from "./pages/mobile/DepositMap";
import DepositRequest from "./pages/mobile/DepositRequest";
import DepositQR from "./pages/mobile/DepositQR";
import DepositChat from "./pages/mobile/DepositChat";
import SuccessScreen from "./pages/mobile/SuccessScreen";
import CashoutRequest from "./pages/mobile/CashoutRequest";
import CashoutMap from "./pages/mobile/CashoutMap";
import CashoutQR from "./pages/mobile/CashoutQR";
import Explore from "./pages/mobile/Explore";
import Savings from "./pages/mobile/Savings";
import DemoTerminal from "./components/demo/DemoTerminal";
import ServiceCatalog from "./components/demo/ServiceCatalog";
import ReputationPanel from "./components/demo/ReputationPanel";
import BazaarFeed from "./components/demo/BazaarFeed";
import FundWidget from "./components/demo/FundWidget";
import { api } from "./services/api";
import type { Agent } from "./types";
import type { CashRequestResponse } from "./pages/mobile/CashoutQR";

const API_URL = import.meta.env.VITE_API_URL === '/api' ? '' : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

export default function App() {
  const { wallet, isLoading } = useWallet();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        wallet ? <NavigateToHome /> : <LoginScreenWrapper />
      } />

      {/* Protected Mobile Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <HomeWrapper />
        </ProtectedRoute>
      } />
      <Route path="/deposit/map" element={
        <ProtectedRoute>
          <DepositMapWrapper />
        </ProtectedRoute>
      } />
      <Route path="/deposit/request" element={
        <ProtectedRoute>
          <DepositRequestWrapper />
        </ProtectedRoute>
      } />
      <Route path="/deposit/qr" element={
        <ProtectedRoute>
          <DepositQRWrapper />
        </ProtectedRoute>
      } />
      <Route path="/deposit/chat" element={
        <ProtectedRoute>
          <DepositChatWrapper />
        </ProtectedRoute>
      } />
      <Route path="/success" element={
        <ProtectedRoute>
          <SuccessScreenWrapper />
        </ProtectedRoute>
      } />
      <Route path="/cashout" element={
        <ProtectedRoute>
          <CashoutRequestWrapper />
        </ProtectedRoute>
      } />
      <Route path="/cashout/map" element={
        <ProtectedRoute>
          <CashoutMapWrapper />
        </ProtectedRoute>
      } />
      <Route path="/cashout/qr" element={
        <ProtectedRoute>
          <CashoutQRWrapper />
        </ProtectedRoute>
      } />
      <Route path="/explore" element={
        <ProtectedRoute>
          <ExplorePageWrapper />
        </ProtectedRoute>
      } />
      <Route path="/savings" element={
        <ProtectedRoute>
          <SavingsWrapper />
        </ProtectedRoute>
      } />
      
      {/* Legacy Tabs (for demo) */}
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/bazaar" element={<BazaarPage />} />
      <Route path="/reputation" element={<ReputationPage />} />
      <Route path="/fund" element={<FundPage />} />
      <Route path="/services" element={<ServicesPage />} />
    </Routes>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { wallet, isLoading } = useWallet();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Cargando wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    navigate('/login');
    return null;
  }

  return <>{children}</>;
}

function LoginScreenWrapper() {
  const navigate = useNavigate();
  return <LoginScreen onSuccess={() => navigate('/')} />;
}

function NavigateToHome() {
  const navigate = useNavigate();
  navigate('/');
  return null;
}

// Wrappers that handle navigation

function HomeWrapper() {
  const navigate = useNavigate();
  const { wallet, publicKey } = useWallet();
  return (
    <Home 
      onNavigateCashout={() => navigate('/cashout')}
      onNavigateDeposit={() => navigate('/deposit/map')}
      walletAddress={publicKey}
    />
  );
}

function DepositMapWrapper() {
  const navigate = useNavigate();
  return (
    <DepositMap 
      onBack={() => navigate(-1)}
      onSelectOffer={(id: string) => navigate('/deposit/request?agent=' + id)}
      amountMxn={500}
      userLat={19.4195}
      userLng={-99.1627}
    />
  );
}

function DepositRequestWrapper() {
  const navigate = useNavigate();
  return (
    <DepositRequest 
      onBack={() => navigate(-1)}
      onSearch={(amount: string) => navigate('/deposit/map?amount=' + amount)}
    />
  );
}

function DepositQRWrapper() {
  const navigate = useNavigate();
  return (
    <DepositQR 
      onBack={() => navigate(-1)}
      onChat={() => navigate('/deposit/chat')}
      onSuccess={() => navigate('/success?type=deposit')}
    />
  );
}

function DepositChatWrapper() {
  const navigate = useNavigate();
  return (
    <DepositChat 
      onBack={() => navigate(-1)}
      onViewQR={() => navigate('/deposit/qr')}
    />
  );
}

function SuccessScreenWrapper() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const type = (params.get('type') as 'cashout' | 'deposit') || 'deposit';
  const amount = params.get('amount') || '500';
  const commission = params.get('commission') || '2';
  const received = params.get('received') || '498';
  const agentName = params.get('agent') || 'Tienda';
  return (
    <SuccessScreen 
      type={type}
      amount={amount}
      commission={commission}
      received={received}
      agentName={agentName}
      onHome={() => navigate('/')}
    />
  );
}

function CashoutRequestWrapper() {
  const navigate = useNavigate();
  return (
    <CashoutRequest 
      onBack={() => navigate(-1)}
      onSearch={(amount: number) => navigate('/cashout/map?amount=' + amount)}
    />
  );
}

function CashoutMapWrapper() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const amountMxn = parseInt(params.get('amount') || '500', 10);
  const [loading, setLoading] = useState(false);
  const [cashRequest, setCashRequest] = useState<CashRequestResponse | null>(null);

  const handleSelectOffer = async (agent: Agent) => {
    try {
      setLoading(true);
      const request = await api.cash.createRequest(agent.stellar_address, amountMxn);
      setCashRequest(request);
      navigate('/cashout/qr?request_id=' + request.request_id, {
        state: { cashRequest: request }
      });
    } catch (err) {
      console.error('Failed to create cash request:', err);
      alert('Error al crear la solicitud. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CashoutMap
      onBack={() => navigate(-1)}
      onSelectOffer={handleSelectOffer}
      loading={loading}
      amountMxn={amountMxn}
    />
  );
}

function CashoutQRWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cashRequest, setCashRequest] = useState<CashRequestResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get('request_id');
    if (requestId) {
      api.cash.getRequest(requestId)
        .then(setCashRequest)
        .catch(console.error);
    }
    
    const state = location.state as { cashRequest?: CashRequestResponse } | null;
    if (state?.cashRequest) {
      setCashRequest(state.cashRequest);
    }
  }, [location]);

  const handleSuccess = () => {
    navigate('/success?type=cashout&amount=' + (cashRequest?.exchange?.amount_mxn || '500'));
  };

  return (
    <CashoutQR
      onBack={() => navigate(-1)}
      onSuccess={handleSuccess}
      cashRequest={cashRequest}
      polling={true}
    />
  );
}

function ExplorePageWrapper() {
  const navigate = useNavigate();
  return <Explore onBack={() => navigate(-1)} />;
}

function SavingsWrapper() {
  const navigate = useNavigate();
  return <Savings onBack={() => navigate(-1)} />;
}

// Legacy pages for tabs
function DemoPage() { return <DemoTerminal apiUrl={API_URL} />; }
function BazaarPage() { return <BazaarFeed apiUrl={API_URL} />; }
function ReputationPage() { return <ReputationPanel apiUrl={API_URL} />; }
function FundPage() { return <FundWidget apiUrl={API_URL} />; }
function ServicesPage() { return <ServiceCatalog apiUrl={API_URL} />; }
