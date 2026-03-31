import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Info, 
  Briefcase, 
  BookOpen, 
  HelpCircle, 
  RotateCcw, 
  AlertCircle, 
  Accessibility as AccessibilityIcon,
  ShieldCheck,
  FileText,
  Cookie,
  ArrowRight
} from 'lucide-react';

const INFO_CONTENT = {
  'about-us': {
    title: 'About FoodCourt',
    subtitle: 'Redefining the art of food delivery.',
    icon: Info,
    content: `
      FoodCourt was founded with a single mission: to bring the world's finest culinary experiences directly to your doorstep. 
      We aren't just a delivery service; we are a technology platform that bridges the gap between passionate chefs and discerning food lovers.
      
      Our journey started in 2024 with a small team of food enthusiasts in Mumbai. Today, we partner with thousands of restaurants, 
      from legendary local joints to Michelin-starred establishments, ensuring that quality is never compromised by distance.
      
      We believe that every meal is an opportunity for a memory. That's why we obsess over every detail — from the temperature 
      of your dish to the speed of our riders.
    `,
    stats: [
      { label: 'Cities Covered', value: '50+' },
      { label: 'Partner Restaurants', value: '15,000+' },
      { label: 'Active Riders', value: '25,000+' },
      { label: 'Happy Customers', value: '1M+' }
    ]
  },
  'careers': {
    title: 'Join the Revolution',
    subtitle: 'Build the future of food technology with us.',
    icon: Briefcase,
    content: `
      At FoodCourt, we move fast, think big, and solve complex problems every single day. 
      Whether you're an engineer, a designer, a logistics expert, or a marketing visionary, there's a seat for you at our table.
      
      Our culture is built on transparency, radical innovation, and a deep-seated love for great food. 
      We offer competitive benefits, flexible working modules, and the chance to impact millions of lives.
    `,
    openings: [
      { title: 'Senior Backend Engineer', dept: 'Engineering', location: 'Remote / Mumbai' },
      { title: 'Product Designer', dept: 'Design', location: 'Mumbai' },
      { title: 'Logistics Operations Manager', dept: 'Operations', location: 'Bengaluru' },
      { title: 'Growth Marketing Lead', dept: 'Marketing', location: 'Delhi / NCR' }
    ]
  },
  'blog': {
    title: 'The Foodie Feed',
    subtitle: 'Insights, recipes, and stories from our kitchen to yours.',
    icon: BookOpen,
    content: `
      Discover the latest trends in the culinary world, exclusive interviews with top chefs, 
      and the technology behind FoodCourt's seamless delivery engine.
    `,
    posts: [
      { title: 'The Rise of Cloud Kitchens in 2026', date: 'March 25, 2026', category: 'Industry' },
      { title: '5 Secret Ingredients for the Perfect Smash Burger', date: 'March 20, 2026', category: 'Recipes' },
      { title: 'How AI is Optimizing Delivery Routes', date: 'March 15, 2026', category: 'Tech' }
    ]
  },
  'help-center': {
    title: 'Help Center',
    subtitle: 'How can we help you today?',
    icon: HelpCircle,
    content: `
      Find answers to your most frequent questions about orders, payments, and account security. 
      Our support team is available 24/7.
    `,
    faqs: [
      { q: 'How do I track my order?', a: 'Go to the track order page or your order history to see real-time updates.' },
      { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, UPI, and digital wallets.' },
      { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 2 minutes of placement before the restaurant starts preparing.' }
    ]
  },
  'refunds': {
    title: 'Refund Policy',
    subtitle: 'Fair, fast, and transparent refunds.',
    icon: RotateCcw,
    content: `
      We strive for perfection, but if something goes wrong, we've got your back.
      If your order is incorrect, damaged, or significantly delayed, you are eligible for a full or partial refund.
      
      Refunds are processed within 24 hours and typically reflect in your original payment method within 3-5 business days.
    `
  },
  'report-issue': {
    title: 'Report an Issue',
    subtitle: 'Something not right? Let us know immediately.',
    icon: AlertCircle,
    content: `
      Your feedback helps us improve. If you encountered a problem with the app, a restaurant, or a rider, 
      please provide details below. Our team will investigate and get back to you within 2 hours.
    `,
    contactInfo: 'support@foodcourt.in | 1-800-FOOD-COURT'
  },
  'accessibility': {
    title: 'Accessibility',
    subtitle: 'Food for everyone.',
    icon: AccessibilityIcon,
    content: `
      We are committed to ensuring our platform is accessible to all users, including those with disabilities. 
      We continuously work to improve the accessibility of our website and mobile app based on WCAG 2.1 standards.
      
      If you have suggestions on how we can improve, please reach out to our accessibility team.
    `
  },
  'privacy': {
    title: 'Privacy Policy',
    subtitle: 'Your data, protected.',
    icon: ShieldCheck,
    content: `
      We respect your privacy. This policy outlines how we collect, use, and protect your personal information. 
      We never sell your data to third parties. We use industry-standard encryption to keep your details safe.
    `
  },
  'terms': {
    title: 'Terms of Service',
    subtitle: 'The legal bit.',
    icon: FileText,
    content: `
      By using FoodCourt, you agree to our terms and conditions. These terms govern your use of our services, 
      including ordering, payments, and interactions with our partners.
    `
  },
  'cookies': {
    title: 'Cookie Policy',
    subtitle: 'A better experience with cookies.',
    icon: Cookie,
    content: `
      We use cookies to personalize your experience, remember your preferences, and analyze our traffic. 
      You can manage your cookie settings at any time through your browser.
    `
  }
};

export default function InformationPage() {
  const { slug } = useParams();
  const page = INFO_CONTENT[slug] || INFO_CONTENT['about-us'];
  const Icon = page.icon;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-20 animate-fade-down">
          <div className="w-20 h-20 bg-orange-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-orange-100/50 transform rotate-6">
            <Icon size={32} className="text-orange-600 -rotate-6" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
            {page.title.split(' ').map((word, i) => (
              <span key={i} className={i === page.title.split(' ').length - 1 ? "text-orange-500" : ""}>
                {word}{' '}
              </span>
            ))}
          </h1>
          <p className="text-slate-500 text-lg font-bold tracking-tight uppercase opacity-80">{page.subtitle}</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="prose prose-slate max-w-none">
              {page.content.split('\n').map((para, i) => (
                para.trim() && <p key={i} className="text-slate-600 text-lg leading-relaxed font-semibold mb-6">{para.trim()}</p>
              ))}
            </div>

            {/* Extra content for specific pages */}
            {slug === 'about-us' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-12 border-t border-slate-100">
                {page.stats.map(stat => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {slug === 'careers' && (
              <div className="mt-16 pt-12 border-t border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Current Openings</h3>
                <div className="grid gap-4">
                  {page.openings.map(job => (
                    <div key={job.title} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group cursor-pointer">
                      <div>
                        <h4 className="font-black text-slate-900 group-hover:text-orange-600 transition-colors">{job.title}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{job.dept} • {job.location}</p>
                      </div>
                      <ArrowRight size={20} className="text-slate-300 group-hover:text-orange-500 transform group-hover:translate-x-2 transition-all" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slug === 'blog' && (
              <div className="mt-16 pt-12 border-t border-slate-100">
                <div className="grid gap-8">
                  {page.posts.map(post => (
                    <div key={post.title} className="group cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{post.category}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{post.date}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 group-hover:text-orange-500 transition-colors tracking-tight">{post.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(slug === 'help-center' || slug === 'refunds') && (
              <div className="mt-16 pt-12 border-t border-slate-100">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Frequently Asked Questions</h3>
                <div className="space-y-6">
                  {page.faqs?.map(faq => (
                    <div key={faq.q}>
                      <h4 className="font-black text-slate-900 mb-2 flex items-center gap-3">
                        <span className="w-2 h-2 bg-orange-500 rounded-full" />
                        {faq.q}
                      </h4>
                      <p className="text-slate-500 font-medium pl-5">{faq.a}</p>
                    </div>
                  ))}
                  {!page.faqs && (
                    <p className="text-slate-500 font-medium italic">General FAQ section coming soon...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-6">Want to explore our menu?</p>
            <Link to="/" className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-500 transition-all shadow-2xl active:scale-95">
                Browse Restaurants <ArrowRight size={18} />
            </Link>
        </div>
      </div>
    </div>
  );
}
