import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cn } from "cn";
import { notesMarkdown, remarkUnderlineOnly } from "@/components/ui/markdown";

/** What notes can hold (markdown.ts); anything else Markdown can express shows as its text. */
const ALLOWED = ["p", "br", "strong", "em", "u", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6"];

const title = "m-0 font-bold leading-[1.3] text-heading";

/**
 * Notes' titles are all one level under the card heading they sit under (an h2, or an h3 on a
 * Next up card), whatever their size, so the page's outline never skips a level. `level` is theirs.
 */
function components(level: 3 | 4): Components {
  const Title = level === 3 ? "h3" : "h4";
  const large = ({ children }: { children?: ReactNode }) => <Title className={cn(title, "text-xl")}>{children}</Title>;
  const medium = ({ children }: { children?: ReactNode }) => <Title className={cn(title, "text-lg")}>{children}</Title>;
  const small = ({ children }: { children?: ReactNode }) => <Title className={cn(title, "text-base")}>{children}</Title>;
  return {
    h1: large,
    h2: medium,
    h3: small,
    h4: small,
    h5: small,
    h6: small,
    p: ({ children }) => <p className="m-0">{children}</p>,
    ul: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-1 pl-5">{children}</ul>,
    ol: ({ children, start }) => (
      <ol start={start} className="m-0 flex list-decimal flex-col gap-1 pl-5">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="[&>ol]:mt-1 [&>p+p]:mt-1 [&>ul]:mt-1">{children}</li>,
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    u: ({ children }) => <u className="underline underline-offset-2">{children}</u>,
  };
}

const LEVEL_3 = components(3);
const LEVEL_4 = components(4);

/**
 * Notes stored as Markdown (BIG-214), shown formatted: titles, bold, italics, underline, lists, and
 * each newline as a line break, as plain-text notes read before. Raw HTML other than `<u>` shows as
 * text and links show as their words, so nothing typed runs as markup or goes anywhere.
 */
export function MarkdownView({
  markdown,
  headingLevel = 3,
  className,
  ...props
}: {
  markdown: string;
  /** The level of every title: one below the card heading the notes sit under. */
  headingLevel?: 3 | 4;
} & Omit<ComponentProps<"div">, "children">) {
  return (
    <div className={cn("min-w-0 break-words [&>*+*]:mt-3", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks, remarkUnderlineOnly]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={headingLevel === 3 ? LEVEL_3 : LEVEL_4}
      >
        {notesMarkdown(markdown)}
      </ReactMarkdown>
    </div>
  );
}
