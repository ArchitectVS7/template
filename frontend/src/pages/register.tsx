import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { RegisterForm } from '@/components/auth/register-form'
import { useAuth } from '@/contexts/auth-context'

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth()
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleRegister = async (userData: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => {
    setIsLoading(true)
    setError('')
    try {
      await register(userData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
            Create your account to get started
          </p>
        </div>
        <RegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}