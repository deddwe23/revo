import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShoppingCart, TerminalSquare, User, X } from "lucide-react";
import { useLocation } from "wouter";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/use-auth";
import { getCartCount, subscribeCartUpdates } from "@/lib/cart";

interface PublicHeaderMenuItem {
	label: string;
	onClick?: () => void;
}

interface PublicHeaderProps {
	onSearchClick?: () => void;
	menuItems?: PublicHeaderMenuItem[];
}

const defaultMenuItems = (navigate: (path: string) => void): PublicHeaderMenuItem[] => [
	{ label: "الرئيسية", onClick: () => navigate("/") },
	{ label: "المنتجات", onClick: () => navigate("/products") },
	{ label: "السلة", onClick: () => navigate("/cart") },
];

export default function PublicHeader({ onSearchClick, menuItems }: PublicHeaderProps) {
	const [, navigate] = useLocation();
	const { customer } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const [cartCount, setCartCount] = useState(0);
	const [showAuthModal, setShowAuthModal] = useState(false);

	useEffect(() => {
		const syncCartCount = () => setCartCount(getCartCount());
		syncCartCount();
		return subscribeCartUpdates(syncCartCount);
	}, []);

	const resolvedItems = menuItems ?? defaultMenuItems((path) => navigate(path));

	return (
		<>
			{showAuthModal ? (
				<AuthModal
					packageName="الواجهة العامة"
					onClose={() => setShowAuthModal(false)}
					onSuccess={() => {
						setShowAuthModal(false);
						navigate("/dashboard");
					}}
				/>
			) : null}

			<nav className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(36,12,70,0.9),rgba(20,10,45,0.92))] backdrop-blur-xl">
			<div className="mx-auto flex h-20 max-w-7xl items-center px-4 sm:px-6">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							if (customer) {
								navigate("/dashboard");
								return;
							}
							setShowAuthModal(true);
						}}
						className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_6px_16px_rgba(8,9,24,0.35)] transition ${
							customer
								? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
								: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
						}`}
						aria-label={customer ? customer.fullName : "الملف التعريفي"}
					>
						{customer ? (
							<span className="text-[12px] font-black leading-none">{customer.fullName.charAt(0).toUpperCase()}</span>
						) : (
							<User className="h-5 w-5" />
						)}
					</button>
					<button
						type="button"
						onClick={() => navigate("/cart")}
						className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 shadow-[0_6px_16px_rgba(8,9,24,0.35)] transition hover:bg-white/10"
						aria-label="السلة"
					>
						<ShoppingCart className="h-5 w-5" />
						{cartCount > 0 ? (
							<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white">
								{cartCount}
							</span>
						) : null}
					</button>
				</div>

				<div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
					<div className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/20 bg-gradient-to-br from-primary to-secondary text-white shadow-[0_0_24px_rgba(124,58,237,0.45)]">
						<TerminalSquare className="h-7 w-7" />
					</div>
				</div>

				<div className="mr-auto">
					<button
						type="button"
						onClick={() => setMenuOpen((current) => !current)}
						className="flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-white/90 shadow-[0_6px_16px_rgba(8,9,24,0.35)] transition hover:bg-white/10 sm:gap-3 sm:px-4"
						aria-label="القائمة"
					>
						<span className="hidden text-lg font-bold sm:inline">القائمة</span>
						<AnimatePresence mode="wait">
							{menuOpen ? (
								<motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
									<X className="h-6 w-6" />
								</motion.span>
							) : (
								<motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
									<Menu className="h-6 w-6" />
								</motion.span>
							)}
						</AnimatePresence>
					</button>
				</div>
			</div>

			<AnimatePresence>
				{menuOpen ? (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.24 }}
						className="overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(30,11,61,0.95),rgba(17,9,41,0.96))]"
					>
						<div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
							{resolvedItems.map((item) => (
								<button
									key={item.label}
									type="button"
									onClick={() => {
										item.onClick?.();
										setMenuOpen(false);
									}}
									className="rounded-2xl border border-transparent px-4 py-3 text-right text-base font-medium text-white/80 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
								>
									{item.label}
								</button>
							))}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
			</nav>
			<div aria-hidden="true" className="h-20" />
		</>
	);
}
