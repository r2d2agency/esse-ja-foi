import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/comprador/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/comprador/"!</div>
}
