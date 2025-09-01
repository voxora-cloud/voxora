import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Heart,
  Users,
  Code,
  Github,
  Twitter,
  Linkedin,
  Target,
  Lightbulb,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'

const values = [
  {
    icon: Heart,
    title: "Open Source First",
    description: "We believe in transparency, community collaboration, and giving back to the developer ecosystem."
  },
  {
    icon: Users,
    title: "Customer-Centric",
    description: "Every feature we build is designed with our users&apos; needs and feedback at the forefront."
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    description: "Your data belongs to you. We prioritize security and privacy in everything we build."
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We continuously push the boundaries of what&apos;s possible in customer support technology."
  }
]

const team = [
  {
    name: "Om Pharate",
    href: "https://github.com/ompharate",
    role: "Software Engineer",
    bio: "Software engineer with a passion for building innovative solutions and improving developer experiences.",
    imgUrl: "https://avatars.githubusercontent.com/u/72200400?v=4"
  },
  {
    name: "Vaishnav Kale",
    href: "https://github.com/Vaishnav88sk",
    role: "Cloud Engineer",
    bio: "Cloud engineer with a focus on building scalable infrastructure and services.",
    imgUrl: "https://avatars.githubusercontent.com/u/116202759?v=4"
  },
  {
    name: "Vaibhav Shinde",
    href: "https://github.com/Vaibhu18",
    role: "Backend Engineer",
    bio: "Passionate about building scalable web applications and exploring new technologies.",
    imgUrl: "https://avatars.githubusercontent.com/u/103619246?v=4"
  },
  {
    name: "Abhishek Kumbhar",
    href: "https://github.com/Abhiiishek44",
    role: "Data Engineer",
    bio: "Data engineer with a passion for building data pipelines and optimizing data workflows.",
    imgUrl: "https://i.ibb.co/RGN05WnF/Whats-App-Image-2025-09-01-at-12-42-05.jpg"
  }
]


export default function AboutPage() {
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
            <span className='text-xs font-medium'>Our Story</span>
          </div>
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6'>
            Building the future of
            <span className='block text-primary'>customer support</span>
          </h1>
          <p className='text-xl text-muted-foreground mb-8 max-w-3xl mx-auto'>
            We&apos;re on a mission to democratize customer support technology. By combining the power of 
            open source with enterprise-grade reliability, we&apos;re making exceptional support accessible to everyone.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Button size='lg' className='shadow-xl' asChild>
              <Link href='https://github.com/voxora-cloud/voxora' className='inline-flex items-center gap-2'>
                <Github className='h-4 w-4' />
                View on GitHub
              </Link>
            </Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='/contact'>Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      {/* <section className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='grid lg:grid-cols-2 gap-12 items-center'>
            <div>
              <div className='inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6'>
                <Target className='w-4 h-4 mr-2' />
                <span className='text-xs font-medium'>Our Mission</span>
              </div>
              <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-6'>
                Empowering teams to deliver exceptional support
              </h2>
              <p className='text-lg text-muted-foreground mb-6'>
                We believe that great customer support should be accessible to every business, regardless of size or budget. 
                That&apos;s why we&apos;re building Voxora as an open source platform that companies can customize, extend, and deploy however works best for them.
              </p>
              <p className='text-lg text-muted-foreground mb-8'>
                Our vision is a world where every customer interaction is meaningful, efficient, and delightful - 
                powered by technology that puts people first.
              </p>
              <Button asChild>
                <Link href='/Features'>Explore Our Platform</Link>
              </Button>
            </div>
            <div className='relative'>
              <div className='absolute -inset-4 bg-gradient-to-r from-primary/10 to-accent/10 blur-xl -z-10 rounded-3xl' />
              <div className='bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-2xl p-8 shadow-xl border border-border'>
                <div className='grid grid-cols-2 gap-6'>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-primary mb-2'>50K+</div>
                    <div className='text-sm text-muted-foreground'>Messages processed daily</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-primary mb-2'>1K+</div>
                    <div className='text-sm text-muted-foreground'>GitHub stars</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-primary mb-2'>99.9%</div>
                    <div className='text-sm text-muted-foreground'>Uptime guarantee</div>
                  </div>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-primary mb-2'>24/7</div>
                    <div className='text-sm text-muted-foreground'>Community support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Values */}
      <section className='py-24 px-4'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Our Core Values
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              The principles that guide everything we do at Voxora
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {values.map((value, index) => (
              <Card key={index} className='text-center border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg'>
                <CardHeader>
                  <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                    <value.icon className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle className='text-xl'>{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className='text-muted-foreground'>{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

  

      {/* Team */}
      <section className='py-24 px-4'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Meet the Team
            </h2>
            <p className='text-xl text-muted-foreground'>
              The people behind Voxora
            </p>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {team.map((member, index) => (
              <Card key={index} className='text-center border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg'>
                <CardHeader>
                  <div className='w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg'>
                    <img src={member.imgUrl} alt={member.name} className='w-full h-full rounded-full object-cover' />
                  </div>
                  <Link target='_blank' href={member.href} className='text-primary font-medium'>
                    <CardTitle className='text-xl'> {member.name}</CardTitle>
                  </Link>
                  <CardDescription className='text-primary font-medium'>{member.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground'>{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community & Open Source */}
      <section className='py-24 px-4 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-r from-primary via-primary to-accent -z-10' />
        <div className='container mx-auto'>
          <div className='max-w-4xl mx-auto bg-background/80 backdrop-blur-md rounded-2xl p-10 shadow-2xl border border-border text-center'>
            <div className='flex items-center justify-center mb-6'>
              <Code className='h-8 w-8 text-primary mr-3' />
              <h2 className='text-3xl md:text-4xl font-bold text-foreground'>
                Join Our Community
              </h2>
            </div>
            <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
              Voxora is more than just software - it&apos;s a community of developers, designers, and support professionals 
              working together to build the future of customer support.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center mb-8'>
              <Button size='lg' className='shadow-xl' asChild>
                <Link href='https://github.com/voxora-cloud/voxora'>
                  <Github className='mr-2 h-4 w-4 inline-flex items-center'/>
                  Contribute on GitHub
                </Link>
              </Button>
              <Button size='lg' variant='outline' asChild>
                <Link href='/Community'>Join Discord</Link>
              </Button>
            </div>
            <div className='flex items-center justify-center space-x-6'>
              <Link href='https://github.com/voxora-cloud/voxora' className='text-muted-foreground hover:text-foreground'>
                <Github className='h-5 w-5' />
              </Link>
              <Link href='https://www.linkedin.com/company/voxora-io'  className='text-muted-foreground hover:text-foreground'>
                <Linkedin className='h-5 w-5' />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}