import { Button } from '@/components/ui/button'
import {
  Book,
  Github,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'

export default function DocumentationPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <Navbar />

      {/* Coming Soon Section */}
      <section className='py-32 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10' />
        <div className='absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10' />
        <div className='absolute bottom-10 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10' />

        <div className='container mx-auto text-center'>
          <div className='w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8'>
            <Book className='w-12 h-12 text-primary' />
          </div>
          
          <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
            <Clock className='w-4 h-4 mr-2' />
            <span className='text-xs font-medium'>Coming Soon</span>
          </div>
          
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6'>
            Documentation
            <span className='block text-primary'>Coming Soon</span>
          </h1>
          
          <p className='text-xl text-muted-foreground mb-8 max-w-3xl mx-auto'>
            We&apos;re working hard to create comprehensive documentation for Voxora. 
            In the meantime, you can explore the source code on GitHub or join our community for support.
          </p>
          
          <div className='flex flex-col sm:flex-row gap-4 justify-center mb-12'>
            <Button size='lg' className='shadow-xl' asChild>
              <Link href='https://github.com/voxora-cloud/voxora'>
                <Github className='mr-2 h-4 w-4 inline-flex items-center' />
                View on GitHub
              </Link>
            </Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='/Community'>Join Community</Link>
            </Button>
          </div>

          <div className='max-w-2xl mx-auto bg-muted/50 rounded-xl p-8 border border-border'>
            <h3 className='text-xl font-semibold text-foreground mb-4'>
              Get Notified When Documentation is Ready
            </h3>
            <p className='text-muted-foreground mb-6'>
              Want to be the first to know when our documentation goes live? 
              Follow us on GitHub or join our Discord community for updates.
            </p>
            <div className='flex flex-col sm:flex-row gap-3 justify-center'>
              <Button variant='outline' asChild>
                <Link href='https://github.com/voxora-cloud/voxora'>
                  <Github className='mr-2 h-4 w-4 inline-flex items-center'  />
                  Star on GitHub
                </Link>
              </Button>
              <Button variant='outline' asChild>
                <Link href='/Community'>Join Discord</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
