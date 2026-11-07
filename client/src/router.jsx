import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicShell } from './layouts/PublicShell';
import { AuthLayout } from './layouts/AuthLayout';
import { ContributionsLayout } from './layouts/ContributionsLayout';
import { AdminShell } from './layouts/AdminShell';
import { OfficerShell } from './layouts/OfficerShell';
import { GuestOnly, RequireRole } from './components/RequireRole';
import { NotFound } from './pages/NotFound';
import { HomePage } from './pages/public/HomePage';
import { DestinationsPage } from './pages/public/DestinationsPage';
import { DestinationPage } from './pages/public/DestinationPage';
import { MapPage } from './pages/public/MapPage';
import { NominatePage } from './pages/contribute/NominatePage';
import { MyNominationsPage } from './pages/contribute/MyNominationsPage';
import { MyReviewsPage } from './pages/contribute/MyReviewsPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { AdminDestinationsPage } from './pages/admin/AdminDestinationsPage';
import { ScreeningPage } from './pages/admin/ScreeningPage';
import { CommunityPage } from './pages/admin/CommunityPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { ReportDetailPage } from './pages/admin/ReportDetailPage';
import { ScreeningListsPage } from './pages/admin/ScreeningListsPage';
import {
  OfficerReviewPage,
  OfficerReviewedPage,
  OfficerSubmissionsPage,
} from './pages/officer/OfficerPages';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { CheckEmailPage } from './pages/auth/CheckEmailPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { UploadIdPage } from './pages/auth/UploadIdPage';
import { AccountSettingsPage } from './pages/account/AccountSettingsPage';
import { NotificationsPage } from './pages/account/NotificationsPage';
import { UnsubscribePage } from './pages/account/UnsubscribePage';
import { UsersPage } from './pages/admin/UsersPage';
import { IdVerificationListPage } from './pages/admin/IdVerificationListPage';
import { IdVerificationDetailPage } from './pages/admin/IdVerificationDetailPage';

// Every page of the system.
// RequireRole only hides pages; the API checks every request again.
const registeredOnly = (element) => (
  <RequireRole roles={['registered_user']}>{element}</RequireRole>
);

const devRoutes = import.meta.env.DEV
  ? [
      {
        path: 'dev/components',
        lazy: () =>
          import('./pages/dev/ComponentGallery.jsx').then((m) => ({
            Component: m.ComponentGallery,
          })),
      },
      {
        path: 'dev/outbox',
        lazy: () => import('./pages/dev/OutboxPage.jsx').then((m) => ({ Component: m.OutboxPage })),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'destinations', element: <DestinationsPage /> },
      { path: 'destinations/:destinationId', element: <DestinationPage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'nominate', element: registeredOnly(<NominatePage />) },
      { path: 'nominate/:destinationId/edit', element: registeredOnly(<NominatePage />) },
      {
        path: 'contribute',
        element: registeredOnly(<ContributionsLayout />),
        children: [
          { index: true, element: <Navigate to="reviews" replace /> },
          { path: 'reviews', handle: { title: 'My Reviews' }, element: <MyReviewsPage /> },
          {
            path: 'nominations',
            handle: { title: 'My Nominations' },
            element: <MyNominationsPage />,
          },
        ],
      },
      {
        path: 'account',
        element: (
          <RequireRole>
            <AccountSettingsPage />
          </RequireRole>
        ),
      },
      {
        path: 'notifications',
        element: (
          <RequireRole>
            <NotificationsPage />
          </RequireRole>
        ),
      },
      {
        path: 'newsletter/unsubscribe',
        element: <UnsubscribePage />,
      },
      ...devRoutes,
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: (
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        ),
      },
      {
        path: 'signup',
        element: (
          <GuestOnly>
            <SignupPage />
          </GuestOnly>
        ),
      },
      { path: 'check-email', element: <CheckEmailPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'upload-id', element: registeredOnly(<UploadIdPage />) },
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
      { index: true, element: <DashboardPage /> },
      { path: 'destinations', element: <AdminDestinationsPage /> },
      { path: 'destinations/:destinationId', element: <ScreeningPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/:reportId', element: <ReportDetailPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'id-verification', element: <IdVerificationListPage /> },
      { path: 'id-verification/:userId', element: <IdVerificationDetailPage /> },
      { path: 'screening-lists', element: <ScreeningListsPage /> },
      {
        path: 'notifications',
        element: <NotificationsPage contained={false} />,
      },
      { path: 'account', element: <AccountSettingsPage contained={false} /> },
    ],
  },
  {
    path: 'officer',
    element: (
      <RequireRole roles={['tourism_officer']}>
        <OfficerShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <OfficerSubmissionsPage /> },
      { path: 'submissions/:destinationId', element: <OfficerReviewPage /> },
      { path: 'reviewed', element: <OfficerReviewedPage /> },
      {
        path: 'notifications',
        element: <NotificationsPage contained={false} />,
      },
      { path: 'account', element: <AccountSettingsPage contained={false} /> },
    ],
  },
  { path: '*', element: <PublicShell />, children: [{ path: '*', element: <NotFound /> }] },
]);
