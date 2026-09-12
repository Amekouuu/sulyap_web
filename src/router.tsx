import { createBrowserRouter } from 'react-router-dom'
import { PublicShell } from './layouts/PublicShell'
import { AuthLayout } from './layouts/AuthLayout'
import { AdminShell } from './layouts/AdminShell'
import { LTOShell } from './layouts/LTOShell'
import { ContributionsLayout } from './layouts/ContributionsLayout'
import { Placeholder } from './components/Placeholder'
import { RequireRole } from './components/RequireRole'
import { NotFound } from './pages/NotFound'
import { Home } from './pages/Home'
import { Destinations } from './pages/Destinations'
import { DestinationDetail } from './pages/DestinationDetail'

const stub = (title: string, phase: string) => (
  <Placeholder title={title} phase={phase} />
)

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'destinations', element: <Destinations /> },
      { path: 'destinations/:id', element: <DestinationDetail /> },
      { path: 'map', element: stub('Interactive Map', 'phase 8') },
      {
        path: 'nominate',
        element: (
          <RequireRole roles={['registered_user']}>
            {stub('Nominate a Destination', 'phase 5')}
          </RequireRole>
        ),
      },
      { path: 'about', element: stub('About Sulyap', 'phase 5') },
      { path: 'contact', element: stub('Contact', 'phase 5') },
      {
        path: 'me',
        element: (
          <RequireRole roles={['registered_user']}>
            <ContributionsLayout />
          </RequireRole>
        ),
        children: [
          { path: 'reviews', element: stub('My Reviews', 'phase 5') },
          { path: 'nominations', element: stub('My Nominations', 'phase 5') },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: stub('Log in', 'phase 5') },
      { path: 'signup', element: stub('Sign up', 'phase 5') },
    ],
  },
  {
    path: 'admin',
    element: (
      <RequireRole roles={['administrator']}>
        <AdminShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: stub('Dashboard', 'phase 6') },
      { path: 'destinations', element: stub('Destinations', 'phase 6') },
      {
        path: 'destinations/:id',
        // Awaiting the owner's mockup - VERIFY / RETURN / REJECT, read-only content.
        element: stub('Screening View', 'a pending mockup'),
      },
      { path: 'community', element: stub('Community Content', 'phase 6') },
      { path: 'reports', element: stub('Reports', 'phase 6') },
      { path: 'reports/:id', element: stub('Report Detail', 'phase 6') },
      { path: 'users', element: stub('Users', 'phase 6') },
      { path: 'users/:id', element: stub('User Detail', 'phase 6') },
      { path: 'verification', element: stub('Verification Log', 'phase 6') },
    ],
  },
  {
    path: 'lto',
    element: (
      <RequireRole roles={['tourism_officer']}>
        <LTOShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: stub('Assigned Submissions', 'phase 7') },
      { path: 'submissions', element: stub('Assigned Submissions', 'phase 7') },
      {
        path: 'submissions/:id',
        element: stub('Review Submission', 'phase 7'),
      },
      { path: 'endorsed', element: stub('Endorsed', 'phase 7') },
    ],
  },
])
