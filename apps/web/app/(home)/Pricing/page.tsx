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
  Check,
  Star,
  Users,
  Zap,
  Crown,
  Heart,
  Code,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { Navbar } from '@/components/shared/navbar'
import { Footer } from '@/components/shared/footer'

const pricingPlans = [
  {
    name: "Open Source",
    price: "Free",
    priceDetail: "Forever",
    description: "Perfect for individuals and small teams getting started",
    icon: Heart,
    popular: false,
    features: [
      "Up to 3 agents",
      "Basic chat widget",
      "Email support",
      "Community support",
      "Basic analytics",
      "Open source code",
      "Self-hosted",
      "API access"
    ],
    limitations: [
      "No voice support",
      "Limited customization",
      "No priority support"
    ],
    cta: "Get Started",
    ctaLink: "https://github.com/voxora-cloud/voxora"
  },
  {
    name: "Starter",
    price: "$29",
    priceDetail: "per agent/month",
    description: "Great for growing teams that need more features",
    icon: Users,
    popular: true,
    features: [
      "Up to 10 agents",
      "Advanced chat widget",
      "Voice calls",
      "Email integration",
      "Advanced analytics",
      "Custom branding",
      "24/7 email support",
      "Integrations",
    ],
    limitations: [],
    cta: "Start Free Trial",
    ctaLink: "/register"
  },
  {
    name: "Professional",
    price: "$79",
    priceDetail: "per agent/month",
    description: "For established teams with advanced needs",
    icon: Zap,
    popular: false,
    features: [
      "Up to 50 agents",
      "AI-powered chatbots",
      "Advanced automation",
      "Custom workflows",
      "Advanced reporting",
      "White-label solution",
      "Priority phone support",
      "API rate limiting removed",
      "Custom integrations"
    ],
    limitations: [],
    cta: "Start Free Trial",
    ctaLink: "/register"
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceDetail: "Contact sales",
    description: "For large organizations with specific requirements",
    icon: Crown,
    popular: false,
    features: [
      "Unlimited agents",
      "Dedicated infrastructure",
      "Advanced security",
      "Custom SLA",
      "Dedicated account manager",
      "On-premise deployment",
      "Custom development",
      "Training & onboarding",
      "Compliance certifications",
      "24/7 priority support"
    ],
    limitations: [],
    cta: "Contact Sales",
    ctaLink: "/contact"
  }
]

const faqs = [
  {
    question: "Is Voxora really open source?",
    answer: "Yes! Voxora is completely open source under the MIT license. You can view, modify, and contribute to the code on GitHub. The open source version includes core chat functionality and can be self-hosted."
  },
  {
    question: "What's the difference between self-hosted and cloud?",
    answer: "Self-hosted gives you complete control over your data and infrastructure, while our cloud version provides managed hosting, automatic updates, and enterprise-grade reliability without the operational overhead."
  },
  {
    question: "Can I upgrade or downgrade my plan anytime?",
    answer: "Absolutely! You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle. We'll prorate any differences."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and can arrange wire transfers for enterprise customers. All payments are processed securely through Stripe."
  },
  {
    question: "Is there a setup fee?",
    answer: "No setup fees, ever! All our plans are straightforward monthly or annual subscriptions with no hidden costs or setup charges."
  }
]

export default function PricingPage() {
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
            <span className='text-xs font-medium'>Simple, Transparent Pricing</span>
          </div>
          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6'>
            Choose the plan that
            <span className='block text-primary'>fits your team</span>
          </h1>
          <p className='text-xl text-muted-foreground mb-8 max-w-3xl mx-auto'>
            Start with our open source version, upgrade as you grow. No hidden fees, no vendor lock-in, 
            and you can always self-host for complete control.
          </p>
          <div className='flex items-center justify-center gap-4 mb-8'>
            <span className='text-sm text-muted-foreground'>Monthly</span>
            <div className='relative'>
              <div className='w-12 h-6 bg-muted rounded-full cursor-pointer'>
                <div className='w-5 h-5 bg-primary rounded-full absolute top-0.5 left-0.5 transition-transform'></div>
              </div>
            </div>
            <span className='text-sm text-muted-foreground'>
              Annual <span className='text-green-600 font-medium'>(Save 20%)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className='py-12 px-4'>
        <div className='container mx-auto'>
          <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-105' 
                  : 'border-border hover:border-primary/50'
              }`}>
                {plan.popular && (
                  <div className='absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-medium text-center py-2'>
                    Most Popular
                  </div>
                )}
                
                <CardHeader className={`text-center ${plan.popular ? 'pt-8' : 'pt-6'}`}>
                  <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                    <plan.icon className='h-6 w-6 text-primary' />
                  </div>
                  <CardTitle className='text-2xl'>{plan.name}</CardTitle>
                  <div className='py-4'>
                    <span className='text-4xl font-bold text-foreground'>{plan.price}</span>
                    {plan.priceDetail && (
                      <span className='text-muted-foreground text-sm block'>{plan.priceDetail}</span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className='pt-0'>
                  <ul className='space-y-3 mb-6'>
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className='flex items-center text-sm'>
                        <Check className='h-4 w-4 text-green-500 mr-3 flex-shrink-0' />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'variant-outline'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={plan.ctaLink} className='inline-flex items-center justify-center'>
                      {plan.cta}
                      {plan.name === 'Open Source' ? (
                        <Code className='ml-2 h-4 w-4' />
                      ) : (
                        <ArrowRight className='ml-2 h-4 w-4' />
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className='py-24 px-4 bg-gradient-to-b from-background to-muted/30'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Why teams choose Voxora
            </h2>
            <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
              Join thousands of companies that trust Voxora for their customer support needs
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <Heart className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-xl font-semibold mb-2'>Open Source</h3>
              <p className='text-muted-foreground'>
                Complete transparency with MIT license. Contribute to the codebase and customize to your needs.
              </p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <Globe className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-xl font-semibold mb-2'>Global Scale</h3>
              <p className='text-muted-foreground'>
                Deploy worldwide with multi-region support and 99.9% uptime guarantee.
              </p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4'>
                <Zap className='h-8 w-8 text-primary' />
              </div>
              <h3 className='text-xl font-semibold mb-2'>Lightning Fast</h3>
              <p className='text-muted-foreground'>
                Real-time messaging with sub-second response times and instant notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className='py-24 px-4'>
        <div className='container mx-auto'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-bold text-foreground mb-4'>
              Frequently Asked Questions
            </h2>
            <p className='text-xl text-muted-foreground'>
              Everything you need to know about our pricing and plans
            </p>
          </div>

          <div className='max-w-3xl mx-auto space-y-6'>
            {faqs.map((faq, index) => (
              <Card key={index} className='border-border'>
                <CardHeader>
                  <CardTitle className='text-lg'>{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-muted-foreground'>{faq.answer}</p>
                </CardContent>
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
              Ready to get started?
            </h2>
            <p className='text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'>
              Start with our open source version or try our cloud platform with a free trial.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button size='lg' className='shadow-xl' asChild>
                <Link href='/register'>Start Free Trial</Link>
              </Button>
                <Button size='lg' variant='outline' asChild>
                <Link href='https://github.com/voxora-cloud/voxora' className='inline-flex items-center'>
                  <Code className='mr-2 h-4 w-4' />
                  View on GitHub
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