export function AuthErrorView({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center text-destructive">
        <p className="text-lg font-medium">认证失败</p>
        {message && <p className="text-sm mt-2 text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}