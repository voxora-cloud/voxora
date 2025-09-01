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
  Users,
  MessageSquare,
  Github,
  Twitter,
  Heart,
  Star,
  GitFork,
  Bug,
  Lightbulb,
  HelpCircle,
  Code,
  Calendar,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'

const communityStats = [
  { label: "GitHub Stars", value: "1.2K+", icon: Star },
  { label: "Contributors", value: "150+", icon: Users },
  { label: "Forks", value: "300+", icon: GitFork },
  { label: "Discord Members", value: "2.5K+", icon: MessageSquare }
]

const communityChannels = [
  {
    icon: Github,
    title: "GitHub Discussions",
    description: "Ask questions, share ideas, and discuss development topics",
    link: "https://github.com/voxora-cloud/voxora/discussions",
    buttonText: "Join Discussions",
    members: "500+ developers"
  },
  {
    icon: MessageSquare,
    title: "Discord Server",
    description: "Real-time chat with the community and core team",
    link: "https://discord.gg/8KaDHNs4",
    buttonText: "Join Discord",
    members: "2.5K+ members"
  },
  {
    icon: Twitter,
    title: "LinkedIn Page",
    description: "Follow updates, announcements, and community highlights",
    link: "https://www.linkedin.com/company/voxora-io",
    buttonText: "Follow Us",
    members: "1.8K+ followers"
  }
]

const contributionTypes = [
  {
    icon: Code,
    title: "Code Contributions",
    description: "Help build features, fix bugs, and improve the codebase",
    examples: ["Bug fixes", "New features", "Performance improvements", "Tests"]
  },
  {
    icon: Bug,
    title: "Bug Reports",
    description: "Help us identify and fix issues to make Voxora better",
    examples: ["Report bugs", "Reproduce issues", "Test fixes", "Validate solutions"]
  },
  {
    icon: Lightbulb,
    title: "Feature Requests",
    description: "Suggest new features and improvements for the platform",
    examples: ["Feature ideas", "Use case discussions", "Design feedback", "Prioritization"]
  },
  {
    icon: HelpCircle,
    title: "Documentation",
    description: "Help improve our docs, guides, and learning resources",
    examples: ["Write tutorials", "Fix typos", "Add examples", "Translate content"]
  }
]

const events = [
  {
    title: "Monthly Community Call",
    date: "First Monday of every month",
    time: "5:00 PM UTC",
    description: "Join our monthly community call to discuss roadmap, share updates, and connect with other users.",
    link: "https://calendar.google.com/voxora"
  },
  {
    title: "Hackathon 2025",
    date: "March 15-17, 2025",
    time: "48 hours",
    description: "Build amazing projects with Voxora. Prizes for the most innovative integrations and use cases.",
    link: "https://hackathon.voxora.dev"
  },
  {
    title: "Contributor Workshop",
    date: "February 20, 2025",
    time: "2:00 PM UTC",
    description: "Learn how to contribute to Voxora. Perfect for first-time contributors and open source newcomers.",
    link: "https://workshop.voxora.dev"
  }
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Lead Developer",
    company: "TechCorp",
    content: "The Voxora community is incredibly welcoming and helpful. I&apos;ve learned so much from contributing to this project.",
    avatar: "SC"
  },
  {
    name: "Mike Rodriguez",
    role: "Product Manager",
    company: "StartupXYZ",
    content: "Being part of the Voxora community has helped us build better customer support. The feedback and collaboration are amazing.",
    avatar: "MR"
  },
  {
    name: "Alex Thompson",
    role: "Full-Stack Developer",
    company: "Freelancer",
    content: "Contributing to Voxora has improved my skills and connected me with talented developers worldwide.",
    avatar: "AT"
  }
]

export default function CommunityPage() {
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
            <Heart className='w-4 h-4 mr-2' />
            <span className='text-xs font-medium'>Open Source Community</span>
          </div>
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6'>
            Join the Voxora
            <span className='block text-primary'>Community</span>
          </h1>
          <p className='text-xl text-muted-foreground mb-8 max-w-3xl mx-auto'>
            Connect with developers, contributors, and users from around the world. 
            Share knowledge, get help, and help shape the future of customer support technology.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' className='shadow-xl' asChild>
              <Link href='https://discord.gg/8KaDHNs4' className='inline-flex items-center gap-2'>
                <MessageSquare className='h-4 w-4' />
                Join Discord
              </Link>
            </Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='https://github.com/voxora-cloud/voxora'>
                <Github className='mr-2 h-4 w-4 inline-flex items-center' />
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Community Stats
      <section className='py-16 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
            {communityStats.map((stat, index) => (
              <div key={index} className='text-center'>
                <div className='w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                  <stat.icon className='h-8 w-8 text-primary' />
                </div>
                <div className='text-3xl font-bold text-foreground mb-2'>{stat.value}</div>
                <div className='text-sm text-muted-foreground'>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Community Channels */}
      <section className='py-24 px-4'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Where to Connect
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Multiple ways to engage with the Voxora community
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {communityChannels.map((channel, index) => (
              <Card key={index} className='text-center border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg'>
                <CardHeader>
                  <div className='w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                    <channel.icon className='h-8 w-8 text-primary' />
                  </div>
                  <CardTitle className='text-xl'>{channel.title}</CardTitle>
                  <CardDescription>{channel.description}</CardDescription>
                  <div className='text-sm text-muted-foreground mt-2'>{channel.members}</div>
                </CardHeader>
                <CardContent>
                  <Button className='w-full' asChild>
                    <Link href={channel.link} target='_blank' className='inline-flex items-center justify-center w-full'>
                      {channel.buttonText}
                      <ExternalLink className='ml-2 h-4 w-4' />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Contribute */}
      <section className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Ways to Contribute
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Everyone can contribute to Voxora, regardless of technical background
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {contributionTypes.map((type, index) => (
              <Card key={index} className='border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg'>
                <CardHeader>
                  <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
                    <type.icon className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle className='text-lg'>{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className='space-y-2'>
                    {type.examples.map((example, idx) => (
                      <li key={idx} className='text-sm text-muted-foreground flex items-center'>
                        <div className='w-1.5 h-1.5 bg-primary rounded-full mr-3' />
                        {example}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='text-center mt-12'>
            <Button size='lg' asChild>
              <Link className='inline-flex items-center justify-center' href='https://github.com/voxora-cloud/voxora/blob/main/CONTRIBUTING.md'>
                Read Contributing Guide
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Events */}
      {/* <section className='py-24 px-4'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Community Events
            </h2>
            <p className='text-xl text-muted-foreground'>
              Join our regular events and stay connected with the community
            </p>
          </div>

          <div className='space-y-6 max-w-4xl mx-auto'>
            {events.map((event, index) => (
              <Card key={index} className='border-border hover:border-primary/50 transition-all duration-300'>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center'>
                        <Calendar className='h-6 w-6 text-primary' />
                      </div>
                      <div>
                        <CardTitle className='text-xl'>{event.title}</CardTitle>
                        <div className='text-sm text-muted-foreground mt-1'>
                          {event.date} • {event.time}
                        </div>
                      </div>
                    </div>
                    <Button variant='outline' asChild>
                      <Link href={event.link} target='_blank' className='inline-flex items-center justify-center'>
                        Learn More
                        <ExternalLink className='ml-2 h-4 w-4' />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-muted-foreground'>{event.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* Community Testimonials */}
      {/* <section className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Community Stories
            </h2>
            <p className='text-xl text-muted-foreground'>
              Hear from our amazing community members
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {testimonials.map((testimonial, index) => (
              <Card key={index} className='border-border'>
                <CardContent className='pt-6'>
                  <p className='text-muted-foreground mb-6 italic'>
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold'>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className='font-semibold text-foreground'>{testimonial.name}</div>
                      <div className='text-sm text-muted-foreground'>{testimonial.role} at {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className='py-24 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent -z-10' />
        <div className='container mx-auto'>
          <div className='max-w-4xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-border text-center'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Ready to join our community?
            </h2>
            <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
              Whether you&apos;re a developer, designer, or just passionate about great customer support, 
              there&apos;s a place for you in the Voxora community.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button size='lg' className='shadow-xl' asChild>
                <Link className='inline-flex items-center justify-center' href='https://discord.gg/8KaDHNs4'>
                  <MessageSquare className='mr-2 h-4 w-4' />
                  Join Discord Now
                </Link>
              </Button>
              <Button size='lg' variant='outline' asChild>
                <Link className='inline-flex items-center justify-center' href='https://github.com/voxora-cloud/voxora'>
                  <Github className='mr-2 h-4 w-4' />
                  Start Contributing
                </Link>
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