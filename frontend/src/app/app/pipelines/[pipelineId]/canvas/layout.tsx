export default function PipelineCanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      {children}
    </div>
  );
}
