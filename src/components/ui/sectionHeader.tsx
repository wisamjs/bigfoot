/** Section header: h2 (28/36/44), lead (20px), 48px below. */
export function SectionHeader({
  title,
  lead,
  id,
}: {
  title: string;
  lead: string;
  id: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-[768px] text-center">
      <h2
        id={id}
        className="text-[28px] font-bold leading-[1.15] text-heading md:text-[36px] lg:text-[44px]"
      >
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-[70ch] text-lg leading-[1.7] text-body lg:text-xl">{lead}</p>
    </div>
  );
}
