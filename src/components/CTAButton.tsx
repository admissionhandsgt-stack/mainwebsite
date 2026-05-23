"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useCTA } from "@/hooks/useCTA";
import { Phone, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface CTAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: "whatsapp" | "call" | "counselling" | "explore";
  message?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  icon?: "phone" | "whatsapp" | "arrow" | "none";
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  action,
  message,
  children,
  variant = "default",
  size = "default",
  icon = "none",
  className,
  ...props
}) => {
  const CTA = useCTA();
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) {
      props.onClick(e);
    }
    
    if (action === "whatsapp") {
      CTA.whatsapp(message);
    } else if (action === "call") {
      CTA.call();
    } else if (action === "counselling") {
      CTA.counselling();
    } else if (action === "explore") {
      CTA.explore();
    }
  };

  const renderIcon = () => {
    if (icon === "phone") return <Phone className="mr-2 h-5 w-5" />;
    if (icon === "whatsapp") return <WhatsAppIcon className="mr-2 h-5 w-5" />;
    if (icon === "arrow") return <ArrowRight className="ml-2 h-5 w-5" />;
    return null;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("font-bold transition-all", className)}
      onClick={handleClick}
      {...props}
    >
      {icon !== "none" && icon !== "arrow" && renderIcon()}
      {children}
      {icon === "arrow" && renderIcon()}
    </Button>
  );
};
