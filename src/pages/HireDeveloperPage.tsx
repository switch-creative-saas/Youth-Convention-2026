import { useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Bug, Code2, Layers, MessageCircle, Palette, Plug, Smartphone } from 'lucide-react';
import { AttendeePortalLayout } from '@/components/attendee/AttendeePortalLayout';

const services = [
  { title: 'Web Development', icon: Code2, description: 'Modern websites, web apps, dashboards, portals and business platforms built for performance and scale.', message: "Hello, I'm interested in your Web Development services. I'd like to discuss a project." },
  { title: 'App Development', icon: Smartphone, description: 'Modern mobile applications for Android and iOS using reliable, scalable technologies.', message: "Hello, I'm interested in your App Development services. I'd like to discuss a project." },
  { title: 'UI/UX Design', icon: Palette, description: 'Clean, modern and user-focused interfaces designed to make your product look and feel exceptional.', message: "Hello, I'm interested in your UI/UX Design services. I'd like to discuss a project." },
  { title: 'Bug Fixing & Optimization', icon: Bug, description: "Fix broken builds, resolve technical issues and improve your application's speed, responsiveness and reliability.", message: 'Hello, I need help fixing/optimizing an existing application.' },
  { title: 'API & System Integration', icon: Plug, description: 'Connect your application to APIs, payment systems, authentication services, databases and third-party platforms.', message: "Hello, I'm interested in API and System Integration services." },
  { title: 'Custom Software', icon: Layers, description: "Need something specific? Let's design and build a solution around your exact requirements.", message: "Hello, I'd like to discuss building a custom software solution." },
];

function WhatsAppLink({ message, service, variant = 'dark' }: { message: string; service?: string; variant?: 'dark' | 'accent' }) {
  return (
    <a href={`https://wa.me/2348148262447?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
      aria-label={service ? `Chat on WhatsApp about ${service}` : 'Chat on WhatsApp about your project'}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-portal-from motion-reduce:transition-none ${variant === 'accent' ? 'bg-portal-accent text-portal-accent-ink' : 'bg-portal-dark text-white'}`}>
      <MessageCircle aria-hidden="true" className="h-4 w-4" />Chat on WhatsApp
    </a>
  );
}

export function HireDeveloperPage() {
  const { token } = useParams();
  const reducedMotion = useReducedMotion();

  return (
    <AttendeePortalLayout token={token}>
        <motion.div initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-8 sm:mb-10">
          <h1 className="text-[40px] font-light leading-[1.12] text-portal-ink sm:text-[48px]">Hire a Developer</h1>
          <p className="mt-2 text-portal-label dark:text-portal-label">Let's build something great together.</p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map(({ title, icon: Icon, description, message }, index) => (
            <motion.article key={title} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} whileHover={reducedMotion ? undefined : { y: -3 }} transition={{ duration: 0.35, delay: reducedMotion ? 0 : index * 0.05 }}
              className="portal-card portal-card-hover group flex flex-col rounded-[28px] p-6 transition-[border-color,box-shadow] hover:border-portal-ink/20 motion-reduce:transition-none sm:p-7">
              <div className="flex flex-1 flex-col">
                <motion.div initial={reducedMotion ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.2, delay: reducedMotion ? 0 : index * 0.05 }} className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-portal-accent text-portal-accent-ink">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </motion.div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-2 mb-6 max-w-md flex-1 text-sm leading-6 text-portal-label dark:text-portal-label">{description}</p>
                <div><WhatsAppLink message={message} service={title} /></div>
              </div>
            </motion.article>
          ))}
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-[28px] bg-portal-dark p-6 text-white sm:p-8">
          <div><p className="text-xs font-semibold text-white/65">HAVE A PROJECT IN MIND?</p><p className="mt-2 text-xl font-medium">Let's talk about it.</p></div>
          <WhatsAppLink variant="accent" message="Hello, I have a project in mind and would like to discuss it with you." />
        </footer>
    </AttendeePortalLayout>
  );
}
