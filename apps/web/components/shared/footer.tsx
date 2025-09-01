import Link from 'next/link'

interface FooterProps {
  className?: string
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`border-t border-border bg-muted/30 py-12 ${className}`}>
      <div className='container mx-auto px-4 text-center'>
        <Link href='/' className='inline-flex items-center space-x-2 mb-4'>
          <div className='w-8 h-8 bg-gradient-to-br from-primary to-accent rounded flex items-center justify-center'>
            <span className='text-sm font-bold text-primary-foreground'>V</span>
          </div>
          <span className='font-bold text-foreground text-lg'>Voxora</span>
        </Link>
        <p className='text-sm text-muted-foreground'>
          &copy; 2025 Voxora. All rights reserved. Made with ❤️ by the open source community.
        </p>
      </div>
    </footer>
  )
}
