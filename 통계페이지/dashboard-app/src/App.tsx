import { useState } from 'react'
import Dashboard from './Dashboard'
import Login from './Login'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <>
      {isLoggedIn ? (
        <Dashboard />
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  )
}

export default App
