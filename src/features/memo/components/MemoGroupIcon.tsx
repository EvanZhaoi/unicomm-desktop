import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  AlarmClock,
  Banknote,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  Code2,
  Database,
  Factory,
  FileCheck2,
  Flag,
  Folder,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  Landmark,
  Lightbulb,
  Mail,
  MessageSquare,
  Monitor,
  Package,
  Plane,
  Presentation,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Target,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type { MemoGroup } from "../types/memo.types";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const memoGroupIconOptions: Array<{ value: string; Icon: IconComponent }> = [
  { value: "folder", Icon: Folder },
  { value: "briefcase", Icon: BriefcaseBusiness },
  { value: "tag", Icon: Tag },
  { value: "star", Icon: Star },
  { value: "calendar", Icon: CalendarDays },
  { value: "bell", Icon: Bell },
  { value: "users", Icon: Users },
  { value: "book", Icon: BookOpen },
  { value: "task", Icon: ClipboardList },
  { value: "idea", Icon: Lightbulb },
  { value: "flag", Icon: Flag },
  { value: "heart", Icon: Heart },
  { value: "message", Icon: MessageSquare },
  { value: "mail", Icon: Mail },
  { value: "presentation", Icon: Presentation },
  { value: "chart", Icon: ChartNoAxesColumn },
  { value: "target", Icon: Target },
  { value: "file-check", Icon: FileCheck2 },
  { value: "code", Icon: Code2 },
  { value: "database", Icon: Database },
  { value: "monitor", Icon: Monitor },
  { value: "support", Icon: Headphones },
  { value: "finance", Icon: Banknote },
  { value: "legal", Icon: Landmark },
  { value: "security", Icon: ShieldCheck },
  { value: "sales", Icon: ShoppingCart },
  { value: "logistics", Icon: Truck },
  { value: "travel", Icon: Plane },
  { value: "package", Icon: Package },
  { value: "factory", Icon: Factory },
  { value: "building", Icon: Building2 },
  { value: "education", Icon: GraduationCap },
  { value: "maintenance", Icon: Wrench },
  { value: "project", Icon: Hammer },
  { value: "records", Icon: ClipboardList },
  { value: "urgent", Icon: AlarmClock },
  { value: "health", Icon: Activity },
];

const iconMap = new Map(memoGroupIconOptions.map((option) => [option.value, option.Icon]));

export const memoGroupColorOptions = [
  "#2563EB",
  "#7C3AED",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#4B5563",
];

export function MemoGroupIcon({
  group,
  icon,
  color,
  className,
}: {
  group?: Pick<MemoGroup, "icon" | "color">;
  icon?: string;
  color?: string;
  className?: string;
}) {
  const iconValue = icon || group?.icon || "folder";
  const colorValue = color || group?.color || "var(--primary)";
  const Icon = iconMap.get(iconValue);

  if (Icon) {
    return (
      <span
        className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm", className)}
        style={{ color: colorValue }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[12px] leading-none", className)}
      style={{ color: colorValue }}
    >
      {iconValue.slice(0, 2)}
    </span>
  );
}
