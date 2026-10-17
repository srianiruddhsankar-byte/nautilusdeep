import type { HTMLAttributes, ReactNode } from "react";

// A sheet of paper: card colour, hairline border and a 2 px paper edge.
// `as` lets a card be a <section>, <div> or <li> without extra wrappers.
export function Card({
  as: Tag = "div",
  className = "",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "li" | "article" }) {
  return <Tag className={`flex flex-col gap-2 rounded-card bg-card p-4 shadow-card ${className}`} {...rest} />;
}

// The title row of a card: a serif title on the left, an optional action on the right.
export function CardHeader({ title, id, action }: { title: ReactNode; id?: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 id={id} className="title-card">
        {title}
      </h2>
      {action}
    </div>
  );
}
