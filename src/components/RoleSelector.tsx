import type { Role } from "../engine/types";

interface Props {
  role: Role;
  onChange: (role: Role) => void;
}

const roles: { value: Role; label: string; desc: string }[] = [
  { value: "analyst", label: "Analyst", desc: "Diagnostic detail" },
  { value: "planner", label: "Planner", desc: "Reorder qty + timing" },
  { value: "executive", label: "Executive", desc: "Risk summary" },
];

export function RoleSelector({ role, onChange }: Props) {
  return (
    <div className="role-selector">
      {roles.map((r) => (
        <button
          key={r.value}
          className={`role-btn${role === r.value ? " active" : ""}`}
          onClick={() => onChange(r.value)}
          title={r.desc}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
