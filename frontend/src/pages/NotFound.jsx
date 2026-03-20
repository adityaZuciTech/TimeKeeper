import { useNavigate } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={40} className="text-muted-foreground" />
        </div>
        <h1 className="text-5xl font-heading font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-heading font-semibold text-foreground mb-3">Page not found</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Home size={16} />
          Back to Home
        </button>
      </div>
    </div>
  )
}
