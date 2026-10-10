import { createBrowserRouter, Navigate } from "react-router"
import OperatorPortal from "../App"
import Landing from "./Landing"
import PassengerPortal from "./PassengerPortal"
import ProtectedRoute from "../auth/ProtectedRoute"
import { OperatorLogin, PassengerLogin } from "./LoginPage"

export const router = createBrowserRouter([
  { path: "/", Component: Landing },
  { path: "/passenger/login", Component: PassengerLogin },
  { path: "/operator/login", Component: OperatorLogin },
  {
    element: <ProtectedRoute role="passenger" />,
    children: [
      { path: "/passenger", Component: PassengerPortal },
      { path: "/passenger/:section", Component: PassengerPortal },
    ],
  },
  {
    element: <ProtectedRoute role="operator" />,
    children: [
      { path: "/operator", Component: OperatorPortal },
      { path: "/operator/*", Component: OperatorPortal },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
])
