// pages/index.tsx
import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import Workflows from '@/components/admin/Workflows';

const Admin: React.FC = () => {
  return (
    <AdminLayout>
      <Workflows/>
    </AdminLayout>
  );
};

export default Admin;
