const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="flex min-h-screen items-center justify-center px-6">
    <div className="panel max-w-sm p-8 text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  </div>
);

export default LoadingScreen;
