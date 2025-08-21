import { Link, useLocation } from 'wouter';
import { UserCheck, UserPlus, Search } from 'lucide-react';

const Navigation = () => {
  const [location] = useLocation();

  const navItems = [
    { path: '/verification', label: 'Verification', icon: UserCheck },
    { path: '/registration', label: 'Registration', icon: UserPlus },
    { path: '/admin', label: 'Admin', icon: Search }
  ];

  return (
    <nav className="bg-white shadow-lg border-b-4 border-blue-500">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold text-gray-800">Training Portal</h1>
            <p className="text-sm text-gray-600">Verification & Enrollment System</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location === path || (path === '/verification' && location === '/');
              return (
                <Link
                  key={path}
                  href={path}
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;