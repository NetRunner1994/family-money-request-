import { AVATARS } from "../lib/format";

export function AvatarPicker({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (avatar: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="fr-avatar-picker" style={style}>
      {AVATARS.map((a) => (
        <button
          key={a}
          type="button"
          className={"fr-avatar-opt" + (value === a ? " picked" : "")}
          onClick={() => onChange(a)}
        >
          {a}
        </button>
      ))}
    </div>
  );
}
