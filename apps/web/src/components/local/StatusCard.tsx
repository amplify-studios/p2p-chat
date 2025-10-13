import Link from "next/link";

export default function StatusCard({
  value,
  description,
  href
}: {
  value: number | string;
  description: string;
  href?: string;
}) {
  return (
    <Link
      href={href ?? "#"}
    >
      <div className="p-4 bg-card rounded shadow flex flex-col items-center">
        <p className="text-xl font-bold">{value}</p>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </Link>
  );
}
