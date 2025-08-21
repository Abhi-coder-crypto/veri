import { Route } from 'wouter';
import { CandidateProvider } from './context/CandidateContext';
import Navigation from './components/Navigation';
import VerificationPage from './pages/VerificationPage';
import RegistrationPage from './pages/RegistrationPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import StatusPage from './pages/StatusPage';
import AdminPage from './pages/AdminPageNew';

function App() {
  return (
    <CandidateProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Navigation />
        <main className="container mx-auto px-4 py-6 relative z-10">
          <Route path="/" component={VerificationPage} />
          <Route path="/verification" component={VerificationPage} />
          <Route path="/registration" component={RegistrationPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/admin" component={AdminPage} />
        </main>
      </div>
    </CandidateProvider>
  );
}

export default App;