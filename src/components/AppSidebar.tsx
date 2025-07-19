import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  MessageSquare, 
  Camera, 
  Settings, 
  User,
  BarChart3,
  Users,
  Calendar,
  Bell,
  Sprout,
  Bug,
  Brain,
  Bot,
  GraduationCap
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';

const items = [
  { title: 'Dashboard', url: '/dashboard', icon: Home, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Chat Assistant', url: '/chat', icon: MessageSquare, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Plant ID', url: '/identify', icon: Camera, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Disease Detection', url: '/disease-identification', icon: Bug, roles: ['farmer', 'expert', 'admin'], badge: 'New' },
  { title: 'Smart Crop Recommender', url: '/smart-crop-recommender', icon: Brain, roles: ['farmer', 'expert', 'admin'], badge: 'AI' },
  { title: 'Automated Farm Scheduling', url: '/automated-farm-scheduling', icon: Bot, roles: ['farmer', 'expert', 'admin'], badge: 'AI' },
  { title: 'Farmer Learning Agent', url: '/farmer-learning-agent', icon: GraduationCap, roles: ['farmer', 'expert', 'admin'], badge: 'AI' },
  { title: 'Community', url: '/community', icon: Users, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Analytics', url: '/analytics', icon: BarChart3, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Calendar', url: '/calendar', icon: Calendar, roles: ['farmer', 'expert', 'admin'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['farmer', 'expert', 'admin'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  
  const filteredItems = items.filter(item => 
    !item.roles || item.roles.includes(profile?.role || 'farmer')
  );

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        {/* Logo Section */}
        {!isCollapsed && (
          <div className="p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-primary">FarmAI</h1>
                <p className="text-xs text-muted-foreground">Assistant</p>
              </div>
            </div>
          </div>
        )}

        {/* User Profile */}
        {!isCollapsed && (
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {profile?.full_name || 'User'}
                </p>
                <Badge variant="outline" className="text-xs capitalize">
                  {profile?.role || 'farmer'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <div className="flex items-center justify-between w-full">
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats for Farmers */}
        {!isCollapsed && profile?.role === 'farmer' && profile.crop_types && profile.crop_types.length > 0 && (
          <div className="p-4 border-t mt-auto">
            <h4 className="text-sm font-semibold text-primary mb-2">Your Crops</h4>
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
      </SidebarContent>
    </Sidebar>
  );
}