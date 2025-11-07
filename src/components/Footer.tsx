import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-12 border-t bg-card/50 backdrop-blur-sm"
    >
      <div className="container py-6 px-4">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            Developed with ❤️ by <span className="font-semibold text-primary">Sayan</span>
          </p>
          <Link 
            to="/contact"
            className="text-sm text-primary hover:underline transition-colors"
          >
            Contact Developer
          </Link>
        </div>
      </div>
    </motion.footer>
  );
}
