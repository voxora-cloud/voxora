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
  Bot,
  PhoneCall,
  BarChart3,
  Code2,
  MessageSquare,
  Users,
  Shield,
  Zap,
  Globe,
  Smartphone,
  Database,
  Settings,
  CheckCircle,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/shared'

const features = [
  {
    icon: Bot,
    title: "AI-Powered Support",
    description: "Intelligent chatbots and voice agents powered by advanced AI to handle customer queries instantly and efficiently.",
    category: "AI & Automation",
    highlights: ["24/7 availability", "Natural language processing", "Context awareness", "Learning capabilities"]
  },
  {
    icon: PhoneCall,
    title: "Voice & Chat Integration",
    description: "Seamlessly switch between live chat and voice support with WebRTC technology for real-time communication.",
    category: "Communication",
    highlights: ["WebRTC support", "High-quality audio", "Screen sharing", "Call recording"]
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Track customer interactions, agent performance, and conversation insights with comprehensive real-time analytics.",
    category: "Analytics",
    highlights: ["Real-time dashboards", "Performance metrics", "Custom reports", "Data visualization"]
  },
  {
    icon: Code2,
    title: "Developer-Friendly",
    description: "Open-source platform with extensive APIs, webhooks, and customization options for developers.",
    category: "Development",
    highlights: ["REST APIs", "Webhooks", "Custom widgets", "Open source"]
  },
  {
    icon: MessageSquare,
    title: "Multi-Channel Support",
    description: "Centralize customer conversations from email, chat, social media, and other channels in one platform.",
    category: "Communication",
    highlights: ["Email integration", "Social media", "Live chat", "SMS support"]
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Enable seamless collaboration between support agents with shared inboxes, notes, and handoffs.",
    category: "Collaboration",
    highlights: ["Shared inboxes", "Internal notes", "Agent handoffs", "Team chat"]
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security with end-to-end encryption, compliance certifications, and data protection.",
    category: "Security",
    highlights: ["End-to-end encryption", "GDPR compliant", "SOC 2 certified", "Data sovereignty"]
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for speed with real-time messaging, instant notifications, and sub-second response times.",
    category: "Performance",
    highlights: ["Real-time sync", "Fast loading", "Instant notifications", "Global CDN"]
  },
  {
    icon: Globe,
    title: "Global Scalability",
    description: "Scale globally with multi-region deployment, automatic scaling, and 99.9% uptime guarantee.",
    category: "Infrastructure",
    highlights: ["Multi-region", "Auto-scaling", "99.9% uptime", "Load balancing"]
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Fully responsive design with native mobile apps for agents and customers on the go.",
    category: "Accessibility",
    highlights: ["Mobile apps", "Responsive design", "Offline support", "Push notifications"]
  },
  {
    icon: Database,
    title: "Smart Knowledge Base",
    description: "AI-powered knowledge base with smart suggestions, auto-categorization, and content recommendations.",
    category: "Knowledge Management",
    highlights: ["AI suggestions", "Auto-categorization", "Search optimization", "Content analytics"]
  },
  {
    icon: Settings,
    title: "Flexible Workflows",
    description: "Create custom workflows, automation rules, and business logic to match your support processes.",
    category: "Automation",
    highlights: ["Custom workflows", "Automation rules", "Business logic", "Trigger conditions"]
  }
]

export default function FeaturesPage() {
  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <Navbar />

      {/* Hero Section */}
      <section className='py-24 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10' />
        <div className='absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10' />
        <div className='absolute bottom-10 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10' />

        <div className='container mx-auto text-center'>
          <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
            <Star className='w-4 h-4 mr-2' />
            <span className='text-xs font-medium'>Complete Feature Set</span>
          </div>
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6'>
            Everything you need for
            <span className='block text-primary'>exceptional support</span>
          </h1>
          <p className='text-xl text-muted-foreground mb-8 max-w-3xl mx-auto'>
            Discover all the powerful features that make Voxora the perfect choice for modern support teams. 
            From AI-powered automation to enterprise-grade security, we&apos;ve got you covered.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' className='shadow-xl' asChild>
              <Link href='/register' className='inline-flex items-center gap-2'>
                Get Started Free
                <ArrowRight className='h-4 w-4' />
              </Link>
            </Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='/demo'>View Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <Card key={index} className='group border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg overflow-hidden'>
                <CardHeader className='pb-4'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='w-12 h-12 bg-primary/10 group-hover:bg-primary/20 transition-colors rounded-lg flex items-center justify-center'>
                      <feature.icon className='h-6 w-6 text-primary' />
                    </div>
                    <span className='text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full'>
                      {feature.category}
                    </span>
                  </div>
                  <CardTitle className='text-xl mb-2'>{feature.title}</CardTitle>
                  <CardDescription className='text-muted-foreground'>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-2'>
                    {feature.highlights.map((highlight, idx) => (
                      <li key={idx} className='flex items-center text-sm text-muted-foreground'>
                        <CheckCircle className='h-4 w-4 text-green-500 mr-2 flex-shrink-0' />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className='h-1 w-0 group-hover:w-full bg-primary transition-all duration-300' />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-24 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent -z-10' />
        <div className='container mx-auto'>
          <div className='max-w-4xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-border text-center'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Ready to experience these features?
            </h2>
            <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
              Join thousands of teams already using Voxora to provide exceptional customer support.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button size='lg' className='shadow-xl' asChild>
                <Link href='/register'>Start Free Trial</Link>
              </Button>
              <Button size='lg' variant='outline' asChild>
                <Link href='/demo'>Schedule Demo</Link>
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