type Props = {
  name: string;
  icon: string;
}

export default function PlaceholderView({ name, icon }: Props) {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-4 text-text-muted">
      <div className="text-4xl mb-2">{icon}</div>
      <h2 className="text-xl font-mono font-bold text-white uppercase tracking-widest">{name}</h2>
      <p className="text-sm max-w-sm text-center leading-relaxed">
        The <span className="text-brand font-semibold">{name}</span> view is currently under live rendering. Dynamic data streaming for this component is locked in the next version sprint.
      </p>
      <div className="border border-border-medium px-4 py-2 rounded font-mono text-[10px] bg-bg-card mt-6 animate-pulse">
        SYS_STATUS: COMPILE_PENDING
      </div>
    </div>
  );
}
