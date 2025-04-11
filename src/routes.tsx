import { createRouter, Route, RootRoute } from '@tanstack/react-router';
import App from './App';
import { MainLayout } from './layouts';
import { 
  HomePage, 
  ProfilePage, 
  ProfileViewPage, 
  ChatPage, 
  GroupChatPage,
  MessagesPage
} from './pages';

// Create the root route
const rootRoute = new RootRoute({
  component: App,
});

// Create a layout route
const layoutRoute = new Route({
  getParentRoute: () => rootRoute,
  id: 'layout',
  component: MainLayout,
});

// Create the index route
const indexRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: HomePage,
});

// Create the profile route
const profileRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/profile',
  component: ProfilePage,
});

// Create the profile view route
const profileViewRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/profile/$id',
  component: ProfileViewPage,
});

// Create the chat route
const chatRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/chat/$id',
  component: ChatPage,
});

// Create the group chat route
const groupChatRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/group-chat/$id',
  component: GroupChatPage,
});

const messagesRoute = new Route({
  getParentRoute: () => layoutRoute,
  path: '/messages',
  component: MessagesPage,
});

// Create the route tree
const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([
    indexRoute,
    profileRoute,
    profileViewRoute,
    chatRoute,
    groupChatRoute,
    messagesRoute,
  ]),
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