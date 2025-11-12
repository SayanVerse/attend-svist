import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface Ripple {
  x: number;
  y: number;
  id: number;
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-md hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground shadow-md hover:shadow-lg",
        outline: "border border-input backdrop-blur-md bg-background/60 text-foreground hover:bg-accent/80 hover:text-accent-foreground shadow-sm hover:shadow-md",
        secondary: "backdrop-blur-md bg-secondary/70 text-secondary-foreground hover:bg-secondary/90 hover:text-secondary-foreground shadow-md hover:shadow-lg border border-white/20",
        ghost: "text-foreground hover:bg-accent/50 hover:text-accent-foreground backdrop-blur-sm hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary",
        glass: "backdrop-blur-md bg-white/40 dark:bg-card/40 text-foreground border border-white/30 shadow-md hover:bg-white/60 dark:hover:bg-card/60 hover:text-foreground hover:shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, children, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!asChild) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
          x,
          y,
          id: Date.now(),
        };

        setRipples([...ripples, newRipple]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id));
        }, 600);
      }

      onClick?.(e);
    };

    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} onClick={onClick} {...props}>{children}</Comp>;
    }

    const MotionButton = motion.button;

    return (
      <MotionButton
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
        ref={ref}
        onClick={handleClick}
        {...(props as any)}
      >
        {children}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full bg-white/40 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </MotionButton>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
