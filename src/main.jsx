import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import About from './pages/About';
import Classes from './pages/Classes';
import Events from './pages/Events';
import Instructors from './pages/Instructors';
import FAQs from './pages/FAQs';
import GoToChoreo from './pages/GoToChoreo';
import NotFound from './pages/NotFound';
import Shop from './pages/Shop'
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <About />,
      },
      {
        path: '/Classes',
        element: <Classes />,
      },
      {
        path: '/Events',
        element: <Events />,
      },
      {
        path: '/Instructors',
        element: <Instructors />,
      },
      {
        path: '/FAQs',
        element: <FAQs />,
      },
      {
        path: '/admin',
        element: <GoToChoreo to='desk' />, // straight to check-in, like the old admin page
      },
      {
        path: '/invoice/:invoiceId',
        element: <GoToChoreo to='invoice' />,
      },
      
      { path: 'Shop',
        element: <Shop /> },
      // Invoices are managed in Choreo now (Dashboard > Invoices).
      { path: '/invoices', element: <GoToChoreo to='owner' /> },
      // Anything else: a friendly "Page not found" (keeps the menu).
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    path: '/kiosk',
    element: <GoToChoreo to='kiosk' />,
  },
  {
    path: '/owner',
    element: <GoToChoreo to='owner' />,
  },
]);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)