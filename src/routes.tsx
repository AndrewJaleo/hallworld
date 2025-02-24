import { createRouter, Route, RootRoute } from '@tanstack/react-router';
import App from './App';
import { ProfilePage } from './pages/ProfilePage';

const rootRoute = new RootRoute({
  component: App,
})

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
})

const profileRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

const routeTree = rootRoute.addChildren([indexRoute, profileRoute]);

export const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}