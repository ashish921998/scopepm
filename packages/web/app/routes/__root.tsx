import { createRootRoute, Outlet } from '@tanstack/react-router'
import '@knadh/oat/oat.min.css'
import '../styles/landing.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
