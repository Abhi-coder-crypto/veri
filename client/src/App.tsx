import { Route } from 'wouter';
import { CandidateProvider } from './context/CandidateContext';
import Navigation from './components/Navigation';
import VerificationPage from './pages/VerificationPage';
import RegistrationPage from './pages/RegistrationPage';
import StatusPage from './pages/StatusPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <CandidateProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-6">
          <Route path="/" component={VerificationPage} />
          <Route path="/verification" component={VerificationPage} />
          <Route path="/registration" component={RegistrationPage} />
          <Route path="/status" component={StatusPage} />
          <Route path="/admin" component={AdminPage} />
        </main>
      </div>
    </CandidateProvider>
  );
}

export default App;