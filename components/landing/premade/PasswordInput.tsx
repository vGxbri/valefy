"use client";
import React, { useState, useMemo } from "react";
import { Check, Eye, EyeOff, Info, X } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/landing/premade/hover-card";

// Constants - Adaptados al español y a los requisitos de tu aplicación
const PASSWORD_REQUIREMENTS = [
  { regex: /.{6,}/, text: "Al menos 6 caracteres" },
  { regex: /[0-9]/, text: "Al menos 1 número" },
  { regex: /[a-z]/, text: "Al menos 1 letra minúscula" },
  { regex: /[A-Z]/, text: "Al menos 1 letra mayúscula" },
  { regex: /[!-\/:-@[-`{-~]/, text: "Al menos 1 carácter especial" },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: "text-red-500",
    1: "text-orange-500",
    2: "text-yellow-500",
    3: "text-green-500",
    4: "text-amber-500",
    5: "text-emerald-500",
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: "Ingresa una contraseña",
    1: "Contraseña débil",
    2: "Contraseña media",
    3: "Contraseña fuerte",
    4: "Contraseña muy fuerte",
  } satisfies Record<Exclude<StrengthScore, 5>, string>,
} as const;

// Types
type Requirement = {
  met: boolean;
  text: string;
};

type PasswordStrength = {
  score: StrengthScore;
  requirements: Requirement[];
};

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  name: string;
  id: string;
}

const PasswordInput = ({
  value,
  onChange,
  error,
  name,
  id,
}: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const calculateStrength = useMemo((): PasswordStrength => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(value),
      text: req.text,
    }));

    return {
      score: requirements.filter((req) => req.met).length as StrengthScore,
      requirements,
    };
  }, [value]);

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-start">
        <p className="text-xs sm:text-sm text-alternative/70 w-max flex-1 pr-2">
          3. Elige una contraseña segura para tu cuenta.
        </p>
        <HoverCard openDelay={200}>
          <HoverCardTrigger>
            <Info
              className={`cursor-pointer ${
                STRENGTH_CONFIG.colors[calculateStrength.score]
              } transition-all flex-shrink-0`}
              size={18}
            />
          </HoverCardTrigger>
          <HoverCardContent className="bg-background/90 backdrop-blur-sm border border-white/10 w-64 sm:w-auto">
            <ul aria-label="Requisitos de contraseña" className="space-y-1.5">
              {calculateStrength.requirements.map((req, index) => (
                <li key={index} className="flex items-center space-x-2">
                  {req.met ? (
                    <Check className="text-emerald-500 flex-shrink-0" size={14} />
                  ) : (
                    <X className="text-white/50 flex-shrink-0" size={14} />
                  )}
                  <span
                    className={`text-xs ${
                      req.met ? "text-emerald-400" : "text-white/70"
                    }`}
                  >
                    {req.text}
                  </span>
                </li>
              ))}
            </ul>
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="relative">
        <input
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-8 sm:pr-10 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
          id={id}
          name={name}
          placeholder=""
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
        />
        <button
          aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 outline-none flex items-center justify-center w-8 sm:w-10 text-white/50 hover:text-white"
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
        >
          {isVisible ? <EyeOff size={14} className="sm:w-4 sm:h-4" /> : <Eye size={14} className="sm:w-4 sm:h-4" />}
        </button>
      </div>

      <div className="flex gap-1 sm:gap-2 w-full justify-between mt-2">
        <span
          className={`${
            calculateStrength.score >= 1 ? "bg-green-500/20" : "bg-white/5"
          } p-0.5 sm:p-1 rounded-full w-full`}
        />
        <span
          className={`${
            calculateStrength.score >= 2 ? "bg-green-500/40" : "bg-white/5"
          } p-0.5 sm:p-1 rounded-full w-full`}
        />
        <span
          className={`${
            calculateStrength.score >= 3 ? "bg-green-500/60" : "bg-white/5"
          } p-0.5 sm:p-1 rounded-full w-full`}
        />
        <span
          className={`${
            calculateStrength.score >= 4 ? "bg-green-500/80" : "bg-white/5"
          } p-0.5 sm:p-1 rounded-full w-full`}
        />
        <span
          className={`${
            calculateStrength.score >= 5 ? "bg-green-500" : "bg-white/5"
          } p-0.5 sm:p-1 rounded-full w-full`}
        />
      </div>
    </div>
  );
};

export default PasswordInput;
