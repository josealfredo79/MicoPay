export const Logo = () => (
  <div className="flex items-center gap-2">
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="3" stroke="#1A2830" strokeWidth="2"></circle>
      <circle cx="17" cy="17" r="3" stroke="#1D9E75" strokeWidth="2"></circle>
      <path d="M10 10L14 14" stroke="#00694C" strokeLinecap="round" strokeWidth="2"></path>
    </svg>
    <div className="font-headline tracking-tight text-2xl">
      <span className="font-semibold text-[#1A2830]">Mico</span>
      <span className="font-normal text-[#1D9E75]">Pay</span>
    </div>
  </div>
)
