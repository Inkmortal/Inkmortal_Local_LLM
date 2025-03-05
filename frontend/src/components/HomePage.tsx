import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/Button';
import Card from './ui/Card';
import ThemeSelector from './ui/ThemeSelector';
import ROUTES from '../routes.constants';

const HomePage: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  
  // Feature cards data
  const features = [
    {
      title: "Math Problem Solving",
      description: "Get step-by-step solutions for math problems with clear explanations and LaTeX rendering.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Coding Assistance",
      description: "Learn programming concepts with interactive examples and syntax highlighting for multiple languages.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      title: "Textbook Helpers",
      description: "Upload textbook images and get explanations, summaries, and in-depth understanding of the content.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    }
  ];
  
  // Dynamic background with floating blobs that follow the theme
  useEffect(() => {
    // Create style for animated orbs in background
    const style = document.createElement('style');
    style.textContent = `
      @keyframes float1 {
        0% { transform: translate(0, 0) rotate(0deg); }
        50% { transform: translate(-15px, -15px) rotate(180deg); }
        100% { transform: translate(0, 0) rotate(360deg); }
      }
      @keyframes float2 {
        0% { transform: translate(0, 0) rotate(0deg); }
        50% { transform: translate(20px, 10px) rotate(-180deg); }
        100% { transform: translate(0, 0) rotate(-360deg); }
      }
      @keyframes float3 {
        0% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-5px, 20px) scale(1.1); }
        100% { transform: translate(0, 0) scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-float"
          style={{ 
            background: `radial-gradient(circle at center, ${currentTheme.colors.accentPrimary}, transparent 70%)`,
            animation: 'float1 25s infinite ease-in-out',
          }}
        />
        <div
          className="absolute bottom-20 -right-20 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ 
            background: `radial-gradient(circle at center, ${currentTheme.colors.accentSecondary}, transparent 70%)`,
            animation: 'float2 30s infinite ease-in-out',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5 blur-3xl"
          style={{ 
            background: `radial-gradient(circle at center, ${currentTheme.colors.textPrimary}, transparent 70%)`,
            animation: 'float3 40s infinite ease-in-out',
          }}
        />
      </div>
      
      {/* Modern Navbar */}
      <nav 
        className="modern-navbar glass-effect sticky top-0 z-20 flex justify-between items-center"
        style={{ 
          backgroundColor: `${currentTheme.colors.bgPrimary}90`,
          borderColor: `${currentTheme.colors.borderColor}30`
        }}
      >
        <div className="flex items-center space-x-2">
          <svg 
            className="w-8 h-8" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11l3 3m0 0l-3 3m3-3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>Seadragon</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            size="sm"
            variant="ghost"
            onClick={() => {
              // Check auth state before navigating
              const token = localStorage.getItem('authToken');
              if (token) {
                navigate(ROUTES.CHAT);
              } else {
                // Redirect to login with chat as destination
                navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHAT } });
              }
            }}
            className="hover-float transition-all duration-300"
          >
            Chat Now
          </Button>
          <Button 
            size="sm"
            variant="ghost"
            onClick={() => navigate(ROUTES.ADMIN.LOGIN)}
            className="hover-float transition-all duration-300"
          >
            Admin
          </Button>
          <ThemeSelector />
        </div>
      </nav>
      
      {/* Hero section */}
      <section className="hero-section pt-12 pb-24 px-4 relative z-10" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center">
          {/* Left column - text */}
          <div className="md:w-1/2 mb-12 md:mb-0 md:pr-12 animate-fade-in">
            <h1 
              className="hero-title mb-6 leading-tight"
              style={{ color: currentTheme.colors.accentPrimary }}
            >
              Your Educational
              <span
                className="relative block mt-2"
                style={{ color: currentTheme.colors.accentSecondary }}
              >
                AI Assistant
                <span 
                  className="absolute bottom-0 left-0 w-full h-2 rounded"
                  style={{ backgroundColor: `${currentTheme.colors.accentSecondary}30` }}
                />
              </span>
            </h1>
            
            <p 
              className="hero-subtitle mb-8"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Experience the power of Llama 3.3 70B in solving math problems, explaining code, and helping with textbook content in a conversational interface.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg"
                onClick={() => {
                  // Check auth state before navigating
                  const token = localStorage.getItem('authToken');
                  if (token) {
                    navigate(ROUTES.CHAT);
                  } else {
                    // Redirect to login with chat as destination
                    navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHAT } });
                  }
                }}
                className="button-shimmer group"
                style={{ 
                  borderRadius: '1.5rem',
                  padding: '0.75rem 2rem',
                }}
              >
                <span className="flex items-center">
                  Start Learning
                  <svg 
                    className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Button>
            </div>
          </div>
          
          {/* Right column - chat preview */}
          <div className="md:w-1/2 animate-slide-up">
            <div 
              className="glass-card overflow-hidden relative"
              style={{ 
                boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px ${currentTheme.colors.borderColor}30`
              }}
            >
              <div className="p-4 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#fc625d' }} />
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#fdbc40' }} />
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: '#34c749' }} />
                  <div className="flex-grow text-center text-sm font-medium">Seadragon Chat</div>
                </div>
              </div>
              
              <div className="p-4 h-[400px] overflow-y-auto modern-scrollbar">
                {/* Sample conversation */}
                <div className="flex justify-start mb-4 message-in">
                  <div 
                    className="message-bubble message-assistant"
                    style={{ 
                      backgroundColor: currentTheme.colors.bgSecondary,
                      border: `1px solid ${currentTheme.colors.borderColor}50`,
                      color: currentTheme.colors.textPrimary,
                    }}
                  >
                    <div>Hi there! I'm Seadragon, your educational assistant. What would you like to learn today?</div>
                  </div>
                </div>
                
                <div className="flex justify-end mb-4 message-out">
                  <div 
                    className="message-bubble message-user"
                    style={{ 
                      backgroundColor: currentTheme.colors.accentPrimary,
                      color: '#fff',
                    }}
                  >
                    <div>Can you help me solve a quadratic equation?</div>
                  </div>
                </div>
                
                <div className="flex justify-start mb-4 message-in">
                  <div 
                    className="message-bubble message-assistant"
                    style={{ 
                      backgroundColor: currentTheme.colors.bgSecondary,
                      border: `1px solid ${currentTheme.colors.borderColor}50`,
                      color: currentTheme.colors.textPrimary,
                    }}
                  >
                    <div>
                      Absolutely! I'd be happy to help you solve a quadratic equation. 
                      
                      A quadratic equation has the form: ax² + bx + c = 0
                      
                      We can solve it using the quadratic formula:
                      
                      x = (-b ± √(b² - 4ac)) / 2a
                      
                      Would you like to try with a specific equation?
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mb-4 message-out">
                  <div 
                    className="message-bubble message-user"
                    style={{ 
                      backgroundColor: currentTheme.colors.accentPrimary,
                      color: '#fff',
                    }}
                  >
                    <div>Yes, please solve x² - 4x + 3 = 0</div>
                  </div>
                </div>
                
                <div className="flex justify-start mb-4">
                  <div 
                    className="message-bubble message-assistant"
                    style={{ 
                      backgroundColor: currentTheme.colors.bgSecondary,
                      border: `1px solid ${currentTheme.colors.borderColor}50`,
                      color: currentTheme.colors.textPrimary,
                    }}
                  >
                    <div className="typing-indicator">
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
          <span 
            className="text-sm mb-2"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Scroll to explore
          </span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: currentTheme.colors.textSecondary }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>
      
      {/* Features section */}
      <section 
        className="py-20 px-4"
        style={{ backgroundColor: currentTheme.colors.bgPrimary }}
      >
        <div className="container mx-auto">
          <h2 
            className="text-3xl font-bold mb-12 text-center"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Educational Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card card-hover animate-slide-up"
                style={{ 
                  backgroundColor: currentTheme.colors.bgSecondary,
                  boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1), 0 0 0 1px ${currentTheme.colors.borderColor}30`
                }}
              >
                <div 
                  className="feature-icon"
                  style={{ backgroundColor: `${currentTheme.colors.accentPrimary}15` }}
                >
                  <div
                    className="p-2 rounded-full"
                    style={{ backgroundColor: `${currentTheme.colors.accentPrimary}20`, color: currentTheme.colors.accentPrimary }}
                  >
                    {feature.icon}
                  </div>
                </div>
                
                <h3 
                  className="feature-title" 
                  style={{ color: currentTheme.colors.accentPrimary }}
                >
                  {feature.title}
                </h3>
                
                <p 
                  className="feature-description"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  {feature.description}
                </p>
                
                <a 
                  className="inline-flex items-center text-sm font-medium mt-4 cursor-pointer hover:underline"
                  style={{ color: currentTheme.colors.accentPrimary }}
                  onClick={() => {
                    if (feature.title === "Rich Formatting") {
                      navigate('/rich-input-demo');
                    } else {
                      navigate(ROUTES.CHAT);
                    }
                  }}
                >
                  {feature.title === "Rich Formatting" ? "Try the demo" : "Try it now"}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section 
        className="py-20 px-4"
        style={{ 
          background: `linear-gradient(to bottom, ${currentTheme.colors.bgPrimary}, ${currentTheme.colors.bgSecondary})`
        }}
      >
        <div className="container mx-auto max-w-4xl">
          <h2 
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            About This Project
          </h2>
          
          <div 
            className="glass-card p-8 animate-fade-in"
          >
            <div className="prose max-w-none">
              <p className="text-lg mb-4" style={{ color: currentTheme.colors.textPrimary }}>
                This is a personal hobby project designed to run the <span style={{ color: currentTheme.colors.accentPrimary }}>Llama 3.3 70B model</span> on a Mac Mini M4 Pro,
                providing educational assistance through a beautiful and functional interface.
              </p>
              
              <p className="text-lg mb-4" style={{ color: currentTheme.colors.textPrimary }}>
                The system features a <span style={{ color: currentTheme.colors.accentSecondary }}>priority-based queue</span> to manage requests efficiently, allowing you to 
                integrate with coding tools, custom applications, and this web interface.
              </p>
              
              <p className="text-lg" style={{ color: currentTheme.colors.textPrimary }}>
                Currently in development, this project aims to create a "tutor-like" experience for 
                solving math problems, answering textbook questions, and providing coding assistance.
              </p>
            </div>
            
            <div className="mt-8 text-center">
              <Button
                size="lg"
                onClick={() => {
                  // Check auth state before navigating
                  const token = localStorage.getItem('authToken');
                  if (token) {
                    navigate(ROUTES.CHAT);
                  } else {
                    // Redirect to login with chat as destination
                    navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHAT } });
                  }
                }}
                className="button-shimmer"
              >
                Experience It Now
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer 
        className="modern-footer py-8 px-4"
        style={{ 
          backgroundColor: currentTheme.colors.bgSecondary,
          borderColor: currentTheme.colors.borderColor,
          color: currentTheme.colors.textMuted 
        }}
      >
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <svg 
              className="w-6 h-6 mr-2" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: currentTheme.colors.accentPrimary }}
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-medium">Seadragon LLM</span>
          </div>
          
          <p className="text-sm">
            Personal Educational AI Project | © {new Date().getFullYear()}
          </p>
          
          <div className="flex items-center mt-4 md:mt-0">
            <ThemeSelector />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;