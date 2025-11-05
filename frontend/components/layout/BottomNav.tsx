"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Dumbbell, Heart, UtensilsCrossed, Settings, Home } from "lucide-react";

const routes = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/treino", icon: Dumbbell, label: "Treino" },
  { path: "/saude", icon: Heart, label: "Saúde" },
  { path: "/nutricao", icon: UtensilsCrossed, label: "Nutrição" },
  { path: "/configuracoes", icon: Settings, label: "Config" },
];

export function BottomNav() {
  const pathname = usePathname();
  
  console.info("[UI-PADRONIZATION] BottomNav ativo e responsivo.");

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120 }}
      className="fixed bottom-0 left-0 w-full bg-white/60 backdrop-blur-xl border-t border-white/30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex justify-around items-center py-3 z-50"
    >
      {routes.map(({ path, icon: Icon, label }) => {
        const active = pathname === path;
        return (
          <Link key={path} href={path} className="flex flex-col items-center text-xs flex-1">
            <motion.div
              animate={{ scale: active ? 1.15 : 1 }}
              className={`p-2 rounded-xl ${
                active ? "bg-blue-100 text-blue-600" : "text-gray-500"
              }`}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            <span className={active ? "text-blue-600" : "text-gray-400"}>
              {label}
            </span>
          </Link>
        );
      })}
    </motion.nav>
  );
}