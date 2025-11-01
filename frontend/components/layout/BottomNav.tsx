"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Dumbbell, Heart, UtensilsCrossed, Settings, Home, Menu, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

const routes = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/treino", icon: Dumbbell, label: "Treino" },
  { path: "/saude", icon: Heart, label: "Saúde" },
  { path: "/nutricao", icon: UtensilsCrossed, label: "Nutrição" },
  { path: "/configuracoes", icon: Settings, label: "Config" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    // Expandido por padrão apenas no dashboard; colapsado nas demais páginas
    setExpanded(pathname === "/dashboard");
  }, [pathname]);

  console.info("[UI-PADRONIZATION] BottomNav ativo com modo expandir/recolher.");

  // Estado recolhido: botão flutuante para expandir o menu
  if (!expanded) {
    return (
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140 }}
        className="fixed bottom-6 left-6 z-50"
      >
        <button
          onClick={() => setExpanded(true)}
          className="p-3 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl text-gray-800 hover:bg-white/40 transition-colors"
          aria-label="Expandir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </motion.div>
    );
  }

  // Estado expandido: barra completa + botão para recolher no outro lado
  return (
    <>
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 120 }}
        className="fixed bottom-6 left-6 right-6 bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl rounded-3xl flex justify-center items-center py-3 px-6 z-50"
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
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <button
          onClick={() => setExpanded(false)}
          className="p-3 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl text-gray-800 hover:bg-white/40 transition-colors"
          aria-label="Recolher menu"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </motion.div>
    </>
  );
}