import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpenCheck, LogOut, type LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";

export type DashboardNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  title: string;
  menuItems: DashboardNavItem[];
};

export default function DashboardLayout({ children, title, menuItems }: DashboardLayoutProps) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const activeItem = menuItems.find(item => location === item.path) ?? menuItems[0];

  if (loading) {
    return <div className="min-h-screen bg-[#f8f8f6]" />;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f8f6] p-6">
        <section className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-9 text-center shadow-[0_24px_80px_rgba(41,37,36,.10)]">
          <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-emerald-900 text-white"><BookOpenCheck size={26} /></div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Continue to {title}</h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">Sign in securely with your Manus account to access this workspace.</p>
          <Button onClick={() => startLogin()} className="mt-8 w-full rounded-xl bg-emerald-900 hover:bg-emerald-800">Sign in with Manus</Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-emerald-950/10 bg-[#143d36] text-white">
        <SidebarHeader className="px-5 pt-6 pb-7">
          <button onClick={() => setLocation("/admin")} className="flex items-center gap-3 text-left">
            <span className="grid size-10 place-items-center rounded-xl bg-[#d4f59b] text-emerald-950 shadow-sm"><BookOpenCheck size={21} strokeWidth={2.3} /></span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="font-display block text-base font-semibold tracking-tight">Coursewise</span>
              <span className="block text-[11px] uppercase tracking-[.18em] text-emerald-100/55">Admin studio</span>
            </span>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-100/45 group-data-[collapsible=icon]:hidden">Management</p>
          <SidebarMenu>
            {menuItems.map(item => {
              const active = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={active}
                    onClick={() => setLocation(item.path)}
                    className={`h-11 rounded-xl px-3 text-emerald-50 transition-colors hover:bg-white/10 hover:text-white data-[active=true]:bg-[#d4f59b] data-[active=true]:text-emerald-950 ${active ? "font-semibold" : "font-normal"}`}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <div className="flex items-center gap-3 px-1.5 py-1 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-8 border border-white/15"><AvatarFallback className="bg-emerald-50 text-xs font-bold text-emerald-900">{user.name?.slice(0, 1).toUpperCase() ?? "A"}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{user.name ?? "Administrator"}</p><p className="truncate text-xs text-emerald-100/55">Administrator</p></div>
            </div>
            <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-emerald-100/70 transition hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden"><LogOut size={14} /> Sign out</button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f8f8f6]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center gap-3 border-b border-stone-200/80 bg-[#f8f8f6]/90 px-5 backdrop-blur-xl lg:px-9">
          {isMobile && <SidebarTrigger className="rounded-xl border border-stone-200 bg-white" />}
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800/55">Coursewise management</p><h1 className="font-display text-lg font-semibold tracking-tight text-stone-900">{activeItem?.label ?? title}</h1></div>
          <div className="ml-auto rounded-full border border-emerald-900/10 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-600" />Live workspace</div>
        </header>
        <main className="min-h-[calc(100vh-74px)] p-5 lg:p-9">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
