interface Props {
  children: React.ReactNode;
  variant?: "blue" | "green" | "gray" | "red";
}

const variants = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  gray: "bg-gray-100 text-gray-600",
  red: "bg-red-100 text-red-600",
};

export default function Badge({ children, variant = "gray" }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}
