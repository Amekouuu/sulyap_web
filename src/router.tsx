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
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminDestinations } from './pages/admin/AdminDestinations'
import { ScreeningView } from './pages/admin/ScreeningView'
import { CommunityContent } from './pages/admin/CommunityContent'
import { AdminReports } from './pages/admin/AdminReports'
import { ReportDetail } from './pages/admin/ReportDetail'
import { AdminUsers } from './pages/admin/AdminUsers'
import { UserDetail } from './pages/admin/UserDetail'
import { Verification } from './pages/admin/Verification'
import { AssignedSubmissions } from './pages/lto/AssignedSubmissions'
import { ReviewSubmission } from './pages/lto/ReviewSubmission'
import { EndorsedSubmissions } from './pages/lto/EndorsedSubmissions'

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
            {stub('Nominate a Destination', 'phase 6b')}
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
      { index: true, element: <AdminDashboard /> },
      { path: 'destinations', element: <AdminDestinations /> },
      { path: 'destinations/:id', element: <ScreeningView /> },
      { path: 'community', element: <CommunityContent /> },
      { path: 'reports', element: <AdminReports /> },
      { path: 'reports/:id', element: <ReportDetail /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'users/:id', element: <UserDetail /> },
      { path: 'verification', element: <Verification /> },
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
      { index: true, element: <AssignedSubmissions /> },
      { path: 'submissions', element: <AssignedSubmissions /> },
      { path: 'submissions/:id', element: <ReviewSubmission /> },
      { path: 'endorsed', element: <EndorsedSubmissions /> },
    ],
  },
])
