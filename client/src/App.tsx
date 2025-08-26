import { Route } from 'wouter';
import { CandidateProvider, useCandidateContext } from './context/CandidateContext';
import Navigation from './components/Navigation';
import VerificationPage from './pages/VerificationPage';
import RegistrationPage from './pages/RegistrationPageNew';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import StatusPage from './pages/StatusPage';
import AdminPage from './pages/AdminPageWithImport';

// Protected Registration Component
function ProtectedRegistration() {
  const { isVerified } = useCandidateContext();
  
  if (!isVerified) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Required</h2>
        <p className="text-gray-600 mb-4">Please complete mobile verification before accessing registration.</p>
        <a href="/" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Go to Verification
        </a>
      </div>
    );
  }
  
  return <RegistrationPage />;
}

function App() {
  return (
    <CandidateProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Navigation />
        <main className="container mx-auto px-4 py-6 relative z-10">
          <Route path="/" component={VerificationPage} />
          <Route path="/verification" component={VerificationPage} />
          <Route path="/registration" component={ProtectedRegistration} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/admin" component={AdminPage} />
        </main>
      </div>
    </CandidateProvider>
  );
}

export default App;