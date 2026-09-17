import Image from 'next/image';

const sizes = {
  sm: { px: 32, radius: 'rounded-xl', title: 'text-lg tracking-[-0.02em]' },
  md: { px: 44, radius: 'rounded-2xl', title: 'text-xl tracking-[-0.025em]' },
  lg: { px: 80, radius: 'rounded-[28px]', title: 'text-[2.6rem] leading-none tracking-[-0.035em]' },
} as const;

export function BrandMark({
  size = 'md',
  align = 'center',
  subtitle,
  titleAs: TitleTag = 'p',
}: {
  size?: keyof typeof sizes;
  align?: 'center' | 'start';
  subtitle?: string;
  titleAs?: 'h1' | 'p';
}) {
  const spec = sizes[size];
  return (
    <div className={`flex gap-3 ${align === 'center' ? 'flex-col items-center text-center' : 'items-center'}`}>
      <Image
        src="/brand/icon.png"
        alt=""
        width={spec.px}
        height={spec.px}
        className={`${spec.radius} shadow-[0_10px_28px_rgba(28,25,23,0.12)]`}
        priority={size === 'lg'}
      />
      <div>
        <TitleTag className={`font-display ${spec.title} font-semibold text-stone-900`}>Cuisinons</TitleTag>
        {subtitle ? <p className="mt-2 max-w-xs text-sm text-stone-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}
