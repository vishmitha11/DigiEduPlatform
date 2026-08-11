import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-navy-border bg-navy-base text-ink-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">

          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center space-x-2">
              <img src="/logo3.png" alt="iNEXORA" className="h-10 w-36" />
            </div>
            <p className="text-sm leading-relaxed">
              A next-generation platform designed to help you learn, grow, and evolve with <br />clarity, purpose, and real-world direction.
            </p>
          </div>

          {/* Quick Links */}
          <div className="ml-35">
            <h3 className="mb-4 font-semibold text-brand">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/programs" className="transition hover:text-ink">
                  Programs
                </Link>
              </li>
              <li>
                <Link href="/careers" className="transition hover:text-ink">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition hover:text-ink">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-ink">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="ml-25">
            <h3 className="mb-4 font-semibold text-brand">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/maintenance" className="transition hover:text-ink">
                  Digital Library
                </Link>
              </li>
              <li>
                <Link href="/maintenance" className="transition hover:text-ink">
                  Student Support
                </Link>
              </li>
              <li>
                <Link href="/maintenance" className="transition hover:text-ink">
                  Partner Portal
                </Link>
              </li>
              <li>
                <Link href="/maintenance" className="transition hover:text-ink">
                  Research Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="ml-15">
            <h3 className="mb-4 font-semibold text-brand">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2">
                <MapPin className="mt-1 h-4 w-4 flex-shrink-0" />
                <span>Colombo, Sri Lanka</span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="mt-1 h-4 w-4 flex-shrink-0" />
                <span>info@inexora.lk</span>
              </li>
              <li className="flex items-start space-x-2">
                <Phone className="mt-1 h-4 w-4 flex-shrink-0" />
                <span>+94 11 234 5678</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-navy-border pt-8 text-center text-sm">
          <p>
            &copy; {new Date().getFullYear()} iNexora. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}