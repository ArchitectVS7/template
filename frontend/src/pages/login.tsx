import { useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/contexts/auth-context'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">AI Development MVP</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}