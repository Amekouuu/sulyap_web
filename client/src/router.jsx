import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicShell } from './layouts/PublicShell';
import { AuthLayout } from './layouts/AuthLayout';
import { ContributionsLayout } from './layouts/ContributionsLayout';
import { AdminShell } from './layouts/AdminShell';
import { OfficerShell } from './layouts/OfficerShell';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFound } from './pages/NotFound';

// Every page of the system. Pages not built yet show which phase builds them.
const soon = (title, phase, note, options) => (
  <PlaceholderPage title={title} phase={phase} note={note} {...options} />
);
const inShell = { contained: false };
const inContributions = { contained: false, showTitle: false };

const devRoutes = import.meta.env.DEV
  ? [
      {
        path: 'dev/components',
        lazy: () =>
          import('./pages/dev/ComponentGallery.jsx').then((m) => ({
            Component: m.ComponentGallery,
          })),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    element: <PublicShell />,
    children: [
      {
        index: true,
        element: soon('Home', 'B2', 'Recently endorsed destinations, search, and categories.'),
      },
      {
        path: 'destinations',
        element: soon('Destinations', 'B2', 'Search and filter endorsed destinations.'),
      },
      {
        path: 'destinations/:destinationId',
        element: soon(
          'Destination',
          'B2',
          'Photos, details, reviews, map, and similar destinations.',
        ),
      },
      {
        path: 'map',
        element: soon(
          'Interactive Map',
          'B2 and B6',
          'Pampanga-only map, Nearby, and Similar Places.',
        ),
      },
      {
        path: 'nominate',
        element: soon(
          'Nominate a New Destination',
          'B3',
          'Nomination form with a map pin and photos.',
        ),
      },
      {
        path: 'nominate/:destinationId/edit',
        element: soon('Edit Nomination', 'B3', 'Edit a draft or returned nomination.'),
      },
      {
        path: 'contribute',
        element: <ContributionsLayout />,
        children: [
          { index: true, element: <Navigate to="reviews" replace /> },
          {
            path: 'reviews',
            handle: { title: 'My Reviews' },
            element: soon(
              'My Reviews',
              'B3',
              'Your reviews and their moderation status.',
              inContributions,
            ),
          },
          {
            path: 'nominations',
            handle: { title: 'My Nominations' },
            element: soon(
              'My Nominations',
              'B3',
              'Your nominations and where each one is.',
              inContributions,
            ),
          },
        ],
      },
      {
        path: 'account',
        element: soon('Account Settings', 'B1', 'Valid ID upload and the newsletter option.'),
      },
      {
        path: 'notifications',
        element: soon('Notifications', 'B7', 'Updates on your account and submissions.'),
      },
      {
        path: 'newsletter/unsubscribe',
        element: soon('Newsletter', 'B7', 'One-click unsubscribe.'),
      },
      ...devRoutes,
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: soon('Log in', 'B1', 'E-mail and password login.', inShell) },
      { path: 'signup', element: soon('Create an account', 'B1', 'Registration form.', inShell) },
      {
        path: 'check-email',
        element: soon(
          'Check your inbox',
          'B1',
          'Sent after sign-up, with a resend button.',
          inShell,
        ),
      },
      {
        path: 'verify-email',
        element: soon(
          'Verify your e-mail',
          'B1',
          'Landing page for the verification link.',
          inShell,
        ),
      },
      {
        path: 'upload-id',
        element: soon('Upload your valid ID', 'B1', 'ID type and front photo.', inShell),
      },
    ],
  },
  {
    path: 'admin',
    element: <AdminShell />,
    children: [
      {
        index: true,
        element: soon('Dashboard', 'B4', 'Counts, pending actions, and recent activity.', inShell),
      },
      {
        path: 'destinations',
        element: soon('Destinations', 'B4', 'Screen nominations and route them.', inShell),
      },
      {
        path: 'destinations/:destinationId',
        element: soon('Screening', 'B4', 'Read-only nomination with screening decision.', inShell),
      },
      {
        path: 'community',
        element: soon('Community Content', 'B4', 'Approve or remove reviews and photos.', inShell),
      },
      {
        path: 'reports',
        element: soon('Reports', 'B4', 'Reports from registered users.', inShell),
      },
      {
        path: 'reports/:reportId',
        element: soon('Report', 'B4', 'Resolve or dismiss a report.', inShell),
      },
      {
        path: 'users',
        element: soon('Users', 'B1', 'Accounts, suspension, and officer jurisdictions.', inShell),
      },
      {
        path: 'id-verification',
        element: soon('ID Verification', 'B1', 'Pending ID checks.', inShell),
      },
      {
        path: 'id-verification/:userId',
        element: soon('ID Verification', 'B1', 'Verify or reject one ID.', inShell),
      },
      {
        path: 'screening-lists',
        element: soon('Screening Lists', 'B4', 'Prohibited terms and known destinations.', inShell),
      },
      {
        path: 'notifications',
        element: soon('Notifications', 'B7', 'New nominations and other updates.', inShell),
      },
    ],
  },
  {
    path: 'officer',
    element: <OfficerShell />,
    children: [
      {
        index: true,
        element: soon(
          'Assigned Submissions',
          'B5',
          'Nominations routed to your jurisdictions.',
          inShell,
        ),
      },
      {
        path: 'submissions/:destinationId',
        element: soon('Review Submission', 'B5', 'Criteria checklist and decision.', inShell),
      },
      {
        path: 'reviewed',
        element: soon('Reviewed Submissions', 'B5', 'Submissions you have decided on.', inShell),
      },
      {
        path: 'notifications',
        element: soon('Notifications', 'B7', 'Nominations routed to you.', inShell),
      },
    ],
  },
  { path: '*', element: <PublicShell />, children: [{ path: '*', element: <NotFound /> }] },
]);
