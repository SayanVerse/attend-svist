import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Github, MessageCircle } from "lucide-react";

export default function ContactPage() {
  const contacts = [
    {
      icon: Phone,
      label: "Call",
      value: "9609800163",
      href: "tel:9609800163",
      color: "text-success"
    },
    {
      icon: Mail,
      label: "Email",
      value: "sayan.official.2024@gmail.com",
      href: "mailto:sayan.official.2024@gmail.com",
      color: "text-destructive"
    },
    {
      icon: Github,
      label: "GitHub",
      value: "SayanVerse",
      href: "https://github.com/SayanVerse",
      color: "text-foreground"
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "9609800163",
      href: "https://wa.me/919609800163",
      color: "text-success"
    }
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold tracking-tight text-center mb-2">Contact Developer</h2>
        <p className="text-muted-foreground text-center">
          Get in touch with Sayan for support and inquiries
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {contacts.map((contact, index) => (
          <motion.a
            key={contact.label}
            href={contact.href}
            target={contact.label === "GitHub" ? "_blank" : undefined}
            rel={contact.label === "GitHub" ? "noopener noreferrer" : undefined}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card className="glass-card hover:shadow-lg transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <contact.icon className={`h-6 w-6 ${contact.color}`} />
                  {contact.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground break-all">
                  {contact.value}
                </p>
              </CardContent>
            </Card>
          </motion.a>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-muted-foreground mt-8"
      >
        <p>Available for freelance projects and consultations</p>
      </motion.div>
    </div>
  );
}
