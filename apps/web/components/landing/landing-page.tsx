import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  ArrowRight,
  CheckCircle,
  Bot,
  PhoneCall,
  BarChart3,
  Code2
} from 'lucide-react'
import Link from 'next/link'

export function LandingPage () {
  const features = [
    {
      icon: Bot,
      title: "AI-Powered Support",
      description:
      "Smart chat and voice agents powered by AI to handle customer queries instantly"
  },
  {
    icon: PhoneCall,
    title: "Voice & Chat Integration",
    description:
      "Seamlessly switch between live chat and voice support with WebRTC"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Track customer interactions, agent performance, and conversation insights in real-time"
  },
  {
    icon: Code2,
    title: "Open Source & Customizable",
    description:
      "Developer-friendly, fully customizable, and open-source at its core"
  }
];

const benefits = [
  "Real-time AI-powered Chat & Voice Support",
  "Seamless Integration with Modern Web Apps",
  "Scalable WebSocket & WebRTC Infrastructure",
  "Customizable & Developer-Friendly Open Source Core",
  "Built-in Support for Multi-channel Communication",
  "Advanced Analytics & Conversation Insights",
  "Secure & Privacy-Focused Architecture",
  "Mobile & Cross-Platform Ready"
];


  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container flex h-20 items-center justify-between px-4'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20'>
              <span className='text-lg font-bold text-primary-foreground'>
                V
              </span>
            </div>
            <span className='text-xl font-bold text-foreground'>Voxora</span>
          </div>

          <nav className='hidden md:flex items-center space-x-8'>
            <Link
              href='/Features'
              className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all'
            >
              Features
            </Link>
            <Link
              href='/Pricing'
              className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all'
            >
              Pricing
            </Link>
            <Link
              href='/About'
              className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all'
            >
              About
            </Link>
            <Link
              href='/Documentation'
              className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all'
            >
              Documentation
            </Link>
            <Link
              href='/Community'
              className='text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all'
            >
              Community
            </Link>
          </nav>

          <div className='flex items-center space-x-3'>
            <Button variant='ghost' className='hidden sm:flex' asChild>
              <Link href='/login'>Sign in</Link>
            </Button>
            <Button
              className='bg-gradient-to-r from-primary to-primary shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow'
              asChild
            >
              <Link href='/register'>Start for Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className='relative py-24 px-4 overflow-hidden'>
        {/* Background gradient and shapes */}
        <div className='absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10' />
        <div className='absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10' />
        <div className='absolute bottom-10 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10' />

        <div className='container mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>
            <div className='text-left'>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
                <span className='text-xs font-medium'>
                  New: Omnichannel Support
                </span>
              </div>
              <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight'>
                Real-time Chat & Voice Support
                <span className='block text-primary'>Made Simple</span>
              </h1>
              <p className='text-xl text-muted-foreground mt-6 mb-8 max-w-lg'>
                Connect with your customers instantly through our powerful,
                open-source chat support platform. Designed for teams who value
                speed, security, and simplicity.
              </p>
              <div className='flex flex-col sm:flex-row gap-4'>
                <Button size='lg' className='shadow-xl' asChild>
                  <Link
                    href='/register'
                    className='inline-flex items-center gap-2'
                  >
                    <span>Start Free</span>
                    <ArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
                <Button variant='outline' size='lg' asChild>
                  <Link href='/demo'>View Demo</Link>
                </Button>
              </div>

              {/* <div className='mt-8 flex items-center'>
                <div className='flex -space-x-2'>
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br ${
                        i === 0
                          ? 'from-blue-400 to-blue-600'
                          : i === 1
                          ? 'from-green-400 to-green-600'
                          : i === 2
                          ? 'from-amber-400 to-amber-600'
                          : 'from-purple-400 to-purple-600'
                      }`}
                    />
                  ))}
                </div>
                <div className='ml-4'>
                  <div className='font-medium'>Trusted by 2,000+ teams</div>
                  <div className='text-sm text-muted-foreground'>
                    From startups to enterprises
                  </div>
                </div>
              </div> */}
            </div>

            <div className='relative hidden lg:block'>
              <div className='absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl transform rotate-3' />
              <div className='relative bg-card rounded-xl shadow-2xl overflow-hidden border border-border'>
                <div className='p-4 bg-muted/50 border-b border-border flex items-center space-x-2'>
                  <div className='flex space-x-1.5'>
                    <div className='w-3 h-3 rounded-full bg-red-500' />
                    <div className='w-3 h-3 rounded-full bg-amber-500' />
                    <div className='w-3 h-3 rounded-full bg-green-500' />
                  </div>
                  <div className='text-xs font-medium'>
                    Voxora Chat Interface
                  </div>
                </div>
                <div className='p-6 space-y-4'>
                  <div className='bg-muted rounded-lg p-3 max-w-xs'>
                    <p className='text-sm'>Hi! How can I help you today?</p>
                    <span className='text-xs text-muted-foreground'>
                      Support Agent • 2m ago
                    </span>
                  </div>
                  <div className='bg-primary rounded-lg p-3 max-w-xs ml-auto text-primary-foreground'>
                    <p className='text-sm'>I need help setting up my account</p>
                    <span className='text-xs text-primary-foreground/80 text-right block'>
                      You • Just now
                    </span>
                  </div>
                  <div className='bg-muted rounded-lg p-3 max-w-xs animate-pulse'>
                    <div className='flex items-center space-x-2'>
                      <div className='w-2 h-2 bg-foreground/30 rounded-full animate-bounce' />
                      <div className='w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.2s]' />
                      <div className='w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.4s]' />
                      <span className='text-xs text-muted-foreground ml-1'>
                        Agent is typing...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id='features'
        className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'
      >
        <div className='container mx-auto'>
          <div className='text-center mb-16 max-w-3xl mx-auto'>
            <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
              <span className='text-xs font-medium'>Powerful Features</span>
            </div>
            <h2 className='text-3xl md:text-5xl font-bold text-foreground mb-6'>
              Why Teams Choose Voxora
            </h2>
            <p className='text-xl text-muted-foreground'>
              Built by developers, for teams who need reliable chat support
              without the complexity. Our platform combines ease of use with
              powerful capabilities.
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {features.map((feature, index) => (
              <Card
                key={index}
                className='group border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden'
              >
                <CardHeader className='pb-2'>
                  <div className='w-12 h-12 bg-primary/10 group-hover:bg-primary/20 transition-colors rounded-lg flex items-center justify-center mb-4'>
                    <feature.icon className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle className='text-xl group-hover:text-primary transition-colors'>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className='text-muted-foreground/90'>
                    {feature.description}
                  </CardDescription>
                </CardContent>
                <div className='h-1 w-0 group-hover:w-full bg-primary transition-all duration-300' />
              </Card>
            ))}
          </div>

          <div className='mt-16 text-center'>
            <Button
              variant='outline'
              className='rounded-full px-8 py-3'
              asChild
            >
              <Link href='/Features' className='inline-flex items-center justify-center'>
                <span>Explore All Features</span>
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className='py-24 px-4 relative'>
        <div className='absolute inset-0 bg-gradient-to-br from-background to-muted/20 -z-10' />
        <div className='absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10' />
        <div className='absolute top-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10' />

        <div className='container mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>
            <div>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
                <span className='text-xs font-medium'>Complete Toolset</span>
              </div>
              <h2 className='text-3xl md:text-5xl font-bold text-foreground mb-6'>
                Everything you need for exceptional support
              </h2>
              <p className='text-lg text-muted-foreground mb-8'>
                Voxora provides all the tools your team needs to deliver
                exceptional customer support. From real-time messaging to
                advanced analytics, we&apos;ve got you covered.
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 mb-8'>
                {benefits.map((benefit, index) => (
                  <div key={index} className='flex items-center space-x-3'>
                    <div className='h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center'>
                      <CheckCircle className='h-3.5 w-3.5 text-primary flex-shrink-0' />
                    </div>
                    <span className='text-foreground font-medium'>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
              <Button className='mt-4' asChild>
                <Link href='/Features'>Learn More</Link>
              </Button>
            </div>

            <div className='relative'>
              <div className='absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 blur-xl -z-10 rounded-3xl' />
              <div className='bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-2xl p-8 shadow-xl border border-border'>
                <div className='bg-card rounded-xl p-6 shadow-lg border border-border/40'>
                  <div className='flex items-center space-x-3 pb-4 border-b border-border/50 mb-4'>
                    <div className='w-9 h-9 bg-gradient-to-br from-primary to-primary-foreground rounded-full flex items-center justify-center'>
                      <span className='text-xs font-bold text-white'>VA</span>
                    </div>
                    <div>
                      <div className='text-sm font-medium'>
                        Voxora Assistant
                      </div>
                      <div className='flex items-center'>
                        <div className='h-2 w-2 bg-green-500 rounded-full mr-1.5' />
                        <div className='text-xs text-muted-foreground'>
                          Online
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div className='bg-muted rounded-lg p-4 max-w-xs'>
                      <p className='text-sm'>Hi! How can I help you today?</p>
                      <span className='text-xs text-muted-foreground mt-1 block'>
                        12:03 PM
                      </span>
                    </div>
                    <div className='bg-primary rounded-lg p-4 max-w-xs ml-auto text-primary-foreground'>
                      <p className='text-sm'>I need help with my account</p>
                      <span className='text-xs text-primary-foreground/80 mt-1 block'>
                        12:04 PM
                      </span>
                    </div>
                    <div className='bg-muted rounded-lg p-4 max-w-xs'>
                      <p className='text-sm'>
                        I&apos;d be happy to help! Let me look into that for
                        you.
                      </p>
                      <span className='text-xs text-muted-foreground mt-1 block'>
                        12:04 PM
                      </span>
                    </div>
                  </div>

                  <div className='mt-6 relative'>
                    <input
                      type='text'
                      className='w-full bg-muted rounded-full px-4 py-2 text-sm focus:outline-none border border-border/50'
                      placeholder='Type your message...'
                      disabled
                    />
                    <div className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary rounded-full p-1'>
                      <ArrowRight className='h-4 w-4 text-primary-foreground' />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-24 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent -z-10' />
        <div className='absolute top-0 right-0 opacity-10 -z-10'>
          <svg
            width='400'
            height='400'
            viewBox='0 0 100 100'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M10 10L90 10L90 90L10 90L10 10Z'
              stroke='white'
              strokeWidth='4'
            />
            <path
              d='M30 30L70 30L70 70L30 70L30 30Z'
              stroke='white'
              strokeWidth='4'
            />
            <path d='M50 10L50 90' stroke='white' strokeWidth='4' />
            <path d='M10 50L90 50' stroke='white' strokeWidth='4' />
          </svg>
        </div>
        <div className='absolute bottom-0 left-0 opacity-10 -z-10'>
          <svg
            width='300'
            height='300'
            viewBox='0 0 100 100'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <circle cx='50' cy='50' r='40' stroke='white' strokeWidth='4' />
            <circle cx='50' cy='50' r='20' stroke='white' strokeWidth='4' />
            <line
              x1='50'
              y1='10'
              x2='50'
              y2='90'
              stroke='white'
              strokeWidth='4'
            />
            <line
              x1='10'
              y1='50'
              x2='90'
              y2='50'
              stroke='white'
              strokeWidth='4'
            />
          </svg>
        </div>

        <div className='container mx-auto'>
          <div className='max-w-4xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-border'>
            <div className='text-center'>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
                <span className='text-xs font-medium'>Limited Time Offer</span>
              </div>
              <h2 className='text-3xl md:text-5xl font-bold text-foreground mb-4'>
                Ready to transform your support experience?
              </h2>
              <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
                Join thousands of teams already using Voxora to provide
                exceptional customer support. Start using Voxora today.
              </p>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Button size='lg' className='shadow-xl' asChild>
                  <Link
                    href='/register'
                    className='inline-flex items-center gap-2'
                  >
                    <span>Start Free</span>
                    <ArrowRight className='h-4 w-4' />
                  </Link>
                </Button>
                <Button
                  size='lg'
                  variant='outline'
                  className='shadow-xl'
                  asChild
                >
                  <Link href='/contact'>View Demo</Link>
                </Button>
              </div>
              <p className='text-sm text-muted-foreground mt-6'>
                Start your journey with Voxora today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-border bg-muted/30'>
        <div className='container mx-auto px-4 py-16'>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8'>
            <div className='col-span-2'>
              <div className='flex items-center space-x-2 mb-6'>
                <div className='w-8 h-8 bg-gradient-to-br from-primary to-accent rounded flex items-center justify-center'>
                  <span className='text-sm font-bold text-primary-foreground'>
                    V
                  </span>
                </div>
                <span className='font-bold text-foreground text-lg'>
                  Voxora
                </span>
              </div>
              <p className='text-muted-foreground text-sm mb-4 max-w-xs'>
                Enterprise-grade customer support platform designed for modern
                teams. Open source, secure, and built for scale.
              </p>
              <div className='flex space-x-4'>
                <Link
                  href='https://github.com/voxora-cloud'
                  className='text-muted-foreground hover:text-foreground'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4'></path>
                    <path d='M9 18c-4.51 2-5-2-7-2'></path>
                  </svg>
                </Link>
                <Link
                  href='https://www.linkedin.com/company/voxora-io'
                  className='text-muted-foreground hover:text-foreground'
                >
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'></path>
                    <rect width='4' height='12' x='2' y='9'></rect>
                    <circle cx='4' cy='4' r='2'></circle>
                  </svg>
                </Link>
              </div>
            </div>

            <div>
              <h3 className='font-medium text-foreground mb-4'>Product</h3>
              <ul className='space-y-3'>
                <li>
                  <Link
                    href='/Features'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Pricing'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Documentation'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Integrations
                  </Link>
                </li>
                
              </ul>
            </div>

            <div>
              <h3 className='font-medium text-foreground mb-4'>Resources</h3>
              <ul className='space-y-3'>
                <li>
                  <Link
                    href='/Documentation'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Documentation'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Documentation'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Guides
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Community'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Community
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className='font-medium text-foreground mb-4'>Company</h3>
              <ul className='space-y-3'>
                <li>
                  <Link
                    href='/About'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href='/Community'
                    className='text-sm text-muted-foreground hover:text-foreground'
                  >
                    Team
                  </Link>
                </li>
           
              </ul>
            </div>
          </div>

          <div className='border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center'>
            <p className='text-sm text-muted-foreground mb-4 md:mb-0'>
              &copy; 2025 Voxora. All rights reserved. Made with ❤️ by the open
              source community.
            </p>

            {/* <div className='flex space-x-6'>
              <Link
                href='/privacy'
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                Privacy
              </Link>
              <Link
                href='/terms'
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                Terms
              </Link>
              <Link
                href='/cookies'
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                Cookies
              </Link>
              <Link
                href='/contact'
                className='text-xs text-muted-foreground hover:text-foreground'
              >
                Contact
              </Link>
            </div> */}
          </div>
        </div>
      </footer>
    </div>
  )
}
