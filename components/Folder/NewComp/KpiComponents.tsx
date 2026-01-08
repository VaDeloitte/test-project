import React from "react";


interface KpiCardProps {
  title: string;
  value: string | number | React.ReactNode;
  change?: string; // e.g. "+12%"
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  onClick?: () => void;
  color?: string; // accent color (e.g. "emerald", "rose")
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  onClick,
  color = "emerald",
}) => {
  const trendColor =
    trend === "up"
      ? `text-${color}-500`
      : trend === "down"
      ? "text-rose-500"
      : "text-gray-400";

  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white dark:bg-[#1E1E1E] hover:shadow-xl transition-shadow rounded-xl p-6 flex flex-col gap-3 border border-gray-100 dark:border-gray-800"
    >
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</span>
        {icon && <div className={`text-${color}-500 text-xl`}>{icon}</div>}
      </div>

      <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>

      {change && (
        <div className={`text-sm font-medium ${trendColor}`}>
          {trend === "up" && "▲"} 
          {trend === "down" && "▼"} 
          {trend === "neutral" && "–"} {change}
        </div>
      )}
    </div>
  );
};



interface KpiModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  value?: string | number;
  children?: React.ReactNode; // allows JSX content
}

const KpiModal: React.FC<KpiModalProps> = ({ open, onClose, title, value, children }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1E1E1E] rounded-xl shadow-2xl max-w-xl w-11/12 p-8 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full"
        >
          ✕
        </button>

        <h3 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>

        {value && (
          <div className="text-4xl font-bold text-black dark:text-white mb-6">
            {value}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-[#2E2E2E] rounded-lg p-5 text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
};

export {KpiCard, KpiModal};
