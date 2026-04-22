import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MerchantScanner from './MerchantScanner';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MerchantScanner />
  </StrictMode>
);