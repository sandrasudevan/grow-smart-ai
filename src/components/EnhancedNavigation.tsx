import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  MessageSquare, 
  Camera, 
  Settings, 
  User,
  BarChart3,
  Users,
  Sprout,
  Calendar,
  Bell
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
  roles?: string[];
}

export const EnhancedNavigation: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Chat Assistant',
      href: '/?tab=chat',
      icon: MessageSquare,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Plant ID',
      href: '/?tab=identify',
      icon: Camera,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Community',
      href: '/community',
      icon: Users,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Calendar',
      href: '/calendar',
      icon: Calendar,
      roles: ['farmer', 'expert', 'admin']
    },
    {
      name: 'Expert Console',
      href: '/expert/console',
      icon: Users,
      badge: '12',
      roles: ['expert']
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['farmer', 'expert', 'admin']
    }
  ];

  const filteredItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(profile?.role || 'farmer')
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (href.includes('?tab=')) {
      return location.pathname === '/' && location.search.includes(href.split('?')[1]);
    }
    return location.pathname === href;
  };

  return (
    <nav className="bg-white border-r border-gray-200 w-64 fixed left-0 top-0 h-full z-40 overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sprout className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              FarmAI
            </h1>
            <p className="text-xs text-gray-600">Assistant</p>
          </div>
        </Link>

        {/* User Info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{profile?.full_name?.split(' ')[0] || 'User'}</p>
              <Badge variant="outline" className="text-xs capitalize">
                {profile?.role || 'farmer'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Navigation
          </p>
          {filteredItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        {profile?.role === 'farmer' && profile.crop_types && profile.crop_types.length > 0 && (
          <div className="mt-8 p-4 bg-emerald-50 rounded-lg">
            <h4 className="text-sm font-semibold text-emerald-800 mb-2">Your Crops</h4>
            <div className="flex flex-wrap gap-1">
              {profile.crop_types.slice(0, 3).map((crop, index) => (
                <Badge key={index} variant="outline" className="text-xs capitalize">
                  {crop}
                </Badge>
              ))}
              {profile.crop_types.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.crop_types.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};