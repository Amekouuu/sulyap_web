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
import { About } from './pages/About'
import { Contact } from './pages/Contact'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { MyReviews } from './pages/MyReviews'
import { MyNominations } from './pages/MyNominations'

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
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      {
        path: 'me',
        element: (
          <RequireRole roles={['registered_user']}>
            <ContributionsLayout />
          </RequireRole>
        ),
        children: [
          { path: 'reviews', element: <MyReviews /> },
          { path: 'nominations', element: <MyNominations /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
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
