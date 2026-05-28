import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../contexts/AuthContext.jsx";

function CustomerLayout({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { name: "Home", path: "/home" },
    { name: "Explore", path: "/explore" },
    { name: "My Queues", path: "/home" },
  ];

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-[#e5e5e5] transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-6 border-b border-[#e5e5e5]">
            <h1 className="text-xl font-bold text-[#333]">QueueApp</h1>
          </div>
          
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navItems.map((item, index) => {
              const isActive = item.name === "My Queues" 
                ? false 
                : location.pathname === item.path;

              return (
                <Link
                  key={index}
                  to={item.path}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#333] text-white"
                      : "text-[#555] hover:bg-[#f5f5f5] hover:text-[#333]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
            
            {role === "admin" && (
              <Link
                to="/admin"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#555] hover:bg-[#f5f5f5] hover:text-[#333] transition-colors mt-6"
              >
                Admin Dashboard
              </Link>
            )}
          </nav>
          
          <div className="border-t border-[#e5e5e5] p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="bg-white border-b border-[#e5e5e5] h-16 px-4 flex items-center justify-between md:hidden sticky top-0 z-30">
          <h1 className="text-lg font-bold text-[#333]">QueueApp</h1>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-[#555] hover:bg-[#f5f5f5] rounded-lg focus:outline-none"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 w-full bg-[#f5f5f5]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CustomerLayout;
