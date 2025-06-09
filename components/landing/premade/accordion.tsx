"use client"
import React, { ReactNode, ReactElement, isValidElement } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccordionContextType = {
  isActive: boolean;
  value: string;
  onChangeIndex: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextType>({
  isActive: false,
  value: '',
  onChangeIndex: () => {}
});

const useAccordion = () => React.useContext(AccordionContext);

export function AccordionContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-1', className)}>{children}</div>
  );
}

export function AccordionWrapper({ 
  children 
}: { 
  children: ReactNode 
}) {
  return <div>{children}</div>;
}

export function Accordion({
  children,
  multiple,
  defaultValue,
}: {
  children: ReactNode;
  multiple?: boolean;
  defaultValue?: string | string[];
}) {
  const [activeIndex, setActiveIndex] = React.useState<string[]>(
    multiple ? (defaultValue ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue]) : []) : 
    (defaultValue ? (Array.isArray(defaultValue) ? [defaultValue[0]] : [defaultValue]) : [])
  );

  function onChangeIndex(value: string) {
    setActiveIndex((currentActiveIndex) => {
      if (!multiple) {
        return value === currentActiveIndex[0] ? [] : [value];
      }

      if (currentActiveIndex.includes(value)) {
        return currentActiveIndex.filter((i) => i !== value);
      }

      return [...currentActiveIndex, value];
    });
  }

  return React.Children.map(children, (child) => {
    if (!isValidElement<{ value?: string }>(child)) return null;

    const value = child.props.value ?? '';
    const isActive = multiple
      ? activeIndex.includes(value)
      : activeIndex[0] === value;

    return (
      <AccordionContext.Provider value={{ isActive, value, onChangeIndex }}>
        {React.cloneElement(child)}
      </AccordionContext.Provider>
    );
  });
}

export function AccordionItem({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: string 
}) {
  const { isActive } = useAccordion();

  return (
    <div
    data-active={isActive || undefined}
      className={`rounded-xl overflow-hidden mb-3 sm:mb-4 transition-all duration-300
        ${
          isActive
            ? 'active border-1 border-white bg-gradient-to-br from-slate-800/80 to-black/80 '
            : 'bg-black/40 border border-white/10 hover:border-white/50'
        }
    `}
    data-value={value}
    >
      {children}
    </div>
  );
}

export function AccordionHeader({
  children,
  customIcon,
  className
}: {
  children: ReactNode;
  customIcon?: boolean;
  className?: string;
}) {
  const { isActive, value, onChangeIndex } = useAccordion();

  return (
    <motion.div
    data-active={isActive || undefined}
      className={`group p-3 sm:p-4 cursor-pointer transition-all font-semibold text-sm sm:text-base text-white/90 flex justify-between items-center
        ${
          isActive
            ? 'active bg-slate-700/60'
            : 'bg-background hover:bg-slate-700/50 '
        }
      `}
      onClick={() => onChangeIndex(value)}
    >
      <div className="flex-1 pr-2 text-left">
        {children}
      </div>
      {!customIcon && (
        <ChevronDown
          className={cn(
            "transition-transform w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0",
            isActive ? "rotate-180" : "rotate-0",
          )}
        />
      )}
    </motion.div>
  );
}

export function AccordionPanel({ 
  children,
  className
}: { 
  children: ReactNode;
  className?: string;
}) {
  const { isActive } = useAccordion();

  return (
    <AnimatePresence initial={true}>
      {isActive && (
        <motion.div
        data-active={isActive || undefined}
          initial={{ height: 0, overflow: 'hidden' }}
          animate={{ height: 'auto', overflow: 'hidden' }}
          exit={{ height: 0 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          className={cn('group bg-slate-900/70', className)}
        >
          <motion.article
            initial={{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
            animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}
            exit={{
              clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
            }}
            transition={{
              type: 'spring',
              duration: 0.4,
              bounce: 0,
            }}
            className={`p-3 sm:p-4 bg-transparent text-sm sm:text-base text-white/80`}
          >
            {children}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}