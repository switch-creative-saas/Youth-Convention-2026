type LoginIllustrationProps = { side: 'left' | 'right' };

export function LoginIllustration({ side }: LoginIllustrationProps) {
  const patternId = 'dots-' + side;
  const dotFill = 'url(#' + patternId + ')';
  return (
    <svg aria-hidden="true" viewBox="0 0 360 460" className="pointer-events-none hidden h-auto w-[min(29vw,360px)] lg:block" style={{ transform: side === 'right' ? undefined : 'scale(-1 1)' }}>
      <defs><pattern id={patternId} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.3" fill="var(--ink)" /></pattern></defs>
      <g fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 394H342" opacity=".6" /><path d="M48 320c18-28 38-28 55 0 15 25 37 22 52-6" /><path d="M213 107c11 17 24 17 36 0 9-14 18-13 26 0" /><path d="M72 148c8 10 17 10 25 0 9-11 18-11 28 0" />
        <path d="M54 184h78v52H54z" /><path d="M68 200h49M68 214h37" opacity=".7" /><path d="M132 198l12 8-12 8" /><path d="M248 154h64v40h-64z" /><path d="M260 168h38M260 180h24" opacity=".7" />
        <path d="M100 290 143 226 185 290Z" /><path d="M151 290 192 202 236 290Z" /><path d="M198 290 222 252 248 290Z" />
      </g>
      <rect x="30" y="303" width="62" height="91" rx="2" fill="var(--accent)" /><rect x="30" y="303" width="62" height="91" rx="2" fill={dotFill} />
      <rect x="267" y="318" width="59" height="76" rx="2" fill="var(--chart-cream)" /><rect x="267" y="318" width="59" height="76" rx="2" fill={dotFill} />
      <g className="login-illustration-float" fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M177 338h95v56h-95z" fill="var(--surface)" /><circle cx="219" cy="230" r="17" fill="var(--ink)" /><path d="M218 247c-20 16-23 43-19 72l17 17 15-50 20 37 29-11-23-57c-5-12-13-16-19-8Z" fill="var(--ink)" />
        <path d="M190 287l-17 19 20 13" /><path d="M229 282l30-18 8 12-27 25" /><path d="M177 275h37l-6 23h-37z" fill="var(--accent)" /><path d="M181 279h28" /><path d="M222 230c3-13 12-18 20-13" />
      </g>
      <g fill="var(--ink)"><circle cx="82" cy="115" r="2.5" /><circle cx="301" cy="115" r="2.5" /><circle cx="291" cy="245" r="2.5" /></g>
    </svg>
  );
}
