import logo from '../assets/logo.png';

const AppLogo = ({ className = '', imageClassName = '' }) => (
  <div className={`flex items-center ${className}`.trim()}>
    <img src={logo} alt="Buyer Trend Lens" className={`h-10 w-auto object-contain ${imageClassName}`.trim()} />
  </div>
);

export default AppLogo;
