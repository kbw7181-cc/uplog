export default function NewPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {children}
      </div>
    </div>
  );
}
