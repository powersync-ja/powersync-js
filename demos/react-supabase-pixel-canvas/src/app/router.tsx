import { createBrowserRouter } from 'react-router-dom';

import BoothPage from '@/app/booth/page';
import DrawPage from '@/app/draw/page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <BoothPage />
  },
  {
    path: '/draw',
    element: <DrawPage />
  }
]);
