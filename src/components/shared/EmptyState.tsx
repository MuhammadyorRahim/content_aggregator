"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  footer?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  footer,
  className,
}: EmptyStateProps) {
  const ActionButton = action ? (
    action.href ? (
      <Button asChild>
        <Link href={action.href}>
          {action.label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    ) : (
      <Button type="button" onClick={action.onClick}>
        {action.label}
        <ArrowRight className="size-4" />
      </Button>
    )
  ) : null;

  return (
    <Card className={cn("border-border/70 bg-card/70", className)}>
      <CardContent className="py-12 text-center">
        {Icon ? (
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
        ) : null}
        <p className="text-base font-semibold">{title}</p>
        {description ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p> : null}
        {ActionButton ? <div className="mt-5">{ActionButton}</div> : null}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
