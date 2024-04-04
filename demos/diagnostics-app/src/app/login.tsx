import React from 'react';
import { LoginDetailsWidget } from '@/components/widgets/LoginDetailsWidget';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_ENTRY_ROUTE } from '@/app/router';
import { connector } from '@/library/powersync/ConnectionManager';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <LoginDetailsWidget
      onSubmit={async (values) => {
        await connector.signIn(values);

        navigate(DEFAULT_ENTRY_ROUTE);
      }}
    />
  );
}
