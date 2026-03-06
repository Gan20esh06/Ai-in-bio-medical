/**
 * Contact.tsx — Contact / Support page.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Github,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    // Contact form — in a production deployment this would POST to an API
    setError(null);
    setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
            <MessageSquare className="w-3.5 h-3.5 mr-2" />
            Get In Touch
          </div>
          <h1 className="text-4xl font-bold font-display tracking-tight mb-3">
            Contact Us
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Have a question, feedback, or want to contribute to the project?
            Reach out and we'll get back to you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-4"
          >
            {[
              {
                icon: Mail,
                title: "Email",
                value: "support@aisdp.health",
                href: "mailto:support@aisdp.health",
              },
              {
                icon: Github,
                title: "GitHub",
                value: "github.com/aisdp",
                href: "#",
              },
            ].map(({ icon: Icon, title, value, href }, i) => (
              <a
                key={i}
                href={href}
                className="glass-card rounded-2xl border border-black/5 p-5 flex gap-4 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{title}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              </a>
            ))}

            {/* FAQ */}
            <div className="glass-card rounded-2xl border border-black/5 p-5 space-y-4">
              <h3 className="font-semibold text-sm">Common Questions</h3>
              {[
                {
                  q: "Is my data stored?",
                  a: "No. All processing is in-memory and discarded immediately.",
                },
                {
                  q: "Is this app free?",
                  a: "Yes, completely free and open-source.",
                },
                {
                  q: "Can I embed this in my app?",
                  a: "The backend exposes a REST API — yes, it's embeddable.",
                },
              ].map(({ q, a }, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold">{q}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-3"
          >
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-2xl border border-green-200 bg-green-50 p-10 flex flex-col items-center gap-4 text-center"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h3 className="text-xl font-bold">Message Sent!</h3>
                <p className="text-sm text-muted-foreground">
                  Thank you for reaching out. We'll get back to you as soon as
                  possible.
                </p>
                <Button
                  variant="outline"
                  className="rounded-full mt-2"
                  onClick={() => setSent(false)}
                >
                  Send Another Message
                </Button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="glass-card rounded-2xl border border-black/5 p-6 space-y-4"
              >
                <h2 className="font-bold text-lg mb-2">Send a Message</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject</label>
                  <select
                    value={form.subject}
                    onChange={set("subject")}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a topic…</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="medical">Medical Inquiry</option>
                    <option value="partnership">Partnership / Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={set("message")}
                    rows={5}
                    placeholder="Describe your question or feedback…"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-full gap-2 h-11"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
