"use client";
import { useScroll, useTransform, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();

      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div ref={containerRef} className="w-full bg-background font-sans px-3 sm:px-4 md:px-6 lg:px-10">
      <div ref={ref} className="relative max-w-7xl mx-auto pb-12 sm:pb-16 md:pb-20">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-6 sm:pt-8 md:pt-10 lg:pt-28 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-24 sm:top-28 md:top-32 lg:top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 absolute left-2 sm:left-2 md:left-3 rounded-full bg-background/80 backdrop-blur-sm border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                <div className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 md:h-3 md:w-3 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-3xl font-bold text-white/80">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-12 sm:pl-16 md:pl-20 lg:pl-4 pr-2 sm:pr-3 md:pr-4 w-full">
              <h3 className="md:hidden block text-base sm:text-lg md:text-xl lg:text-2xl mb-2 sm:mb-3 md:mb-4 text-left font-bold text-white/80">
                {item.title}
              </h3>
              <motion.div
                className="transform transition-all duration-300"
                initial={{ opacity: 1, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                {item.content}
              </motion.div>
            </div>
          </div>
        ))}
        <div
          className="absolute left-4 sm:left-6 md:left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-white/20 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
          style={{
            height: height + "px",
          }}
        >
          <motion.div
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-primary via-secondary to-transparent from-[0%] via-[50%] rounded-full"
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
          />
        </div>
      </div>
    </div>
  );
};
