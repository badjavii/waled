import {
  Zap,
  ShoppingBasket,
  Popcorn,
  Bus,
  Home,
  GraduationCap,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@/ipc/types";

export interface AccountTypeMeta {
  label: AccountType;
  Icon: LucideIcon;
  /** Tailwind classes for the tinted avatar background/text. */
  avatarClass: string;
  /** Tailwind classes for the small badge under the name. */
  badgeClass: string;
}

export const ACCOUNT_TYPES: AccountTypeMeta[] = [
  {
    label: "Servicios Básicos",
    Icon: Zap,
    avatarClass: "bg-bcv/15 text-bcv",
    badgeClass: "text-bcv bg-bcv/10",
  },
  {
    label: "Alimentación",
    Icon: ShoppingBasket,
    avatarClass: "bg-expense/15 text-expense",
    badgeClass: "text-expense bg-expense/10",
  },
  {
    label: "Ocio",
    Icon: Popcorn,
    avatarClass: "bg-accent-purple/15 text-accent-purple",
    badgeClass: "text-accent-purple bg-accent-purple/10",
  },
  {
    label: "Transporte",
    Icon: Bus,
    avatarClass: "bg-accent-teal/15 text-accent-teal",
    badgeClass: "text-accent-teal bg-accent-teal/10",
  },
  {
    label: "Vivienda",
    Icon: Home,
    avatarClass: "bg-accent-blue/15 text-accent-blue",
    badgeClass: "text-accent-blue bg-accent-blue/10",
  },
  {
    label: "Educación",
    Icon: GraduationCap,
    avatarClass: "bg-accent-purple/15 text-accent-purple",
    badgeClass: "text-accent-purple bg-accent-purple/10",
  },
  {
    label: "Salud",
    Icon: Stethoscope,
    avatarClass: "bg-brand/15 text-brand",
    badgeClass: "text-brand bg-brand/10",
  },
];

const BY_LABEL = new Map(ACCOUNT_TYPES.map((meta) => [meta.label, meta]));

export function getAccountTypeMeta(label: AccountType): AccountTypeMeta {
  return BY_LABEL.get(label) ?? ACCOUNT_TYPES[0];
}
