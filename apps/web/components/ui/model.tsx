import { X } from "lucide-react"
import { Button } from "./button"

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(249, 250, 251, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '448px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}
        >
          <h2 
            style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: 0
            }}
          >
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X style={{ height: '16px', width: '16px' }} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default Modal;