/**
 * Status Badge Component - Mobile-first design
 * Consistent badge styles for product expiry status
 */
interface StatusBadgeProps {
  status: "expired" | "urgent" | "attention" | "ok";
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const baseClasses = "px-2 py-1 rounded-md font-medium text-sm";
  
  const statusClasses = {
    expired: "bg-red-100 text-red-700",
    urgent: "bg-orange-100 text-orange-700",
    attention: "bg-yellow-100 text-yellow-700",
    ok: "bg-green-100 text-green-700",
  };

  return (
    <span className={`${baseClasses} ${statusClasses[status]} ${className}`}>
      {label}
    </span>
  );
}

