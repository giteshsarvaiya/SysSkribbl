"use client";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<
  AvatarSize,
  { ring: number; box: number; emoji: string; name: string }
> = {
  sm: { ring: 2, box: 36, emoji: "text-lg",   name: "text-[10px]" },
  md: { ring: 3, box: 52, emoji: "text-2xl",  name: "text-xs"     },
  lg: { ring: 3, box: 64, emoji: "text-3xl",  name: "text-sm"     },
  xl: { ring: 4, box: 80, emoji: "text-4xl",  name: "text-base"   },
};

export default function Avatar({
  name,
  color,
  avatar,
  size = "md",
  isHost = false,
  isSelf = false,
  isDrawer = false,
  showName = true,
}: {
  name: string;
  color: string;
  avatar: string;
  size?: AvatarSize;
  isHost?: boolean;
  isSelf?: boolean;
  isDrawer?: boolean;
  showName?: boolean;
}) {
  const s = SIZES[size];

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Circle */}
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full select-none"
          style={{
            width: s.box,
            height: s.box,
            backgroundColor: color + "28",
            border: `${s.ring}px solid ${color}`,
          }}
        >
          <span className={s.emoji} role="img" aria-label={name}>
            {avatar}
          </span>
        </div>

        {/* Badge: Host crown */}
        {isHost && (
          <span
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-base leading-none"
            title="Host"
          >
            👑
          </span>
        )}

        {/* Badge: Drawer pencil */}
        {isDrawer && !isHost && (
          <span
            className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-base leading-none"
            title="Drawing"
          >
            ✏️
          </span>
        )}

        {/* Self indicator dot */}
        {isSelf && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-game-bg"
            style={{ backgroundColor: color }}
          />
        )}
      </div>

      {/* Name */}
      {showName && (
        <div className="text-center max-w-[80px]">
          <p
            className={`font-nunito font-semibold text-game-text ${s.name} leading-tight truncate`}
            title={name}
          >
            {name}
          </p>
          {isSelf && (
            <p className="font-nunito text-game-muted text-[9px] leading-none">
              you
            </p>
          )}
        </div>
      )}
    </div>
  );
}
