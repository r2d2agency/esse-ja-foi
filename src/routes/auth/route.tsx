import { createFileRoute } from '@tanstack/react-router';
import LoginPage from './index';

export const Route = createFileRoute('/auth/')({
  component: LoginPage,
});
