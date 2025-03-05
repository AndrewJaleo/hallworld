import { createRouter, Route, RootRoute } from '@tanstack/react-router';
import App from './App';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { ProfileViewPage } from './pages/ProfileViewPage';
import { ChatPage } from './pages/ChatPage';
import { GroupChatPage } from './pages/GroupChatPage';

// Create the root route
const rootRoute = new RootRoute({
  component: App,
});

// Create the index route
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// Create the profile route
const profileRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

// Create the profile view route
const profileViewRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/profile/$id',
  component: ProfileViewPage,
});

// Create the chat route
const chatRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/chat/$id',
  component: ChatPage,
});

// Create the group chat route
const groupChatRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/group-chat/$id',
  component: GroupChatPage,
});

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  profileRoute,
  profileViewRoute,
  chatRoute,
  groupChatRoute,
]);

// Create and export the router
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router types
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}