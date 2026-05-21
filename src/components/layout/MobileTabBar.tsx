import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, IndianRupee, Receipt, FileText, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "./Sidebar";
import { Settings } from "lucide-react";

const MAIN = [
  { to: "/", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/income", label: "Income", icon: IndianRupee },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: FileText },
];

export function MobileTabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-100 bg-white lg:hidden">
      {MAIN.map((item) => {
        const active = item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] ${active ? "text-emerald-700" : "text-gray-500"}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] text-gray-500">
          <MoreHorizontal className="h-4 w-4" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {NAV_ITEMS.filter((i) => !MAIN.find((m) => m.to === i.to)).map((i) => (
              <Link
                key={i.to}
                to={i.to}
                className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 px-3 py-3 text-xs text-gray-700 hover:bg-gray-50"
              >
                <i.icon className="h-5 w-5 text-gray-500" />
                {i.label}
              </Link>
            ))}
            <Link
              to="/settings"
              className="flex flex-col items-center gap-1 rounded-lg border border-gray-100 px-3 py-3 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-5 w-5 text-gray-500" />
              Settings
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
