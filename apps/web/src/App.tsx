import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./pages/mobile/Home";
import DepositMap from "./pages/mobile/DepositMap";
import DepositRequest from "./pages/mobile/DepositRequest";
import DepositQR from "./pages/mobile/DepositQR";
import DepositChat from "./pages/mobile/DepositChat";
import SuccessScreen from "./pages/mobile/SuccessScreen";
import CashoutRequest from "./pages/mobile/CashoutRequest";
import Explore from "./pages/mobile/Explore";
import DemoTerminal from "./components/demo/DemoTerminal";
import ServiceCatalog from "./components/demo/ServiceCatalog";
import ReputationPanel from "./components/demo/ReputationPanel";
import BazaarFeed from "./components/demo/BazaarFeed";
import FundWidget from "./components/demo/FundWidget";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function App() {
  return (
    <Routes>
      {/* Mobile App Routes */}
      <Route path="/" element={<HomeWrapper />} />
      <Route path="/deposit/map" element={<DepositMapWrapper />} />
      <Route path="/deposit/request" element={<DepositRequestWrapper />} />
      <Route path="/deposit/qr" element={<DepositQRWrapper />} />
      <Route path="/deposit/chat" element={<DepositChatWrapper />} />
      <Route path="/success" element={<SuccessScreenWrapper />} />
      <Route path="/cashout" element={<CashoutRequestWrapper />} />
      <Route path="/explore" element={<ExplorePageWrapper />} />
      
      {/* Legacy Tabs (for demo) */}
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/bazaar" element={<BazaarPage />} />
      <Route path="/reputation" element={<ReputationPage />} />
      <Route path="/fund" element={<FundPage />} />
      <Route path="/services" element={<ServicesPage />} />
    </Routes>
  );
}

// Wrappers that handle navigation

function HomeWrapper() {
  const navigate = useNavigate();
  return (
    <Home 
      onNavigateCashout={() => navigate('/cashout')}
      onNavigateDeposit={() => navigate('/deposit/map')}
      token={null}
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
      onSearch={(amount: number) => navigate('/deposit/map?amount=' + amount)}
    />
  );
}

function ExplorePageWrapper() {
  const navigate = useNavigate();
  return <Explore onBack={() => navigate(-1)} />;
}

// Legacy pages for tabs
function DemoPage() { return <DemoTerminal apiUrl={API_URL} />; }
function BazaarPage() { return <BazaarFeed apiUrl={API_URL} />; }
function ReputationPage() { return <ReputationPanel apiUrl={API_URL} />; }
function FundPage() { return <FundWidget apiUrl={API_URL} />; }
function ServicesPage() { return <ServiceCatalog apiUrl={API_URL} />; }
