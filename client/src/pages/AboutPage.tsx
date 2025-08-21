import { Users, Award, BookOpen, Target, Shield, CheckCircle } from 'lucide-react';

const AboutPage = () => {
  const features = [
    {
      icon: <Award className="w-8 h-8 text-blue-600" />,
      title: "Certified Training",
      description: "Government-approved driving training programs with certified instructors"
    },
    {
      icon: <BookOpen className="w-8 h-8 text-green-600" />,
      title: "Comprehensive Curriculum",
      description: "Complete theoretical and practical training for all vehicle categories"
    },
    {
      icon: <Target className="w-8 h-8 text-purple-600" />,
      title: "High Success Rate",
      description: "95% pass rate with our structured training methodology"
    },
    {
      icon: <Shield className="w-8 h-8 text-red-600" />,
      title: "Safety First",
      description: "Emphasis on road safety and defensive driving techniques"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Candidates Trained" },
    { number: "50+", label: "Certified Instructors" },
    { number: "25+", label: "Training Centers" },
    { number: "95%", label: "Success Rate" }
  ];

  return (
    <div className="min-h-screen relative" style={{backgroundImage: 'url(/images/Aboutus.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Users className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">About Our Training Portal</h1>
          <p className="text-xl text-white max-w-3xl mx-auto">
            India's leading digital platform for driving training verification and enrollment, 
            committed to creating safe and skilled drivers for our roads.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-gray-600 mb-4">
                To revolutionize driving education in India through digital innovation, ensuring every 
                candidate receives world-class training that prioritizes safety, skill development, and 
                responsible driving practices.
              </p>
              <p className="text-gray-600 mb-6">
                We bridge the gap between traditional driving instruction and modern learning methodologies, 
                making quality driving education accessible to candidates across all vehicle categories.
              </p>
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Government Approved & Certified</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Training Categories */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Training Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Category 1</h3>
              <p className="text-sm text-blue-600">Two Wheeler (Motorcycle)</p>
              <p className="text-xs text-gray-600 mt-2">3 months duration</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Category 2</h3>
              <p className="text-sm text-green-600">Light Motor Vehicle</p>
              <p className="text-xs text-gray-600 mt-2">4 months duration</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Category 3</h3>
              <p className="text-sm text-purple-600">Heavy Vehicle</p>
              <p className="text-xs text-gray-600 mt-2">6 months duration</p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Category 4</h3>
              <p className="text-sm text-orange-600">Commercial Vehicle</p>
              <p className="text-xs text-gray-600 mt-2">2 months duration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;