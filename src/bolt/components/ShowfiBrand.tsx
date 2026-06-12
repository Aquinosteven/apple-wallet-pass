type ShowfiBrandProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  text?: string;
  variant?: 'gradient' | 'reverse';
  showText?: boolean;
};

const markByVariant = {
  gradient: '/showfi-mark-gradient.svg',
  reverse: '/showfi-mark-gradient-reverse.svg',
};

export default function ShowfiBrand({
  className = '',
  markClassName = 'h-8 w-8',
  textClassName = 'text-[15px] font-semibold tracking-tight text-gray-900',
  text = 'ShowFi',
  variant = 'reverse',
  showText = true,
}: ShowfiBrandProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={markByVariant[variant]}
        alt=""
        aria-hidden="true"
        className={`${markClassName} shrink-0`}
      />
      {showText ? <span className={textClassName}>{text}</span> : null}
    </span>
  );
}
