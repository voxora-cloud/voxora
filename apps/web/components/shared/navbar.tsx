'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavbarProps {
  className?: string
}

export function Navbar({ className = '' }: NavbarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    { href: '/Features', label: 'Features' },
    { href: '/Pricing', label: 'Pricing' },
    { href: '/About', label: 'About' },
    { href: '/Documentation', label: 'Documentation' },
    { href: '/Community', label: 'Community' }
  ]

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${className}`}>
      <div className='container flex h-20 items-center justify-between px-4'>
        <Link href='/' className='flex items-center space-x-3'>
          <div className='w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20'>
            <span className='text-lg font-bold text-primary-foreground'>V</span>
          </div>
          <span className='text-xl font-bold text-foreground'>Voxora</span>
        </Link>

        <nav className='hidden md:flex items-center space-x-8'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all ${
                isActive(item.href)
                  ? 'text-primary after:w-full'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className='flex items-center space-x-3'>
          <Button variant='ghost' className='hidden sm:flex' asChild>
            <Link href='/admin-login'>Sign in</Link>
          </Button>
          <Button className='shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow' asChild>
            <Link href='/admin-signup'>Start for Free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
