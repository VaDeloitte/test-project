// components/admin/Layout.tsx
import React, { ReactNode } from 'react';
import Sidebar from '@/components/admin/Sidebar';
import Content from '@/components/admin/Content';
import WithAuthorization from '../hoc/WithAuthorization';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
    {
      title: 'Agents',
      icon: 'bi bi-house-door-fill',
      isActive: true,
    }
  ];

const AdminLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex light">
        <Sidebar menuItems={menuItems} />
      <div className="flex-1 pl-6">
        <Content>{children}</Content>
      </div>
    </div>
  );
};

export default WithAuthorization(AdminLayout);
