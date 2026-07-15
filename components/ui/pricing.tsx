"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { motion, type Transition } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type FREQUENCY = "mensal" | "anual";
const frequencies: FREQUENCY[] = ["mensal", "anual"];

export interface Plan {
  name: string;
  info: string;
  /** Preço numérico em reais. Ausente quando o plano é "Sob consulta". */
  price?: {
    mensal: number;
    anual: number;
  };
  /** Texto exibido no lugar do preço (ex.: "Sob consulta"). */
  customPrice?: string;
  features: {
    text: string;
    tooltip?: string;
  }[];
  btn: {
    text: string;
    href: string;
  };
  highlighted?: boolean;
}

interface PricingSectionProps extends React.ComponentProps<"div"> {
  plans: Plan[];
  heading: string;
  description?: string;
}

function formatBRL(value: number) {
  if (value === 0) return "Grátis";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function PricingSection({
  plans,
  heading,
  description,
  ...props
}: PricingSectionProps) {
  const [frequency, setFrequency] = React.useState<FREQUENCY>("mensal");

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center space-y-6",
        props.className,
      )}
      {...props}
    >
      <div className="mx-auto max-w-xl space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-grafite md:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="text-grafite-muted text-sm md:text-base">{description}</p>
        )}
      </div>

      <PricingFrequencyToggle frequency={frequency} setFrequency={setFrequency} />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 items-stretch">
        {plans.map((plan) => (
          <PricingCard plan={plan} key={plan.name} frequency={frequency} />
        ))}
      </div>
    </div>
  );
}

type PricingFrequencyToggleProps = React.ComponentProps<"div"> & {
  frequency: FREQUENCY;
  setFrequency: React.Dispatch<React.SetStateAction<FREQUENCY>>;
};

export function PricingFrequencyToggle({
  frequency,
  setFrequency,
  ...props
}: PricingFrequencyToggleProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-fit rounded-full border border-gray-200 bg-white p-1",
        props.className,
      )}
      {...props}
    >
      {frequencies.map((freq) => (
        <button
          key={freq}
          onClick={() => setFrequency(freq)}
          className="relative px-5 py-1.5 text-sm font-medium capitalize transition-colors"
        >
          <span
            className={cn(
              "relative z-10 flex items-center gap-1.5",
              frequency === freq ? "text-white" : "text-grafite-muted",
            )}
          >
            {freq}
            {freq === "anual" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  frequency === "anual"
                    ? "bg-white/20 text-white"
                    : "bg-laranja/10 text-laranja",
                )}
              >
                -20%
              </span>
            )}
          </span>
          {frequency === freq && (
            <motion.span
              layoutId="frequency"
              transition={{ type: "spring", duration: 0.4 }}
              className="absolute inset-0 z-0 rounded-full bg-grafite"
            />
          )}
        </button>
      ))}
    </div>
  );
}

type PricingCardProps = React.ComponentProps<"div"> & {
  plan: Plan;
  frequency?: FREQUENCY;
};

export function PricingCard({
  plan,
  className,
  frequency = frequencies[0],
  ...props
}: PricingCardProps) {
  const hasPrice = !!plan.price;
  const discount =
    plan.price && plan.price.mensal > 0
      ? Math.round(
          ((plan.price.mensal * 12 - plan.price.anual) /
            (plan.price.mensal * 12)) *
            100,
        )
      : 0;

  return (
    <div
      key={plan.name}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white transition-shadow",
        plan.highlighted
          ? "border-laranja shadow-xl shadow-laranja/10"
          : "border-gray-100 hover:shadow-lg",
        className,
      )}
      {...props}
    >
      {plan.highlighted && (
        <BorderTrail
          className="bg-laranja/60"
          style={{
            boxShadow:
              "0px 0px 40px 15px rgb(240 90 40 / 25%), 0 0 70px 35px rgb(240 90 40 / 12%)",
          }}
          size={80}
        />
      )}

      {/* Header */}
      <div
        className={cn(
          "relative border-b p-6",
          plan.highlighted ? "border-laranja/15 bg-laranja/5" : "border-gray-100 bg-fundo/40",
        )}
      >
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {plan.highlighted && (
            <span className="flex items-center gap-1 rounded-full bg-laranja px-2.5 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-current" />
              Popular
            </span>
          )}
          {hasPrice && frequency === "anual" && discount > 0 && (
            <span className="rounded-full border border-laranja/20 bg-laranja/10 px-2.5 py-0.5 text-xs font-semibold text-laranja">
              {discount}% off
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-grafite">{plan.name}</h3>
        <p className="text-grafite-muted text-sm">{plan.info}</p>

        <div className="mt-4 flex items-end gap-1">
          {hasPrice ? (
            <>
              <span className="text-3xl font-black text-grafite">
                {formatBRL(plan.price![frequency])}
              </span>
              {plan.price![frequency] > 0 && (
                <span className="text-grafite-muted pb-1 text-sm">
                  /{frequency === "mensal" ? "mês" : "ano"}
                </span>
              )}
            </>
          ) : (
            <span className="text-3xl font-black text-grafite">
              {plan.customPrice}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 space-y-3.5 p-6 text-sm">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-laranja" />
            {feature.tooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="cursor-help border-b border-dashed border-gray-300 text-grafite-muted" />
                    }
                  >
                    {feature.text}
                  </TooltipTrigger>
                  <TooltipContent>{feature.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-grafite-muted">{feature.text}</span>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className={cn(
          "mt-auto w-full border-t p-4",
          plan.highlighted ? "border-laranja/15 bg-laranja/5" : "border-gray-100",
        )}
      >
        <Link
          href={plan.btn.href}
          className={cn(
            "flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200",
            plan.highlighted
              ? "bg-laranja text-white shadow-lg shadow-laranja/25 hover:bg-laranja-dark hover:-translate-y-0.5"
              : "border border-gray-200 text-grafite hover:border-laranja hover:text-laranja",
          )}
        >
          {plan.btn.text}
        </Link>
      </div>
    </div>
  );
}

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION: Transition = {
    repeat: Infinity,
    duration: 6,
    ease: "linear",
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-laranja/60", className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
