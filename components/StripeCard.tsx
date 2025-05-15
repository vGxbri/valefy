"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@heroui/react";

// Define the props interface
interface StripeCardProps {
  imageUrl: string;
  title: string;
  link?: string; // Optional link
  btnText?: string; // Optional text for the link
  disabled?: boolean; // Optional disabled state for Herou
  badge?: string; // Optional badge text (e.g. "Diaria")
}

// Update the component to accept props
function StripeCard({
  imageUrl,
  title,
  link = "#",
  btnText = "Learn more",
  disabled = false,
  badge,
}: StripeCardProps) {
  return (
    <>
      <div className="w-full h-76 group bg-backgroundAlt/10 backdrop-blur-sm p-4 border border-border/50 overflow-hidden rounded-2xl shadow-xl hover:shadow-primary/5 transition-all duration-300">
        <figure className="w-full h-40 group-hover:h-36 transition-all duration-300 bg-muted/30 rounded-xl relative overflow-hidden">
          {badge && (
            <div className="absolute top-2 right-2 z-10 bg-primary/80 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
              {badge}
            </div>
          )}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500"
            style={{
              background:
                "linear-gradient(135deg, hsla(var(--primary)/0.3) 0%, transparent 70%)",
            }}
          />
          <Image
            alt={title}
            className="absolute -bottom-1 group-hover:-bottom-5 right-0 h-full w-full rounded-lg object-cover transition-all duration-300 hover:scale-105"
            height={400}
            quality={100}
            src={imageUrl}
            width={400}
          />
        </figure>
        <article className="p-4 space-y-3">
          <div className="h-1 w-16 bg-primary/60 rounded-full" />
          <h1 className="text-xl font-semibold capitalize text-foreground">
            {title}
          </h1>
          <Button
            className="bg-red-600/20 hover:bg-red-600/30 text-white border border-red-500/20 hover:border-red-500/30 font-semibold px-6 rounded-xl transition-colors duration-300 shadow-lg shadow-red-900/20 active:scale-95 active:shadow-inner opacity-50 group-hover:opacity-100 translate-y-2 transition-all duration-300"
            isDisabled={disabled}
          >
            {btnText}
          </Button>
        </article>
      </div>
    </>
  );
}

export default StripeCard;
