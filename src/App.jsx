import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Shop from './pages/Shop'
import Landing from './pages/Landing'
import InstallButton from './components/InstallButton'
import SplashScreen from './components/SplashScreen'

const Protected = ({children}) => localStorage.getItem('pharmacy_id') ? children : <Navigate to="/login" replace />

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/p/:username" element={<Shop />} />
      <Route path="/install" element={<InstallButton />} />
      <Route path="/splash" element={<SplashScreen />} />
    </Routes>
  )
}