import { createBrowserRouter, Navigate } from 'react-router';
import ChatPage from '@/app/views/chat/page';
import NewChatPage from '@/app/views/new-chat/page';
import ViewsLayout from '@/app/views/layout';

export const NEW_CHAT_ROUTE = '/';
export const chatRoute = (chatId: string) => `/chat/${chatId}`;

export const router = createBrowserRouter([
  {
    element: <ViewsLayout />,
    children: [
      {
        path: NEW_CHAT_ROUTE,
        element: <NewChatPage />
      },
      {
        path: '/chat/:chatId',
        element: <ChatPage />
      },
      {
        path: '*',
        element: <Navigate to={NEW_CHAT_ROUTE} replace />
      }
    ]
  }
]);
