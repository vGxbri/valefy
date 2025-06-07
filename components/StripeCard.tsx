"use client";

import React from "react";
import Image from "next/image";

// Define the props interface
interface StripeCardProps {
  imageUrl: string;
  title: string;
  price?: number;
  disabled?: boolean;
}

// Update the component to accept props
function StripeCard({
  imageUrl,
  title,
  disabled = false,
  price,
}: StripeCardProps) {
  return (
    <>
      <div className="div-general-stripecard w-full h-auto group p-4 rounded-2xl transition-all duration-300">
        <figure className="w-full h-auto aspect-[4/3] transition-all duration-300 rounded-xl relative">
          <Image
            alt={title}
            className="image-hover-white-glow absolute -bottom-1 right-0 h-full w-full rounded-lg object-cover transition-all 
                       duration-300"
            height={500}
            width={500}
            quality={100}
            src={imageUrl}
          />
        </figure>
        <article className="p-4 space-y-2 flex flex-col justify-between">
          <div className="h-1 w-3/4 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full mx-auto" />
          <h1 className="text-lg sm:text-xl font-semibold capitalize text-foreground text-center">
            {title}
          </h1>
          <div className="z-10">
            <p className="text-sm text-white/90 font-semibold text-center text-primary bg-gradient-to-r from-primary/40 to-secondary/30 rounded-lg w-fit mx-auto py-1 px-2 rounded-xl">
              {price} VP
            </p>
          </div>
        </article>
      </div>
    </>
  );
}

export default StripeCard;
