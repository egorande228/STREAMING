interface Props {
  src: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: { px: 16,  cls: 'text-base' },
  sm: { px: 24,  cls: 'text-2xl' },
  md: { px: 40,  cls: 'text-4xl' },
  lg: { px: 56,  cls: 'text-5xl' },
  xl: { px: 72,  cls: 'text-6xl' },
};

export default function FlagDisplay({ src, name, size = 'lg', className = '' }: Props) {
  const { px, cls } = sizeMap[size];
  const normalizedSrc = src.trim();

  if (/^https?:\/\//i.test(normalizedSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizedSrc}
        alt={name}
        width={px}
        height={px}
        className={`object-contain ${className}`.trim()}
        style={{ width: px, height: px }}
      />
    );
  }

  return <span className={`${cls} leading-none ${className}`.trim()}>{normalizedSrc}</span>;
}
